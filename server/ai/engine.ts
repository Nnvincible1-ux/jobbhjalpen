/**
 * AI engine. All calls are server-side only.
 * The model is locked per service via getSystemPrompt().
 *
 * Two-step flow:
 *  1. A strong model generates the result.
 *  2. User-facing copy is passed through a humanizer model, then a
 *     deterministic cleanup runs on everything.
 *
 * Provider, models and API key come from admin settings (DB) with env fallback,
 * so the owner can switch provider/model/key from the admin tool with no code
 * changes. See server/ai/provider.ts.
 */
import { chat, getModels, type ChatMessage } from "./provider";
import { getSystemPrompt } from "./prompts";
import { HUMANIZER_RULES, needsHumanizerPass, stripAiTells } from "./humanizer";

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

  const { gen } = await getModels();
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: userContent },
  ];
  const draft = await chat(gen, messages);
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

  const { gen } = await getModels();
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: context },
    ...input.history.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
    { role: "user", content: `JUSTERINGSÖNSKEMÅL: ${input.feedback}` },
  ];
  const draft = await chat(gen, messages);
  return finalize(draft, input.promptKey);
}

/** Humanize (LLM pass for user-facing copy) + deterministic cleanup. */
async function finalize(draft: string, promptKey: string): Promise<string> {
  let text = draft;
  if (needsHumanizerPass(promptKey)) {
    try {
      const { humanizer } = await getModels();
      const polished = await chat(humanizer, [
        {
          role: "system",
          content: `Du redigerar text så att den låter mänsklig. Ändra inte innehåll, fakta eller struktur, bara språket.\n${HUMANIZER_RULES}`,
        },
        { role: "user", content: draft },
      ]);
      if (polished && polished.trim().length > 0) text = polished;
    } catch (e) {
      console.warn("[humanizer] pass failed, using draft", e);
    }
  }
  return stripAiTells(text);
}
