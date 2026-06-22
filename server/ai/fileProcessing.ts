/**
 * File pre-processing. Runs BEFORE any LLM call.
 * - Accept only PDF, DOC, DOCX, TXT.
 * - Reject any other type immediately.
 * - Reject image-only PDFs (no extractable text).
 */
import mammoth from "mammoth";

export type ProcessResult =
  | { ok: true; text: string }
  | { ok: false; code: "BAD_TYPE" | "NO_TEXT" | "PARSE_ERROR"; message: string };

const MIN_TEXT_CHARS = 40; // below this we treat as image-only / empty

const ACCEPTED = {
  pdf: ["application/pdf"],
  txt: ["text/plain"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

function extByName(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

export function isAcceptedFile(fileName: string, mimeType: string): boolean {
  const ext = extByName(fileName);
  if (["pdf", "txt", "doc", "docx"].includes(ext)) return true;
  return Object.values(ACCEPTED).some((list) => list.includes(mimeType));
}

export async function extractText(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ProcessResult> {
  const ext = extByName(fileName);

  // Hard reject anything that is not an accepted document type.
  if (!isAcceptedFile(fileName, mimeType)) {
    return {
      ok: false,
      code: "BAD_TYPE",
      message:
        "Systemet stöder endast textdokument (PDF, DOC, DOCX eller TXT). Vänligen ladda upp ett giltigt dokument, inte en bild.",
    };
  }

  try {
    let text = "";

    if (ext === "txt" || mimeType === "text/plain") {
      text = buffer.toString("utf-8");
    } else if (ext === "pdf" || mimeType === "application/pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const parsed = await parser.getText();
      text = parsed.text || "";
    } else if (
      ext === "docx" ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || "";
    } else if (ext === "doc" || mimeType === "application/msword") {
      // Legacy .doc: mammoth handles many; fall back to raw decode.
      try {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value || "";
      } catch {
        text = buffer.toString("utf-8").replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, " ");
      }
    }

    const cleaned = text.replace(/\s+/g, " ").trim();

    // Image-only PDF / empty document guard. This is the key rule:
    // a scanned PDF yields little or no extractable text.
    if (cleaned.length < MIN_TEXT_CHARS) {
      return {
        ok: false,
        code: "NO_TEXT",
        message:
          "Vi kunde inte läsa någon text i dokumentet. Det verkar vara en bild eller inskannat dokument. Vänligen ladda upp ett textbaserat dokument.",
      };
    }

    return { ok: true, text: text.trim() };
  } catch (e) {
    return {
      ok: false,
      code: "PARSE_ERROR",
      message:
        "Vi kunde inte tolka filen. Kontrollera att det är ett giltigt PDF-, Word- eller textdokument.",
    };
  }
}
