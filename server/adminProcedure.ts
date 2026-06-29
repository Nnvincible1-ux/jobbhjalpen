/**
 * Project-specific admin guard for tRPC.
 *
 * The template's built-in adminProcedure checks Manus-OAuth role, which does
 * not work on the standalone VPS deployment. This guard instead validates our
 * own admin session cookie (cvp_admin), set by the standalone admin login.
 */
import { TRPCError } from "@trpc/server";
import { parse as parseCookie } from "cookie";
import { publicProcedure } from "./_core/trpc";
import { ADMIN_COOKIE, getAdminBySession } from "./adminAuth";

export const adminProcedure = publicProcedure.use(async (opts) => {
  const { ctx, next } = opts;
  const header = ctx.req?.headers?.cookie;
  const token = header ? parseCookie(header)[ADMIN_COOKIE] : undefined;
  const admin = await getAdminBySession(token);
  if (!admin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin-inloggning krävs." });
  }
  return next({ ctx: { ...ctx, admin } });
});
