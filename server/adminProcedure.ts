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
  // Prefer Authorization: Bearer <token> (immune to reverse-proxy cookie issues),
  // fall back to the cvp_admin cookie for backward compatibility.
  const authHeader = ctx.req?.headers?.authorization;
  let token: string | undefined;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else {
    const cookieHeader = ctx.req?.headers?.cookie;
    token = cookieHeader ? parseCookie(cookieHeader)[ADMIN_COOKIE] : undefined;
  }
  const admin = await getAdminBySession(token);
  if (!admin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin-inloggning krävs." });
  }
  return next({ ctx: { ...ctx, admin } });
});
