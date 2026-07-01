/**
 * Lightweight in-memory IP rate limiting + temporary blocking.
 * Suitable for the single-instance VPS deployment. Protects the upload/validation
 * endpoints from abuse and basic DDoS. Not shared across instances (fine here).
 */

type Bucket = {
  count: number;
  windowStart: number;
  blockedUntil: number;
};

const buckets = new Map<string, Bucket>();

// Tune: max requests per window, then a cooldown block.
const WINDOW_MS = 60_000; // 1 minute
const MAX_IN_WINDOW = 12; // uploads/validations per minute per IP
const BLOCK_MS = 10 * 60_000; // 10 minute block when exceeded

// Periodic cleanup so the map does not grow unbounded.
setInterval(() => {
  const now = Date.now();
  buckets.forEach((b, ip) => {
    if (b.blockedUntil < now && now - b.windowStart > WINDOW_MS * 5) buckets.delete(ip);
  });
}, 5 * 60_000).unref?.();

export function clientIp(req: { headers: Record<string, unknown>; socket?: { remoteAddress?: string } }): string {
  const xff = (req.headers["x-forwarded-for"] as string | undefined) || "";
  const first = xff.split(",")[0]?.trim();
  return first || req.socket?.remoteAddress || "unknown";
}

export type RateResult = { allowed: boolean; blocked: boolean; retryAfterSec?: number };

/** Count one hit for the IP. Returns whether it is allowed. */
export function rateLimit(ip: string): RateResult {
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b) {
    b = { count: 0, windowStart: now, blockedUntil: 0 };
    buckets.set(ip, b);
  }

  if (b.blockedUntil > now) {
    return { allowed: false, blocked: true, retryAfterSec: Math.ceil((b.blockedUntil - now) / 1000) };
  }

  // Reset the window if it has passed.
  if (now - b.windowStart > WINDOW_MS) {
    b.windowStart = now;
    b.count = 0;
  }

  b.count += 1;
  if (b.count > MAX_IN_WINDOW) {
    b.blockedUntil = now + BLOCK_MS;
    return { allowed: false, blocked: true, retryAfterSec: Math.ceil(BLOCK_MS / 1000) };
  }
  return { allowed: true, blocked: false };
}
