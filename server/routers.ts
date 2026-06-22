import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addMessage,
  deleteFaq,
  getCmsFaq,
  getCmsStyles,
  getCmsTexts,
  getMessages,
  getServiceBySlug,
  getSession,
  listServices,
  publishAllDrafts,
  updateCmsStyle,
  updateCmsText,
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
    all: adminProcedure.query(async () => {
      // Admin sees draft overlay so editing reflects pending changes.
      const [texts, styles, faq] = await Promise.all([
        getCmsTexts(true),
        getCmsStyles(true),
        getCmsFaq(true),
      ]);
      return { texts, styles, faq };
    }),

    saveText: adminProcedure
      .input(z.object({ textKey: z.string(), content: z.string() }))
      .mutation(async ({ input }) => {
        // Edits go to draft (isDraft=true) until published.
        await updateCmsText(input.textKey, input.content);
        return { ok: true };
      }),

    saveStyle: adminProcedure
      .input(z.object({ styleKey: z.string(), value: z.string() }))
      .mutation(async ({ input }) => {
        await updateCmsStyle(input.styleKey, input.value);
        return { ok: true };
      }),

    saveFaq: adminProcedure
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

    deleteFaq: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteFaq(input.id);
        return { ok: true };
      }),

    publish: adminProcedure.mutation(async ({ ctx }) => {
      await publishAllDrafts(ctx.user.name ?? null);
      return { ok: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
