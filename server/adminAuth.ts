/**
 * Standalone admin authentication for the VPS deployment (independent of Manus OAuth).
 * - Email/password with bcrypt
 * - TOTP 2FA (otpauth), enforced once enabled
 * - Sessions via httpOnly cookie token; "remember me" up to 30 days
 * - Simple brute-force lockout
 */
import { and, eq, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import * as OTPAuth from "otpauth";
import { getDb } from "./db";
import { adminSessions, adminUsers } from "../drizzle/schema";

const ISSUER = "CV-piloten";
const SHORT_DAYS = 1;
const REMEMBER_DAYS = 30;
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export const ADMIN_COOKIE = "cvp_admin";

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function getAdminByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email.toLowerCase().trim()))
    .limit(1);
  return rows[0];
}

export async function getAdminById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  return rows[0];
}

/** Returns the admin status so the UI can guide the first-time setup. */
export async function adminStatus(email: string) {
  const u = await getAdminByEmail(email);
  if (!u) return { exists: false, hasPassword: false, totpEnabled: false };
  return { exists: true, hasPassword: Boolean(u.passwordHash), totpEnabled: u.totpEnabled };
}

/** Set or change password (used on first-time setup). */
export async function setPassword(email: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("DB ej tillgänglig");
  const hash = await bcrypt.hash(password, 12);
  await db.update(adminUsers).set({ passwordHash: hash }).where(eq(adminUsers.email, email.toLowerCase().trim()));
}

type VerifyResult =
  | { ok: false; reason: "invalid" | "locked" | "no_account"; lockedMinutes?: number }
  | { ok: true; needsTotp: boolean; userId: number };

/** Step 1: verify email + password (and lockout). Does not create a session. */
export async function verifyPassword(email: string, password: string): Promise<VerifyResult> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "no_account" };
  const u = await getAdminByEmail(email);
  if (!u || !u.passwordHash) return { ok: false, reason: "no_account" };

  if (u.lockedUntil && u.lockedUntil.getTime() > Date.now()) {
    const mins = Math.ceil((u.lockedUntil.getTime() - Date.now()) / 60000);
    return { ok: false, reason: "locked", lockedMinutes: mins };
  }

  const match = await bcrypt.compare(password, u.passwordHash);
  if (!match) {
    const attempts = u.failedAttempts + 1;
    const patch: Record<string, unknown> = { failedAttempts: attempts };
    if (attempts >= MAX_ATTEMPTS) {
      patch.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
      patch.failedAttempts = 0;
    }
    await db.update(adminUsers).set(patch).where(eq(adminUsers.id, u.id));
    return { ok: false, reason: "invalid" };
  }

  await db.update(adminUsers).set({ failedAttempts: 0, lockedUntil: null }).where(eq(adminUsers.id, u.id));
  return { ok: true, needsTotp: u.totpEnabled, userId: u.id };
}

/** Begin TOTP enrollment: generate a secret + otpauth URL for a QR code. */
export async function beginTotpEnrollment(email: string) {
  const db = await getDb();
  if (!db) throw new Error("DB ej tillgänglig");
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({ issuer: ISSUER, label: email, secret });
  // Store secret but keep disabled until confirmed.
  await db
    .update(adminUsers)
    .set({ totpSecret: secret.base32, totpEnabled: false })
    .where(eq(adminUsers.email, email.toLowerCase().trim()));
  return { otpauthUrl: totp.toString(), secret: secret.base32 };
}

function checkTotp(secretBase32: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({ issuer: ISSUER, secret: OTPAuth.Secret.fromBase32(secretBase32) });
  // window 1 allows slight clock drift
  const delta = totp.validate({ token: code.replace(/\s/g, ""), window: 1 });
  return delta !== null;
}

/** Confirm enrollment by validating the first code; enables 2FA. */
export async function confirmTotpEnrollment(email: string, code: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const u = await getAdminByEmail(email);
  if (!u || !u.totpSecret) return false;
  if (!checkTotp(u.totpSecret, code)) return false;
  await db.update(adminUsers).set({ totpEnabled: true }).where(eq(adminUsers.id, u.id));
  return true;
}

/** Step 2: verify a TOTP code during login. */
export async function verifyTotp(userId: number, code: string): Promise<boolean> {
  const u = await getAdminById(userId);
  if (!u || !u.totpSecret) return false;
  return checkTotp(u.totpSecret, code);
}

/** Create a session token; remember=true → 30 days, else 1 day. */
export async function createAdminSession(userId: number, remember: boolean): Promise<{ token: string; expiresAt: Date }> {
  const db = await getDb();
  if (!db) throw new Error("DB ej tillgänglig");
  const token = nanoid(64);
  const expiresAt = daysFromNow(remember ? REMEMBER_DAYS : SHORT_DAYS);
  await db.insert(adminSessions).values({ adminUserId: userId, token, expiresAt });
  return { token, expiresAt };
}

/** Resolve a session token to an admin user (if not expired). */
export async function getAdminBySession(token: string | undefined) {
  if (!token) return undefined;
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(adminSessions)
    .where(and(eq(adminSessions.token, token), gt(adminSessions.expiresAt, new Date())))
    .limit(1);
  if (rows.length === 0) return undefined;
  return getAdminById(rows[0].adminUserId);
}

export async function destroyAdminSession(token: string | undefined) {
  if (!token) return;
  const db = await getDb();
  if (!db) return;
  await db.delete(adminSessions).where(eq(adminSessions.token, token));
}
