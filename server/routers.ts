import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { adminProcedure as cmsAdminProcedure } from "./adminProcedure";
import {
  addMessage,
  createParticipant,
  deleteFaq,
  getCmsFaq,
  getCmsStyles,
  getCmsTexts,
  getMembership,
  getMessages,
  getParticipant,
  addMembership,
  createSession,
  getAiSettings,
  updateAiSettings,
  getSiteSettings,
  updateSiteSettings,
  listAllServices,
  updateServiceAdmin,
  getArticleBySlug,
  getServiceBySlug,
  getSession,
  getSubscription,
  listArticles,
  getTenantById,
  getUserByOpenId,
  listParticipants,
  listServices,
  listTenants,
  listUserOrgs,
  publishAllDrafts,
  updateCmsStyle,
  updateCmsText,
  updateParticipant,
  updateSession,
  upsertFaq,
} from "./db";
import { adjustService, runService } from "./ai/engine";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  /* --------------------------- Public content --------------------------- */
  content: router({
    // includeDrafts only honored for the preview flow handled elsewhere; default published.
    all: publicProcedure
      .input(z.object({ preview: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        const drafts = input?.preview === true;
        const [texts, styles, faq] = await Promise.all([
          getCmsTexts(drafts),
          getCmsStyles(drafts),
          getCmsFaq(drafts),
        ]);
        return { texts, styles, faq };
      }),
  }),

  services: router({
    list: publicProcedure.query(() => listServices()),
    get: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(({ input }) => getServiceBySlug(input.slug)),
  }),

  guides: router({
    list: publicProcedure
      .input(z.object({ preview: z.boolean().optional() }).optional())
      .query(({ input }) => listArticles(input?.preview === true)),
    get: publicProcedure
      .input(z.object({ slug: z.string(), preview: z.boolean().optional() }))
      .query(({ input }) => getArticleBySlug(input.slug, input.preview === true)),
  }),

  /* ------------------------------ Session ------------------------------- */
  session: router({
    // Returns session state for the result page. Hides the input text.
    get: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const s = await getSession(input.id);
        if (!s) return null;
        const messages = await getMessages(input.id);
        return {
          id: s.id,
          serviceSlug: s.serviceSlug,
          paymentStatus: s.paymentStatus,
          status: s.status,
          remainingRounds: s.remainingRounds,
          messages: messages.map((m) => ({ role: m.role, content: m.content, createdAt: m.createdAt })),
        };
      }),

    // Run the AI service. STRICT gate: only when paymentStatus === 'paid'.
    run: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const s = await getSession(input.id);
        if (!s) throw new TRPCError({ code: "NOT_FOUND", message: "Session saknas." });
        if (s.paymentStatus !== "paid") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Betalning krävs innan tjänsten kan köras." });
        }
        const existing = await getMessages(input.id);
        if (existing.length > 0) {
          return { content: existing[0].content };
        }
        const service = await getServiceBySlug(s.serviceSlug);
        if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Tjänst saknas." });

        await updateSession(input.id, { status: "processing" });
        const content = await runService({
          promptKey: service.promptKey,
          documentText: s.inputText || "",
          annonsText: s.annonsText,
        });
        await addMessage(input.id, "assistant", content);
        await updateSession(input.id, { status: "completed" });
        return { content };
      }),

    // Adjustment round. Decrements remainingRounds in the DB. Locks at 0.
    adjust: publicProcedure
      .input(z.object({ id: z.string(), feedback: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const s = await getSession(input.id);
        if (!s) throw new TRPCError({ code: "NOT_FOUND", message: "Session saknas." });
        if (s.paymentStatus !== "paid") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Betalning krävs." });
        }
        const service = await getServiceBySlug(s.serviceSlug);
        if (!service || !service.hasAdjustments) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Den här tjänsten har inga justeringsrundor." });
        }
        if (s.remainingRounds <= 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Dina justeringsförsök är förbrukade." });
        }

        const history = (await getMessages(input.id)).map((m) => ({ role: m.role, content: m.content }));
        await addMessage(input.id, "user", input.feedback);
        const content = await adjustService({
          promptKey: service.promptKey,
          history,
          documentText: s.inputText || "",
          annonsText: s.annonsText,
          feedback: input.feedback,
        });
        await addMessage(input.id, "assistant", content);
        const remaining = s.remainingRounds - 1;
        await updateSession(input.id, {
          remainingRounds: remaining,
          status: remaining <= 0 ? "locked" : "completed",
        });
        return { content, remainingRounds: remaining, locked: remaining <= 0 };
      }),
  }),

  /* ------------------------------ CMS admin ----------------------------- */
  cms: router({
    all: cmsAdminProcedure.query(async () => {
      // Admin sees draft overlay so editing reflects pending changes.
      const [texts, styles, faq] = await Promise.all([
        getCmsTexts(true),
        getCmsStyles(true),
        getCmsFaq(true),
      ]);
      return { texts, styles, faq };
    }),

    saveText: cmsAdminProcedure
      .input(z.object({ textKey: z.string(), content: z.string() }))
      .mutation(async ({ input }) => {
        // Edits go to draft (isDraft=true) until published.
        await updateCmsText(input.textKey, input.content);
        return { ok: true };
      }),

    saveStyle: cmsAdminProcedure
      .input(z.object({ styleKey: z.string(), value: z.string() }))
      .mutation(async ({ input }) => {
        await updateCmsStyle(input.styleKey, input.value);
        return { ok: true };
      }),

    saveFaq: cmsAdminProcedure
      .input(
        z.object({
          id: z.number().optional(),
          question: z.string(),
          answer: z.string(),
          sortOrder: z.number().default(0),
        })
      )
      .mutation(async ({ input }) => {
        await upsertFaq(input);
        return { ok: true };
      }),

    deleteFaq: cmsAdminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteFaq(input.id);
        return { ok: true };
      }),

    publish: cmsAdminProcedure.mutation(async ({ ctx }) => {
      await publishAllDrafts(ctx.admin.email ?? null);
      return { ok: true };
    }),
  }),

  /* --------------------------- AI settings ------------------------------ */
  ai: router({
    // Read current AI settings. apiKey is masked (only whether it is set).
    get: cmsAdminProcedure.query(async () => {
      const s = await getAiSettings();
      return {
        provider: s?.provider ?? "gemini",
        apiBaseUrl: s?.apiBaseUrl ?? "https://generativelanguage.googleapis.com/v1beta/openai",
        genModel: s?.genModel ?? "gemini-2.5-flash",
        humanizerModel: s?.humanizerModel ?? "gemini-2.5-flash",
        hasApiKey: Boolean(s?.apiKey && s.apiKey.length > 0),
      };
    }),
    save: cmsAdminProcedure
      .input(
        z.object({
          provider: z.string().min(1),
          apiBaseUrl: z.string().min(1),
          genModel: z.string().min(1),
          humanizerModel: z.string().min(1),
          apiKey: z.string().optional(), // empty/omitted = keep existing
        })
      )
      .mutation(async ({ input }) => {
        const patch: Record<string, unknown> = {
          provider: input.provider,
          apiBaseUrl: input.apiBaseUrl,
          genModel: input.genModel,
          humanizerModel: input.humanizerModel,
        };
        if (input.apiKey && input.apiKey.trim().length > 0) patch.apiKey = input.apiKey.trim();
        await updateAiSettings(patch);
        return { ok: true };
      }),
  }),

  /* --------------------------- Tracking (admin) ------------------------- */
  tracking: router({
    get: cmsAdminProcedure.query(async () => {
      const s = await getSiteSettings();
      return { fbPixelId: s?.fbPixelId ?? "", ga4Id: s?.ga4Id ?? "", accessCode: s?.accessCode ?? "" };
    }),
    save: cmsAdminProcedure
      .input(z.object({ fbPixelId: z.string(), ga4Id: z.string() }))
      .mutation(async ({ input }) => {
        await updateSiteSettings({
          fbPixelId: input.fbPixelId.trim() || null,
          ga4Id: input.ga4Id.trim() || null,
        });
        return { ok: true };
      }),
  }),

  /* --------------------------- Services (admin) ------------------------- */
  servicesAdmin: router({
    // List all services incl. inactive, with price + active flag.
    list: cmsAdminProcedure.query(async () => {
      const all = await listAllServices();
      return all.map((s) => ({ slug: s.slug, category: s.category, priceSek: s.priceSek, active: s.active, sortOrder: s.sortOrder }));
    }),
    update: cmsAdminProcedure
      .input(z.object({ slug: z.string(), active: z.boolean().optional(), priceSek: z.number().min(0).optional() }))
      .mutation(async ({ input }) => {
        await updateServiceAdmin(input.slug, {
          ...(input.active !== undefined ? { active: input.active } : {}),
          ...(input.priceSek !== undefined ? { priceSek: input.priceSek } : {}),
        });
        return { ok: true };
      }),
    // Test access code (free-mode gate while testing).
    getAccessCode: cmsAdminProcedure.query(async () => {
      const s = await getSiteSettings();
      return { accessCode: s?.accessCode ?? "" };
    }),
    setAccessCode: cmsAdminProcedure
      .input(z.object({ accessCode: z.string() }))
      .mutation(async ({ input }) => {
        await updateSiteSettings({ accessCode: input.accessCode.trim() || null });
        return { ok: true };
      }),
  }),

  /* ----------------------------- Coach (org) ---------------------------- */
  // Coach-bolagens handledare hanterar sina deltagare. Behörighet kontrolleras
  // via membership i tenanten; en handledare ser bara sin egen organisations data.
  coach: router({
    // Vilka organisationer den inloggade anvandaren tillhor + roll.
    myOrgs: protectedProcedure.query(async ({ ctx }) => {
      // Riktiga medlemskap for anvandaren.
      const orgs = await listUserOrgs(ctx.user.id);
      if (orgs.length > 0) return orgs;
      // Plattformsadmin far se alla coach-tenants aven utan medlemskap (forvaltning/demo).
      if (ctx.user.role === "admin") {
        const all = await listTenants();
        return all.filter((t) => t.type === "coach").map((t) => ({ tenantId: t.id, name: t.name, slug: t.slug, orgRole: "org_admin" as const }));
      }
      return [];
    }),

    // org_admin lagger till en handledare (coach) via openId.
    addCoach: protectedProcedure
      .input(z.object({ tenantId: z.number(), openId: z.string().min(1), orgRole: z.enum(["org_admin", "coach"]).default("coach") }))
      .mutation(async ({ ctx, input }) => {
        const membership = await getMembership(ctx.user.id, input.tenantId);
        const allowed = ctx.user.role === "admin" || membership?.orgRole === "org_admin";
        if (!allowed) throw new TRPCError({ code: "FORBIDDEN", message: "Endast organisationsadmin kan lagga till handledare." });
        const target = await getUserByOpenId(input.openId);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Anvandaren maste ha loggat in minst en gang forst." });
        await addMembership(target.id, input.tenantId, input.orgRole);
        return { ok: true };
      }),

    // Starta en tjanst at en deltagare. Skapar en tenant-/deltagarkopplad session
    // som ar org-betald (paymentStatus=paid) eftersom organisationen abonnerar.
    startServiceForParticipant: protectedProcedure
      .input(z.object({ tenantId: z.number(), participantId: z.number(), serviceSlug: z.string(), documentText: z.string().min(1), annonsText: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await assertTenantAccess(ctx.user.id, ctx.user.role, input.tenantId);
        const participant = await getParticipant(input.participantId);
        if (!participant || participant.tenantId !== input.tenantId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Deltagare saknas i organisationen." });
        }
        const service = await getServiceBySlug(input.serviceSlug);
        if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Tjanst saknas." });
        const id = nanoid();
        await createSession({
          id,
          serviceSlug: service.slug,
          paymentStatus: "paid", // organisationen abonnerar; ingen 49 kr-betalning
          status: "ready",
          inputText: input.documentText,
          annonsText: input.annonsText ?? null,
          remainingRounds: service.hasAdjustments ? service.maxRounds : 0,
          tenantId: input.tenantId,
          participantId: input.participantId,
          coachUserId: ctx.user.id,
        });
        return { ok: true, sessionId: id };
      }),

    listParticipants: protectedProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertTenantAccess(ctx.user.id, ctx.user.role, input.tenantId);
        // org_admin ser alla; coach ser sina egna. Plattformsadmin ser alla.
        const membership = await getMembership(ctx.user.id, input.tenantId);
        const seeAll = ctx.user.role === "admin" || membership?.orgRole === "org_admin";
        return listParticipants(input.tenantId, seeAll ? undefined : ctx.user.id);
      }),

    addParticipant: protectedProcedure
      .input(z.object({ tenantId: z.number(), fullName: z.string().min(1), email: z.string().optional(), note: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await assertTenantAccess(ctx.user.id, ctx.user.role, input.tenantId);
        await createParticipant({ tenantId: input.tenantId, coachUserId: ctx.user.id, fullName: input.fullName, email: input.email, note: input.note });
        return { ok: true };
      }),

    updateParticipantStatus: protectedProcedure
      .input(z.object({ participantId: z.number(), status: z.enum(["active", "placed", "archived"]) }))
      .mutation(async ({ ctx, input }) => {
        const p = await getParticipant(input.participantId);
        if (!p) throw new TRPCError({ code: "NOT_FOUND" });
        await assertTenantAccess(ctx.user.id, ctx.user.role, p.tenantId);
        await updateParticipant(input.participantId, { status: input.status });
        return { ok: true };
      }),

    // Organisationens abonnemang (faktureras separat från 49 kr-konsumentflödet).
    subscription: protectedProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertTenantAccess(ctx.user.id, ctx.user.role, input.tenantId);
        const sub = await getSubscription(input.tenantId);
        const tenant = await getTenantById(input.tenantId);
        return { subscription: sub ?? null, tenantName: tenant?.name ?? "" };
      }),
  }),
});

// Throws unless the user is platform admin or a member of the tenant.
async function assertTenantAccess(userId: number, role: string, tenantId: number) {
  if (role === "admin") return;
  const membership = await getMembership(userId, tenantId);
  if (!membership) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Du har inte behörighet till den här organisationen." });
  }
}

export type AppRouter = typeof appRouter;
