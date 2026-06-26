/**
 * Provider-agnostic chat completion using an OpenAI-compatible API.
 * Reads provider/model/key from admin settings (DB) first, then falls back to
 * environment variables. Works with OpenAI, Gemini (OpenAI-compatible endpoint),
 * and other OpenAI-compatible providers without code changes.
 */
import { getAiSettings } from "../db";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type ResolvedConfig = {
  baseUrl: string;
  apiKey: string;
  genModel: string;
  humanizerModel: string;
};

async function resolveConfig(): Promise<ResolvedConfig> {
  const s = await getAiSettings();
  const baseUrl =
    (s?.apiBaseUrl && s.apiBaseUrl.trim()) ||
    process.env.BUILT_IN_FORGE_API_URL ||
    "https://api.openai.com";
  const apiKey = (s?.apiKey && s.apiKey.trim()) || process.env.BUILT_IN_FORGE_API_KEY || "";
  const genModel = (s?.genModel && s.genModel.trim()) || process.env.GEN_MODEL || "gpt-5";
  const humanizerModel =
    (s?.humanizerModel && s.humanizerModel.trim()) || process.env.HUMANIZER_MODEL || genModel;
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey, genModel, humanizerModel };
}

export async function getModels(): Promise<{ gen: string; humanizer: string }> {
  const c = await resolveConfig();
  return { gen: c.genModel, humanizer: c.humanizerModel };
}

/** Single chat completion against the configured OpenAI-compatible endpoint. */
export async function chat(model: string, messages: ChatMessage[]): Promise<string> {
  const c = await resolveConfig();
  if (!c.apiKey) {
    throw new Error("Ingen AI-nyckel konfigurerad. Ange den i adminverktyget under AI-inställningar.");
  }
  const res = await fetch(`${c.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${c.apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI-anrop misslyckades: ${res.status} ${res.statusText} ${text}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}
