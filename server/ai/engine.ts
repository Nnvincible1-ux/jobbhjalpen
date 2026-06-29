/**
 * AI engine. All calls are server-side only.
 * The model is locked per service via getSystemPrompt().
 *
 * Output is STRUCTURED (ServiceResult JSON): match score, summary, gaps
 * (addable suggestions), adapted CV and cover letter. User-facing free text is
 * humanized, then a deterministic cleanup runs. The result is stored as JSON in
 * the session message so the frontend can render a conversion-focused layout.
 *
 * Provider/model/key come from admin settings (DB) with env fallback.
 */
import { chat, chatJson, getModels, type ChatMessage } from "./provider";
import { getSystemPrompt, RESULT_JSON_HINT } from "./prompts";
import { HUMANIZER_RULES, needsHumanizerPass, stripAiTells } from "./humanizer";

export type Gap = { label: string; why: string; suggestion: string };

export type ServiceResult = {
  matchScore: number;
  scoreLabel: string;
  summary: string[];
  gaps: Gap[];
  adaptedCv: string;
  coverLetter: string;
  refusal: string;
};

export type RunInput = {
  promptKey: string;
  documentText: string;
  annonsText?: string | null;
  /** Suggestions (gap labels/suggestions) the user opted to include. */
  selectedAdditions?: string[];
};

function buildUserContent(documentText: string, annonsText?: string | null, additions?: string[]): string {
  let userContent = `UNDERLAG (dokumenttext):\n${documentText}`;
  if (annonsText && annonsText.trim().length > 0) {
    userContent += `\n\nJOBBANNONS / KONTEXT:\n${annonsText.trim()}`;
  }
  if (additions && additions.length > 0) {
    userContent +=
      `\n\nANVÄNDAREN HAR BEKRÄFTAT ATT FÖLJANDE STÄMMER och vill att du väver in det (sanningsenligt):\n` +
      additions.map((a) => `- ${a}`).join("\n");
  }
  return userContent;
}

export async function runService(input: RunInput): Promise<ServiceResult> {
  const system = `${getSystemPrompt(input.promptKey)}\n\n${RESULT_JSON_HINT}`;
  const { gen } = await getModels();
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: buildUserContent(input.documentText, input.annonsText, input.selectedAdditions) },
  ];
  const raw = await chatJson(gen, messages);
  return finalize(raw, input.promptKey);
}

export type AdjustInput = {
  promptKey: string;
  history: { role: "user" | "assistant"; content: string }[];
  documentText: string;
  annonsText?: string | null;
  feedback: string;
};

export async function adjustService(input: AdjustInput): Promise<ServiceResult> {
  const system = `${getSystemPrompt(input.promptKey)}\n\n${RESULT_JSON_HINT}`;
  const { gen } = await getModels();
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: buildUserContent(input.documentText, input.annonsText) },
    ...input.history.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
    { role: "user", content: `JUSTERINGSÖNSKEMÅL (behåll JSON-formatet): ${input.feedback}` },
  ];
  const raw = await chatJson(gen, messages);
  return finalize(raw, input.promptKey);
}

/**
 * Validate an adjustment comment server-side. Rejects empty/gibberish/too-short
 * comments so a round is never wasted on a meaningless request.
 */
export function isMeaningfulFeedback(feedback: string): boolean {
  const t = (feedback || "").trim();
  if (t.length < 10) return false;
  const words = t.split(/\s+/).filter((w) => w.length > 1);
  if (words.length < 3) return false;
  // Must contain letters (not just symbols/numbers) and some vowels (real words).
  if (!/[a-zA-ZåäöÅÄÖ]/.test(t)) return false;
  if (!/[aeiouyåäöAEIOUYÅÄÖ]/.test(t)) return false;
  // Reject a single repeated char like "aaaaaaaaaa".
  if (/^(.)\1+$/.test(t.replace(/\s/g, ""))) return false;
  return true;
}

function safeParse(raw: string): Partial<ServiceResult> {
  // Strip code fences if the model added them.
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned) as Partial<ServiceResult>;
  } catch {
    // Try to locate the first {...} block.
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as Partial<ServiceResult>;
      } catch {
        /* ignore */
      }
    }
    // Fallback: treat the whole thing as the adapted document.
    return { adaptedCv: cleaned, summary: [], gaps: [] };
  }
}

async function humanize(text: string, promptKey: string): Promise<string> {
  if (!text || !text.trim()) return text;
  let out = text;
  if (needsHumanizerPass(promptKey)) {
    try {
      const { humanizer } = await getModels();
      const polished = await chat(humanizer, [
        {
          role: "system",
          content: `Du redigerar text så att den låter mänsklig. Ändra inte innehåll, fakta eller struktur, bara språket.\n${HUMANIZER_RULES}`,
        },
        { role: "user", content: text },
      ]);
      if (polished && polished.trim().length > 0) out = polished;
    } catch (e) {
      console.warn("[humanizer] pass failed, using draft", e);
    }
  }
  return stripAiTells(out);
}

async function finalize(raw: string, promptKey: string): Promise<ServiceResult> {
  const p = safeParse(raw);

  const refusal = (p.refusal || "").trim();
  if (refusal) {
    return { matchScore: 0, scoreLabel: "", summary: [], gaps: [], adaptedCv: "", coverLetter: "", refusal };
  }

  const score = Math.max(0, Math.min(100, Math.round(Number(p.matchScore) || 0)));
  const summary = Array.isArray(p.summary) ? p.summary.filter((s) => typeof s === "string" && s.trim()) : [];
  const gaps = Array.isArray(p.gaps)
    ? p.gaps
        .filter((g) => g && typeof g === "object")
        .map((g) => ({
          label: String((g as Gap).label ?? "").trim(),
          why: String((g as Gap).why ?? "").trim(),
          suggestion: String((g as Gap).suggestion ?? "").trim(),
        }))
        .filter((g) => g.label)
    : [];

  // Humanize the long-form, user-facing documents.
  const adaptedCv = await humanize(String(p.adaptedCv ?? ""), promptKey);
  const coverLetter = await humanize(String(p.coverLetter ?? ""), promptKey);

  return {
    matchScore: score,
    scoreLabel: String(p.scoreLabel ?? "").trim() || labelForScore(score),
    summary: summary.map((s) => stripAiTells(s)),
    gaps: gaps.map((g) => ({ label: g.label, why: stripAiTells(g.why), suggestion: stripAiTells(g.suggestion) })),
    adaptedCv,
    coverLetter,
    refusal: "",
  };
}

function labelForScore(score: number): string {
  if (score >= 80) return "Stark match";
  if (score >= 60) return "God match";
  if (score >= 40) return "Delvis match";
  return "Behöver stärkas";
}
