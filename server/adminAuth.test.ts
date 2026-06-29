import { describe, expect, it } from "vitest";
import * as OTPAuth from "otpauth";

/**
 * Unit tests for the TOTP logic used by admin 2FA. We test the pure crypto
 * behaviour (code generation/validation) that adminAuth relies on, since the
 * DB-bound functions require a live database.
 */
describe("admin 2FA (TOTP)", () => {
  it("validates a correct current code and rejects a wrong one", () => {
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({ issuer: "CV-piloten", secret });
    const code = totp.generate();
    // correct code validates (delta 0)
    expect(totp.validate({ token: code, window: 1 })).not.toBeNull();
    // an obviously wrong code fails
    expect(totp.validate({ token: "000000", window: 0 })).toBeNull();
  });

  it("produces an otpauth URL that round-trips the secret", () => {
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({ issuer: "CV-piloten", label: "info@bijoyiq.com", secret });
    const url = totp.toString();
    expect(url.startsWith("otpauth://totp/")).toBe(true);
    const parsed = OTPAuth.URI.parse(url) as OTPAuth.TOTP;
    expect(parsed.secret.base32).toBe(secret.base32);
  });
});
