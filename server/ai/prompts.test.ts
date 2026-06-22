import { describe, expect, it } from "vitest";
import { getSystemPrompt, isKnownPrompt } from "./prompts";

describe("locked system prompts", () => {
  it("knows all seven services and rejects unknown keys", () => {
    for (const key of [
      "cv_anpassning",
      "linkedin_makeover",
      "cv_granskning",
      "intervju",
      "brf_analys",
      "avtal_granskning",
      "overklagande",
    ]) {
      expect(isKnownPrompt(key)).toBe(true);
    }
    expect(isKnownPrompt("write_me_python")).toBe(false);
    expect(() => getSystemPrompt("write_me_python")).toThrow();
  });

  it("embeds guardrails that forbid off-topic and image handling", () => {
    const p = getSystemPrompt("cv_granskning");
    expect(p).toContain("ENBART");
    expect(p).toMatch(/tolkar ALDRIG bilder/i);
    expect(p).toMatch(/allmänna frågor/i);
  });
});
