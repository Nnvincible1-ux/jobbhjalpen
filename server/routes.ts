import type { Express, Request, Response } from "express";
import express from "express";
import { nanoid } from "nanoid";
import { parse as parseCookie } from "cookie";
import {
  createSession,
  getServiceBySlug,
  getSession,
  getSessionByStripeId,
  listArticles,
  listServices,
  markSessionPaid,
  markSessionPaidById,
  setSessionDelivery,
  updateSession,
} from "./db";
import { sendResultEmail } from "./mailer";
import { deleteExpiredSessions } from "./db";
import { extractText } from "./ai/fileProcessing";
import { validateContent } from "./ai/contentValidator";
import { fetchReadableText } from "./ai/urlFetch";
import { clientIp, rateLimit } from "./rateLimit";
import { getStripe, isStripeConfigured } from "./payments/stripe";
import { getTenantBySlug, resolveTenantSlug } from "./tenant";
import { sdk } from "./_core/sdk";
import { getMembership, getSiteSettings } from "./db";
import {
  ADMIN_COOKIE,
  adminStatus,
  beginTotpEnrollment,
  confirmTotpEnrollment,
  createAdminSession,
  destroyAdminSession,
  getAdminBySession,
  setPassword,
  verifyPassword,
  verifyTotp,
} from "./adminAuth";

/**
 * Custom Express routes (non-tRPC) for:
 *  - File upload + pre-processing (validation BEFORE any LLM call)
 *  - Stripe checkout creation + webhook (sole gate to unlock a session)
 *  - Dynamic sitemap.xml
 * All routes are mounted under /api/ so the gateway routes correctly.
 */
