/**
 * AI engine. All calls are server-side only.
 * The model is locked per service via getSystemPrompt().
 *
 * Two-step flow:
 *  1. A strong model generates the result (model from GEN_MODEL).
 *  2. User-facing copy is passed through a cheap humanizer model
 *     (HUMANIZER_MODEL), then a deterministic cleanup runs on everything.
 *
 * Models are read from env so the provider/model can be swapped on a VPS
 * without code changes. Defaults keep things working in the Manus sandbox.
 */
import { invokeLLM, type Message } from "../_core/llm";
import { getSystemPrompt } from "./prompts";
import { HUMANIZER_RULES, needsHumanizerPass, stripAiTells } from "./humanizer";

const GEN_MODEL = process.env.GEN_MODEL || "gpt-5";
const HUMANIZER_MODEL = process.env.HUMANIZER_MODEL || "gpt-5-mini";

export type RunInput = {
  promptKey: string;
  documentText: string;
  annonsText?: string | null;
};

export async function runService(input: RunInput): Promise<string> {
  const system = `${getSystemPrompt(input.promptKey)}\n\n${HUMANIZER_RULES}`;

  let userContent = `UNDERLAG (dokumenttext):\n${input.documentText}`;
  if (input.annonsText && input.annonsText.trim().length > 0) {
    userContent += `\n\nJOBBANNONS / KONTEXT:\n${input.annonsText.trim()}`;
  }

  const messages: Message[] = [
    { role: "system", content: system },
    { role: "user", content: userContent },
  ];

  const res = await invokeLLM({ model: GEN_MODEL, messages, reasoning: { effort: "low" } });
  const draft = extractText(res);
  return finalize(draft, input.promptKey);
}

export type AdjustInput = {
  promptKey: string;
  history: { role: "user" | "assistant"; content: string }[];
  documentText: string;
  annonsText?: string | null;
  feedback: string;
};

export async function adjustService(input: AdjustInput): Promise<string> {
  const system = `${getSystemPrompt(input.promptKey)}\n\n${HUMANIZER_RULES}`;

  let context = `UNDERLAG (dokumenttext):\n${input.documentText}`;
  if (input.annonsText && input.annonsText.trim().length > 0) {
    context += `\n\nJOBBANNONS / KONTEXT:\n${input.annonsText.trim()}`;
  }

  const messages: Message[] = [
    { role: "system", content: system },
    { role: "user", content: context },
    ...input.history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: `JUSTERINGSÖNSKEMÅL: ${input.feedback}` },
  ];

  const res = await invokeLLM({ model: GEN_MODEL, messages, reasoning: { effort: "low" } });
  const draft = extractText(res);
  return finalize(draft, input.promptKey);
}

/**
 * Humanize (LLM pass for user-facing copy) + deterministic cleanup.
 * The LLM pass is best-effort: if it fails, we still return the cleaned draft.
 */
async function finalize(draft: string, promptKey: string): Promise<string> {
  let text = draft;
  if (needsHumanizerPass(promptKey)) {
    try {
      const res = await invokeLLM({
        model: HUMANIZER_MODEL,
        messages: [
          {
            role: "system",
            content: `Du redigerar text så att den låter mänsklig. Ändra inte innehåll, fakta eller struktur, bara språket.\n${HUMANIZER_RULES}`,
          },
          { role: "user", content: draft },
        ],
      });
      const polished = extractText(res);
      if (polished && polished.trim().length > 0) text = polished;
    } catch (e) {
      console.warn("[humanizer] pass failed, using draft", e);
    }
  }
  return stripAiTells(text);
}

function extractText(res: Awaited<ReturnType<typeof invokeLLM>>): string {
  const content = res.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => ("text" in p ? p.text : ""))
      .join("")
      .trim();
  }
  return "";
}
