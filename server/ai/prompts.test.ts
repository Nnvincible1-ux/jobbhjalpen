import { describe, expect, it } from "vitest";
import { getSystemPrompt, isKnownPrompt } from "./prompts";

describe("locked system prompts", () => {
  it("knows all seven services and rejects unknown keys", () => {
    for (const key of [
      "cv_anpassning",
      "linkedin_makeover",
      "cv_granskning",
      "intervju",
    ]) {
      expect(isKnownPrompt(key)).toBe(true);
    }
    // Privatlivsprompter är borttagna ur detta projekt.
    expect(isKnownPrompt("brf_analys")).toBe(false);
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
