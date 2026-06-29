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
  updateSession,
} from "./db";
import { extractText } from "./ai/fileProcessing";
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
        const session = event.data.object as { id: string };
        await markSessionPaid(session.id);
      }
      res.json({ received: true });
    }
  );

  const router = express.Router();
  router.use(express.json({ limit: "30mb" }));

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

  // ---- Upload + pre-process. Creates an unpaid session. No LLM call here. ----
  router.post("/upload", async (req: Request, res: Response) => {
    try {
      const { serviceSlug, fileBase64, fileName, mimeType, annonsText, tenantId, participantId } = req.body as {
        serviceSlug: string;
        fileBase64: string;
        fileName: string;
        mimeType: string;
        annonsText?: string;
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

      const id = nanoid();
      await createSession({
        id,
        serviceSlug,
        paymentStatus: isOrg ? "paid" : "unpaid",
        status: "ready",
        inputFileName: fileName,
        inputText: result.text,
        annonsText: annonsText || null,
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
      const { sessionId, origin } = req.body as { sessionId: string; origin: string };
      const session = await getSession(sessionId);
      if (!session) return res.status(404).json({ ok: false, message: "Session saknas." });
      const service = await getServiceBySlug(session.serviceSlug);
      if (!service) return res.status(404).json({ ok: false, message: "Tjänst saknas." });

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

  // ---- Public tracking settings (no auth): used by the frontend to load pixels ----
  app.get("/api/public/tracking", async (_req: Request, res: Response) => {
    const s = await getSiteSettings();
    res.json({ fbPixelId: s?.fbPixelId || null, ga4Id: s?.ga4Id || null });
  });

  // ---- Standalone admin auth (VPS) ----
  const adminRouter = express.Router();
  adminRouter.use(express.json({ limit: "1mb" }));

  function readAdminToken(req: Request): string | undefined {
    const header = req.headers.cookie;
    if (!header) return undefined;
    try {
      return parseCookie(header)[ADMIN_COOKIE];
    } catch {
      return undefined;
    }
  }

  function setSessionCookie(res: Response, token: string, expiresAt: Date) {
    res.cookie(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
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
    res.json({ ok: true });
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
    res.json({ ok: true });
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
    res.clearCookie(ADMIN_COOKIE, { path: "/" });
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
