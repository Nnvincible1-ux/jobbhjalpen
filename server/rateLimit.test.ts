import { describe, expect, it } from "vitest";
import { rateLimit, clientIp } from "./rateLimit";

describe("rateLimit", () => {
  it("allows normal traffic and blocks after too many hits", () => {
    const ip = "test-ip-" + Math.random();
    let lastBlocked = false;
    for (let i = 0; i < 12; i++) {
      const r = rateLimit(ip);
      expect(r.allowed).toBe(true);
    }
    // 13th hit exceeds MAX_IN_WINDOW (12) -> blocked.
    const r = rateLimit(ip);
    lastBlocked = r.blocked;
    expect(r.allowed).toBe(false);
    expect(lastBlocked).toBe(true);
    expect(r.retryAfterSec).toBeGreaterThan(0);
  });

  it("reads client ip from x-forwarded-for", () => {
    const ip = clientIp({ headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } } as never);
    expect(ip).toBe("1.2.3.4");
  });
});
