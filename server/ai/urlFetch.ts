/**
 * Fetch readable text from a public URL (job ad, etc). Returns a clear failure
 * when the page is behind a login/wall or blocks fetching (e.g. LinkedIn), so
 * the frontend can ask the user to paste the text instead.
 */

export type FetchResult =
  | { ok: true; text: string }
  | { ok: false; reason: "blocked" | "empty" | "error"; message: string };

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const PASTE_HINT =
  "Vi kunde inte läsa texten från länken (den kan kräva inloggning eller blockera automatisk läsning). Klistra in annonstexten i stället.";

export async function fetchReadableText(url: string): Promise<FetchResult> {
  let u: URL;
  try {
    u = new URL(url.trim());
    if (!/^https?:$/.test(u.protocol)) throw new Error("bad protocol");
  } catch {
    return { ok: false, reason: "error", message: "Länken ser inte giltig ut. Kontrollera adressen eller klistra in texten." };
  }

  // LinkedIn actively blocks automated fetching; don't even try.
  if (/(^|\.)linkedin\.com$/i.test(u.hostname)) {
    return {
      ok: false,
      reason: "blocked",
      message:
        "LinkedIn tillåter inte automatisk läsning av profiler. Ladda upp din profil som PDF i stället (se instruktionerna).",
    };
  }

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(u.toString(), {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        // A realistic UA improves success on open pages.
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
        "accept-language": "sv,en;q=0.8",
      },
    }).finally(() => clearTimeout(t));

    if (res.status === 401 || res.status === 403 || res.status === 429) {
      return { ok: false, reason: "blocked", message: PASTE_HINT };
    }
    if (!res.ok) {
      return { ok: false, reason: "error", message: PASTE_HINT };
    }
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("text/plain")) {
      return { ok: false, reason: "error", message: PASTE_HINT };
    }
    const html = await res.text();
    const text = stripHtml(html);
    // Login walls often return a tiny shell; treat short output as unusable.
    if (text.length < 200) {
      return { ok: false, reason: "empty", message: PASTE_HINT };
    }
    // Cap to keep token usage sane.
    return { ok: true, text: text.slice(0, 6000) };
  } catch {
    return { ok: false, reason: "error", message: PASTE_HINT };
  }
}
