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

const QUOTA_MESSAGE =
  "Tjänsten har för många förfrågningar just nu. Försök igen om en liten stund.";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * POST to the chat endpoint with limited retry on 429 (rate/quota). On a final
 * 429 we throw a short, user-friendly message (never the raw provider payload).
 */
async function postChat(body: Record<string, unknown>): Promise<string> {
  const c = await resolveConfig();
  if (!c.apiKey) {
    throw new Error("Ingen AI-nyckel konfigurerad. Ange den i adminverktyget under AI-inställningar.");
  }
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(`${c.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${c.apiKey}` },
      body: JSON.stringify({ model: (body as { model?: string }).model, ...body }),
    });
    if (res.ok) {
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return data.choices?.[0]?.message?.content ?? "";
    }
    if (res.status === 429 && attempt < maxAttempts) {
      // Respect Retry-After when present, else exponential backoff (capped).
      const ra = Number(res.headers.get("retry-after"));
      const waitMs = Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 8000) : attempt * 2500;
      await sleep(waitMs);
      continue;
    }
    if (res.status === 429) {
      throw new Error(QUOTA_MESSAGE);
    }
    const text = await res.text();
    throw new Error(`AI-anrop misslyckades: ${res.status} ${res.statusText} ${text}`);
  }
  throw new Error(QUOTA_MESSAGE);
}

/** Single chat completion against the configured OpenAI-compatible endpoint. */
export async function chat(model: string, messages: ChatMessage[]): Promise<string> {
  return postChat({ model, messages });
}

/** Chat completion that requests a JSON object response (OpenAI-compatible). */
export async function chatJson(model: string, messages: ChatMessage[]): Promise<string> {
  const c = await resolveConfig();
  if (!c.apiKey) {
    throw new Error("Ingen AI-nyckel konfigurerad. Ange den i adminverktyget under AI-inställningar.");
  }
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(`${c.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${c.apiKey}` },
      body: JSON.stringify({ model, messages, response_format: { type: "json_object" } }),
    });
    if (res.ok) {
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return data.choices?.[0]?.message?.content ?? "";
    }
    // Some providers/models reject response_format; fall back to plain chat.
    if (res.status === 400) return chat(model, messages);
    if (res.status === 429 && attempt < maxAttempts) {
      const ra = Number(res.headers.get("retry-after"));
      const waitMs = Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 8000) : attempt * 2500;
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    if (res.status === 429) throw new Error(QUOTA_MESSAGE);
    const text = await res.text();
    throw new Error(`AI-anrop misslyckades: ${res.status} ${res.statusText} ${text}`);
  }
  throw new Error(QUOTA_MESSAGE);
}