export function registerCustomRoutes(app: Express) {
  // ---- Stripe webhook MUST use the raw body, register BEFORE json parser uses it ----
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      if (!isStripeConfigured()) return res.status(503).send("stripe not configured");
      const stripe = getStripe();
      const sig = req.headers["stripe-signature"] as string | undefined;
      const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
      let event;
      try {
        if (whSecret && sig) {
          // Production path: verify the signature so only real Stripe events pass.
          event = stripe.webhooks.constructEvent(req.body, sig, whSecret);
        } else {
          // No webhook secret configured. Acceptable only for local testing.
          // In production ALWAYS set STRIPE_WEBHOOK_SECRET.
          console.warn("[stripe webhook] STRIPE_WEBHOOK_SECRET saknas, signaturen verifieras inte. Sätt den i produktion.");
          event = JSON.parse(req.body.toString());
        }
      } catch (err) {
        return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
      }

      if (event.type === "checkout.session.completed") {
        const obj = event.data.object as { id: string; customer_details?: { email?: string }; customer_email?: string };
        await markSessionPaid(obj.id);
        const email = obj.customer_details?.email || obj.customer_email || null;
        const s = await getSessionByStripeId(obj.id);
        if (s) await deliverPaidSession(s.id, email);
      }
      res.json({ received: true });
    }
  );

  const router = express.Router();
  router.use(express.json({ limit: "30mb" }));

  const RESULT_TTL_DAYS = 90;
  // Set the 90-day expiry and send the confirmation email once. Safe to call
  // multiple times (mail only sends when not already sent).
  async function deliverPaidSession(sessionId: string, email: string | null) {
    try {
      const s = await getSession(sessionId);
      if (!s) return;
      const expiresAt = s.expiresAt ?? new Date(Date.now() + RESULT_TTL_DAYS * 24 * 60 * 60 * 1000);
      const to = email || s.email || null;
      if (!s.expiresAt || (email && email !== s.email)) {
        await setSessionDelivery(sessionId, { expiresAt, email: to });
      }
      if (to && !s.mailSent) {
        const base = process.env.PUBLIC_BASE_URL || "https://cvpiloten.se";
        const svc = await getServiceBySlug(s.serviceSlug);
        const ok = await sendResultEmail({
          to,
          serviceName: svc?.slug ? svc.slug.replace(/-/g, " ") : "din tjänst",
          resultUrl: `${base}/resultat/${sessionId}`,
          expiresAt,
        });
        if (ok) await setSessionDelivery(sessionId, { mailSent: true });
      }
    } catch (e) {
      console.warn("[deliver] failed", e);
    }
  }

  // ---- Resolve active tenant (branding) from host/subdomain. Public. ----
  router.get("/tenant", async (req: Request, res: Response) => {
    const slug = resolveTenantSlug(req);
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return res.json({ slug: "default", name: "CV-piloten", type: "consumer" });
    return res.json({
      slug: tenant.slug,
      name: tenant.name,
      type: tenant.type,
      logoText: tenant.logoText,
      colorPrimary: tenant.colorPrimary,
      colorAccent: tenant.colorAccent,
      tagline: tenant.tagline,
    });
  });

  // Track failed content-validation attempts per IP+service (max 3).
  const validationFails = new Map<string, number>();

  // ---- Upload + pre-process. Creates an unpaid session. No LLM call here. ----
  router.post("/upload", async (req: Request, res: Response) => {
    try {
      // IP rate limiting (abuse / basic DDoS protection).
      const ip = clientIp(req as never);
      const rl = rateLimit(ip);
      if (!rl.allowed) {
        return res.status(429).json({
          ok: false,
          code: "rate_limited",
          message: "För många försök. Vänta en stund och försök igen.",
          retryAfterSec: rl.retryAfterSec,
        });
      }

      const { serviceSlug, fileBase64, fileName, mimeType, annonsText, annonsUrl, targetContext, tenantId, participantId } = req.body as {
        serviceSlug: string;
        fileBase64: string;
        fileName: string;
        mimeType: string;
        annonsText?: string;
        annonsUrl?: string;
        targetContext?: string;
        tenantId?: number;
        participantId?: number;
      };

      const service = await getServiceBySlug(serviceSlug);
      if (!service) return res.status(404).json({ ok: false, message: "Okänd tjänst." });

      // Org context: a coach uploads on behalf of a participant. The org
      // subscribes, so the session is created already paid (no 49 kr flow).
      // SECURITY: org mode requires an authenticated user with access to the
      // tenant. Otherwise we fall back to the normal unpaid consumer flow so a
      // caller cannot forge a free (paid) session by sending tenant ids.
      let isOrg = false;
      let orgCoachUserId: number | null = null;
      if (typeof tenantId === "number" && typeof participantId === "number") {
        try {
          const user = await sdk.authenticateRequest(req as never);
          if (user) {
            const membership = await getMembership(user.id, tenantId);
            if (user.role === "admin" || membership) {
              isOrg = true;
              orgCoachUserId = user.id;
            }
          }
        } catch {
          isOrg = false;
        }
      }

      if (!fileBase64 || !fileName) {
        return res.status(400).json({ ok: false, message: "Ingen fil mottagen." });
      }

      const buffer = Buffer.from(fileBase64.split(",").pop() || "", "base64");
      // Size guard (10 MB)
      if (buffer.length > 10 * 1024 * 1024) {
        return res.status(400).json({ ok: false, message: "Filen är för stor (max 10 MB)." });
      }

      // PRE-PROCESSING: validate type + extract text. Rejects image-only PDFs.
      const result = await extractText(buffer, fileName, mimeType || "");
      if (!result.ok) {
        return res.status(422).json({ ok: false, code: result.code, message: result.message });
      }

      // Optional job-ad URL: fetch readable text. If it fails (login wall/block),
      // tell the user to paste the text instead.
      let resolvedAnnons = annonsText || null;
      if ((!resolvedAnnons || !resolvedAnnons.trim()) && annonsUrl && annonsUrl.trim()) {
        const fetched = await fetchReadableText(annonsUrl.trim());
        if (!fetched.ok) {
          return res.status(422).json({ ok: false, code: "url_unreadable", problem: "annons", message: fetched.message });
        }
        resolvedAnnons = fetched.text;
      }

      // AI CONTENT VALIDATION (consumer flow only), BEFORE payment. Confirms the
      // document looks like the expected type and the ad looks like a job ad.
      // Max 3 failed attempts per IP+service, then a temporary block.
      if (!isOrg) {
        const failKey = `${ip}:${serviceSlug}`;
        const fails = validationFails.get(failKey) ?? 0;
        if (fails >= 3) {
          return res.status(429).json({
            ok: false,
            code: "too_many_invalid",
            message:
              "Du har försökt med fel dokument tre gånger. Av säkerhetsskäl är fler försök tillfälligt blockerade. Försök igen om en stund med rätt dokument.",
          });
        }
        const verdict = await validateContent(service.promptKey, result.text, resolvedAnnons);
        if (!verdict.ok) {
          validationFails.set(failKey, fails + 1);
          return res.status(422).json({
            ok: false,
            code: "content_invalid",
            problem: verdict.problem,
            message: verdict.message,
            attemptsLeft: Math.max(0, 3 - (fails + 1)),
          });
        }
        // Passed: reset the counter for this IP+service.
        validationFails.delete(failKey);
      }

      const id = nanoid();
      await createSession({
        id,
        serviceSlug,
        paymentStatus: isOrg ? "paid" : "unpaid",
        status: "ready",
        inputFileName: fileName,
        inputText: result.text,
        annonsText: resolvedAnnons,
        targetContext: targetContext && targetContext.trim() ? targetContext.trim() : null,
        remainingRounds: service.hasAdjustments ? service.maxRounds : 0,
        tenantId: isOrg ? tenantId : null,
        participantId: isOrg ? participantId : null,
        coachUserId: isOrg ? orgCoachUserId : null,
      });

      return res.json({ ok: true, sessionId: id, org: isOrg });
    } catch (e) {
      console.error("[upload] error", e);
      return res.status(500).json({ ok: false, message: "Något gick fel vid uppladdningen." });
    }
  });

  // ---- Create Stripe checkout session for a prepared session ----
  router.post("/checkout", async (req: Request, res: Response) => {
    try {
      const { sessionId, origin, accessCode } = req.body as { sessionId: string; origin: string; accessCode?: string };
      const session = await getSession(sessionId);
      if (!session) return res.status(404).json({ ok: false, message: "Session saknas." });
      const service = await getServiceBySlug(session.serviceSlug);
      if (!service) return res.status(404).json({ ok: false, message: "Tjänst saknas." });

      // Free/test mode: when a service costs 0 kr, skip Stripe entirely.
      // Requires the correct access code (set in admin) so the public can't use it.
      if (service.priceSek === 0) {
        const settings = await getSiteSettings();
        const requiredCode = settings?.accessCode || "";
        if (requiredCode && (accessCode || "").trim() !== requiredCode) {
          return res.status(403).json({ ok: false, message: "Fel åtkomstkod.", needCode: true });
        }
        await markSessionPaidById(sessionId);
        await deliverPaidSession(sessionId, null);
        return res.json({ ok: true, free: true, url: `${origin}/resultat/${sessionId}?paid=1` });
      }

      if (!isStripeConfigured()) {
        return res.status(503).json({ ok: false, message: "Betalning är inte konfigurerad ännu." });
      }

      const stripe = getStripe();
      const checkout = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "sek",
              product_data: { name: `CV-piloten – ${service.slug}` },
              unit_amount: service.priceSek * 100,
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/resultat/${sessionId}?paid=1`,
        cancel_url: `${origin}/tjanst/${service.slug}?avbruten=1`,
        metadata: { sessionId },
      });

      await updateSession(sessionId, { stripeSessionId: checkout.id });
      return res.json({ ok: true, url: checkout.url });
    } catch (e) {
      console.error("[checkout] error", e);
      return res.status(500).json({ ok: false, message: "Kunde inte starta betalning." });
    }
  });

  // ---- Confirm payment: verifies with Stripe directly. ----
  // POC: when Stripe is NOT configured AND POC_DEMO_UNLOCK is enabled, the server
  // itself unlocks the session. This is a deliberate server-side flag, never a
  // client query param. In production (Stripe configured) this branch is dead and
  // confirmed Stripe payment is the sole gate.
  const pocDemoUnlock = () => !isStripeConfigured() && process.env.POC_DEMO_UNLOCK !== "false";
  router.post("/confirm", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.body as { sessionId: string };
      const session = await getSession(sessionId);
      if (!session) return res.status(404).json({ ok: false, message: "Session saknas." });
      if (session.paymentStatus === "paid") return res.json({ ok: true, paid: true });

      if (session.stripeSessionId && isStripeConfigured()) {
        const stripe = getStripe();
        const checkout = await stripe.checkout.sessions.retrieve(session.stripeSessionId);
        if (checkout.payment_status === "paid") {
          await markSessionPaid(session.stripeSessionId);
          const email = (checkout.customer_details?.email as string) || (checkout.customer_email as string) || null;
          await deliverPaidSession(sessionId, email);
          return res.json({ ok: true, paid: true });
        }
      }

      if (pocDemoUnlock()) {
        await updateSession(sessionId, { paymentStatus: "paid" });
        return res.json({ ok: true, paid: true, demo: true });
      }

      return res.json({ ok: true, paid: false });
    } catch (e) {
      console.error("[confirm] error", e);
      return res.status(500).json({ ok: false, message: "Kunde inte bekräfta betalning." });
    }
  });

  app.use("/api/service", router);

  // ---- Scheduled cleanup: delete sessions whose 90-day link has expired. ----
  // Registered as a Heartbeat cron after deploy. Cron-only (checked via sdk).
  app.post("/api/scheduled/cleanup", express.json(), async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req as never);
      if (!user || !(user as { isCron?: boolean }).isCron) {
        return res.status(403).json({ error: "cron-only" });
      }
      const removed = await deleteExpiredSessions();
      return res.json({ ok: true, removed });
    } catch (e) {
      return res.status(500).json({ error: (e as Error).message, timestamp: new Date().toISOString() });
    }
  });

  // ---- Public tracking settings (no auth): used by the frontend to load pixels ----
  app.get("/api/public/tracking", async (_req: Request, res: Response) => {
    const s = await getSiteSettings();
    res.json({ fbPixelId: s?.fbPixelId || null, ga4Id: s?.ga4Id || null });
  });

  // ---- Standalone admin auth (VPS) ----
  const adminRouter = express.Router();
  adminRouter.use(express.json({ limit: "1mb" }));

  function readAdminToken(req: Request): string | undefined {
    // Prefer Authorization: Bearer <token>, fall back to cookie.
    const auth = req.headers.authorization;
    if (auth && auth.startsWith("Bearer ")) return auth.slice(7).trim();
    const header = req.headers.cookie;
    if (!header) return undefined;
    try {
      return parseCookie(header)[ADMIN_COOKIE];
    } catch {
      return undefined;
    }
  }

  const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

  function setSessionCookie(res: Response, token: string, expiresAt: Date) {
    res.cookie(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
      domain: cookieDomain,
    });
  }

  // Status for an email: does account exist, has password, is 2FA enabled.
  adminRouter.post("/status", async (req: Request, res: Response) => {
    const email = String(req.body?.email || "");
    if (!email) return res.status(400).json({ error: "E-post krävs" });
    res.json(await adminStatus(email));
  });

  // First-time setup: set the password (only allowed if no password yet).
  adminRouter.post("/setup-password", async (req: Request, res: Response) => {
    const email = String(req.body?.email || "");
    const password = String(req.body?.password || "");
    if (password.length < 10) return res.status(400).json({ error: "Lösenordet måste vara minst 10 tecken." });
    const status = await adminStatus(email);
    if (!status.exists) return res.status(404).json({ error: "Inget admin-konto för den e-posten." });
    if (status.hasPassword) return res.status(409).json({ error: "Lösenord finns redan. Logga in i stället." });
    await setPassword(email, password);
    res.json({ ok: true });
  });

  // Login step 1: email + password. Returns whether TOTP is required or needs enrollment.
  adminRouter.post("/login", async (req: Request, res: Response) => {
    const email = String(req.body?.email || "");
    const password = String(req.body?.password || "");
    const remember = Boolean(req.body?.remember);
    const result = await verifyPassword(email, password);
    if (!result.ok) {
      if (result.reason === "locked")
        return res.status(423).json({ error: `Kontot är låst i ${result.lockedMinutes} min efter för många försök.` });
      return res.status(401).json({ error: "Fel e-post eller lösenord." });
    }
    if (result.needsTotp) {
      // Defer session creation until TOTP verified. Pass a short-lived signal via body.
      return res.json({ ok: true, needsTotp: true, userId: result.userId });
    }
    // No 2FA yet → require enrollment before granting access.
    const enroll = await beginTotpEnrollment(email);
    return res.json({ ok: true, needsEnrollment: true, userId: result.userId, otpauthUrl: enroll.otpauthUrl, secret: enroll.secret });
  });

  // Confirm enrollment (first 2FA code), then create session.
  adminRouter.post("/enroll-verify", async (req: Request, res: Response) => {
    const email = String(req.body?.email || "");
    const code = String(req.body?.code || "");
    const remember = Boolean(req.body?.remember);
    const ok = await confirmTotpEnrollment(email, code);
    if (!ok) return res.status(401).json({ error: "Fel kod. Försök igen." });
    const u = await adminStatus(email);
    if (!u.exists) return res.status(404).json({ error: "Konto saknas." });
    const { getAdminByEmail } = await import("./adminAuth");
    const admin = await getAdminByEmail(email);
    if (!admin) return res.status(404).json({ error: "Konto saknas." });
    const sess = await createAdminSession(admin.id, remember);
    setSessionCookie(res, sess.token, sess.expiresAt);
    res.json({ ok: true, token: sess.token });
  });

  // Login step 2: verify TOTP for an existing 2FA user, then create session.
  adminRouter.post("/totp", async (req: Request, res: Response) => {
    const userId = Number(req.body?.userId || 0);
    const code = String(req.body?.code || "");
    const remember = Boolean(req.body?.remember);
    if (!userId) return res.status(400).json({ error: "Saknar användare." });
    const ok = await verifyTotp(userId, code);
    if (!ok) return res.status(401).json({ error: "Fel kod. Försök igen." });
    const sess = await createAdminSession(userId, remember);
    setSessionCookie(res, sess.token, sess.expiresAt);
    res.json({ ok: true, token: sess.token });
  });

  // Who am I (used by the admin UI to gate access).
  adminRouter.get("/me", async (req: Request, res: Response) => {
    const token = readAdminToken(req);
    const admin = await getAdminBySession(token);
    if (!admin) return res.status(401).json({ authenticated: false });
    res.json({ authenticated: true, email: admin.email });
  });

  adminRouter.post("/logout", async (req: Request, res: Response) => {
    const token = readAdminToken(req);
    await destroyAdminSession(token);
    res.clearCookie(ADMIN_COOKIE, { path: "/", domain: cookieDomain });
    res.json({ ok: true });
  });

  app.use("/api/admin-auth", adminRouter);

  // ---- llms.txt for AI engines (GEO) ----
  app.get("/llms.txt", async (_req: Request, res: Response) => {
    const base = process.env.PUBLIC_BASE_URL || "https://cvpiloten.se";
    const guides = await listArticles(false);
    const services = await listServices();
    const lines: string[] = [];
    lines.push("# CV-piloten");
    lines.push("> CV-piloten hjälper människor i Sverige skriva CV, personligt brev och förbereda intervju. Genomarbetat resultat på minuter, fast pris 49 kr per tjänst.");
    lines.push("");
    lines.push("## Tjänster");
    for (const s of services) lines.push(`- [${s.slug}](${base}/tjanst/${s.slug})`);
    lines.push("");
    lines.push("## Guider");
    for (const g of guides) lines.push(`- [${g.title}](${base}/guider/${g.slug}): ${g.metaDescription}`);
    lines.push("");
    lines.push("## Fakta");
    lines.push("- Alla tjänster kostar 49 kr som engångsköp, utan abonnemang.");
    lines.push("- Tjänsterna fokuserar på jobbsök: CV, personligt brev, LinkedIn och intervju.");
    res.set("Content-Type", "text/plain; charset=utf-8").send(lines.join("\n"));
  });

  // ---- Dynamic sitemap ----
  app.get("/sitemap.xml", async (_req: Request, res: Response) => {
    const base = process.env.PUBLIC_BASE_URL || "https://cvpiloten.se";
    const services = await listServices();
    const guides = await listArticles(false);
    const urls = [
      "/",
      "/guider",
      "/om-oss",
      "/integritet",
      ...services.map((s) => `/tjanst/${s.slug}`),
      ...guides.map((g) => `/guider/${g.slug}`),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${base}${u}</loc></url>`)
      .join("\n")}\n</urlset>`;
    res.header("Content-Type", "application/xml").header("Cache-Control", "public, max-age=3600").send(xml);
  });
}

// expose getSessionByStripeId for potential reuse
export { getSessionByStripeId };
