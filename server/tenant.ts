import type { Request } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { tenants, type Tenant } from "../drizzle/schema";

/**
 * Resolve the active tenant from the request.
 * Priority: explicit ?tenant=slug (dev/testing) > subdomain > 'default'.
 *
 * Subdomain rule: for host like `coachab.jobbhjalpen.se` the first label is the
 * tenant slug. Known platform hosts (www, app, localhost, *.manus.computer,
 * *.manus.space) map to the default consumer tenant.
 */
const PLATFORM_LABELS = new Set(["www", "app", "localhost", "127", "jobbhjalpen"]);

export function resolveTenantSlug(req: Request): string {
  const q = (req.query?.tenant as string | undefined)?.trim();
  if (q) return q;

  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
  const hostname = host.split(":")[0];
  const labels = hostname.split(".");

  // Sandbox/preview and bare hosts → default
  if (
    hostname === "localhost" ||
    hostname.endsWith(".manus.computer") ||
    hostname.endsWith(".manus.space") ||
    labels.length < 3
  ) {
    return "default";
  }
  const first = labels[0];
  if (PLATFORM_LABELS.has(first)) return "default";
  return first;
}

const cache = new Map<string, { tenant: Tenant; at: number }>();
const TTL = 30_000;

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const cached = cache.get(slug);
  if (cached && Date.now() - cached.at < TTL) return cached.tenant;

  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  let tenant = rows[0] ?? null;
  if (!tenant && slug !== "default") {
    const def = await db.select().from(tenants).where(eq(tenants.slug, "default")).limit(1);
    tenant = def[0] ?? null;
  }
  if (tenant) cache.set(slug, { tenant, at: Date.now() });
  return tenant;
}

export function clearTenantCache() {
  cache.clear();
}
