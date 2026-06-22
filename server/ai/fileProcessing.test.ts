import { describe, expect, it } from "vitest";
import { extractText, isAcceptedFile } from "./fileProcessing";

describe("file pre-processing", () => {
  it("accepts allowed document types by extension", () => {
    expect(isAcceptedFile("cv.pdf", "")).toBe(true);
    expect(isAcceptedFile("cv.docx", "")).toBe(true);
    expect(isAcceptedFile("cv.txt", "")).toBe(true);
  });

  it("rejects image / disallowed types", async () => {
    const res = await extractText(Buffer.from("fakebytes"), "foto.png", "image/png");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("BAD_TYPE");
  });

  it("rejects text documents with no extractable text (image-only stand-in)", async () => {
    const res = await extractText(Buffer.from("hej"), "tom.txt", "text/plain");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("NO_TEXT");
  });

  it("accepts a real text document and returns its content", async () => {
    const content =
      "Anna Andersson, systemutvecklare med sex års erfarenhet av Java och Python samt molnplattformar.";
    const res = await extractText(Buffer.from(content), "cv.txt", "text/plain");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.text).toContain("Anna Andersson");
  });
});
