/**
 * Humanizer rules and deterministic cleanup applied to all AI output.
 * Keeps generated text sounding human and free of common AI tells.
 */

export const HUMANIZER_RULES = `
Skriv som en människa, på naturlig och enkel svenska.
- Använd aldrig tankstreck (— eller –) i brödtext. Använd punkt, komma eller kolon i stället.
- Undvik typiska AI-ord och fraser (avgörande, dyk ner i, robust, sömlös, i en värld där, det är värt att notera, i dagens snabbrörliga).
- Tvinga inte in saker i grupper om tre för att låta heltäckande.
- Variera meningslängden. Blanda korta och längre meningar.
- Var konkret och rak. Undvik tomma fraser, överord och säljspråk.
- Behåll allt sakinnehåll. Ändra bara språket, inte fakta eller struktur.
`.trim();

// Deterministic final pass. No AI call. Catches anything that slipped through.
export function stripAiTells(text: string): string {
  return text
    // spaced em/en dash used as an aside -> comma
    .replace(/\s+[—–]\s+/g, ", ")
    // any remaining em/en dash -> comma
    .replace(/[—–]/g, ", ")
    // collapse accidental double spaces
    .replace(/ {2,}/g, " ")
    // tidy " ," produced by replacements
    .replace(/\s+,/g, ",");
}

/**
 * Whether a service's output is user-facing copy that should be humanized
 * with the extra LLM pass. Analyses (review/interview) skip the LLM pass to
 * save cost but still get the deterministic cleanup.
 */
export function needsHumanizerPass(promptKey: string): boolean {
  return ["cv_anpassning", "linkedin_makeover"].includes(promptKey);
}
