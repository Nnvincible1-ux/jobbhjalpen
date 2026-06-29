import { describe, expect, it } from "vitest";
import { isMeaningfulFeedback } from "./engine";

describe("isMeaningfulFeedback", () => {
  it("rejects empty, too short and gibberish comments", () => {
    expect(isMeaningfulFeedback("")).toBe(false);
    expect(isMeaningfulFeedback("ok")).toBe(false);
    expect(isMeaningfulFeedback("asdf")).toBe(false);
    expect(isMeaningfulFeedback("aaaaaaaaaa")).toBe(false);
    expect(isMeaningfulFeedback("123 456 789")).toBe(false); // no letters
    expect(isMeaningfulFeedback("a b c")).toBe(false); // too few real words
  });

  it("accepts a concrete sentence", () => {
    expect(
      isMeaningfulFeedback("Lyft fram min erfarenhet av förändringsledning tydligare.")
    ).toBe(true);
    expect(isMeaningfulFeedback("Gör tonen mer formell och korta ned brevet.")).toBe(true);
  });
});
