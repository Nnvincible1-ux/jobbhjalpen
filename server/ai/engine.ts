/**
 * AI engine. All calls are server-side only.
 * The model is locked per service via getSystemPrompt().
 */
import { invokeLLM, type Message } from "../_core/llm";
import { getSystemPrompt } from "./prompts";

const MODEL = "gpt-5"; // strong reasoning; cost ~0.3 kr/run, margin holds at 49 kr

export type RunInput = {
  promptKey: string;
  documentText: string;
  annonsText?: string | null;
};

export async function runService(input: RunInput): Promise<string> {
  const system = getSystemPrompt(input.promptKey);

  let userContent = `UNDERLAG (dokumenttext):\n${input.documentText}`;
  if (input.annonsText && input.annonsText.trim().length > 0) {
    userContent += `\n\nJOBBANNONS / KONTEXT:\n${input.annonsText.trim()}`;
  }

  const messages: Message[] = [
    { role: "system", content: system },
    { role: "user", content: userContent },
  ];

  const res = await invokeLLM({
    model: MODEL,
    messages,
    reasoning: { effort: "low" },
  });

  return extractText(res);
}

export type AdjustInput = {
  promptKey: string;
  history: { role: "user" | "assistant"; content: string }[];
  documentText: string;
  annonsText?: string | null;
  feedback: string;
};

export async function adjustService(input: AdjustInput): Promise<string> {
  const system = getSystemPrompt(input.promptKey);

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

  const res = await invokeLLM({
    model: MODEL,
    messages,
    reasoning: { effort: "low" },
  });

  return extractText(res);
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
