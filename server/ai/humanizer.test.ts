import { describe, expect, it } from "vitest";
import { HUMANIZER_RULES, needsHumanizerPass, stripAiTells } from "./humanizer";

describe("humanizer", () => {
  it("removes em and en dashes from text", () => {
    expect(stripAiTells("Det här — en aside — fortsätter.")).toBe("Det här, en aside, fortsätter.");
    expect(stripAiTells("CV–granskning")).toBe("CV, granskning");
  });

  it("collapses double spaces left behind", () => {
    expect(stripAiTells("ett  två")).toBe("ett två");
  });

  it("marks user-facing copy services for the LLM pass", () => {
    expect(needsHumanizerPass("cv_anpassning")).toBe(true);
    expect(needsHumanizerPass("linkedin_makeover")).toBe(true);
  });

  it("skips the LLM pass for analysis services", () => {
    expect(needsHumanizerPass("cv_granskning")).toBe(false);
    expect(needsHumanizerPass("intervju")).toBe(false);
  });

  it("rules forbid dashes and AI words", () => {
    expect(HUMANIZER_RULES).toMatch(/tankstreck/);
    expect(HUMANIZER_RULES.toLowerCase()).toMatch(/avgörande/);
  });
});

import { stripAiTells as _strip } from "./humanizer";
describe("strips humanizer meta-preamble", () => {
  it("removes a leading 'Här är texten ...:' line", () => {
    const inp = "Här är texten omskriven för att låta mer naturlig:\n\nShadip Rahman\nProjektledare";
    const out = _strip(inp);
    expect(out.startsWith("Shadip Rahman")).toBe(true);
  });
  it("keeps normal text untouched", () => {
    expect(_strip("Shadip Rahman\nProjektledare").startsWith("Shadip")).toBe(true);
  });
});
