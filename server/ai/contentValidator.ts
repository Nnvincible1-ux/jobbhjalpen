/**
 * Cheap, fast pre-payment content validation. Confirms that the uploaded
 * document looks like what the service expects (e.g. a CV), and that any pasted
 * ad text looks like a real job ad. Runs BEFORE payment so users are not charged
 * for the wrong input. Uses the humanizer/cheap model, low token budget.
 */
import { chatJson, getModels } from "./provider";

export type ValidationVerdict = {
  ok: boolean;
  /** Which part failed, for a targeted message. */
  problem?: "document" | "annons";
  message?: string;
};

/** What each service expects the uploaded document to be. */
const EXPECTED_DOC: Record<string, string> = {
  cv_anpassning: "ett CV/meritförteckning",
  linkedin_makeover: "ett CV eller en LinkedIn-/profiltext",
  cv_granskning: "ett CV/meritförteckning",
  intervju: "ett CV/meritförteckning",
};

/** Services that also require a job ad as context. */
const REQUIRES_ANNONS = new Set(["cv_anpassning"]);

// Truncate long inputs; the classifier only needs the top of the document.
function head(text: string, max = 2500): string {
  return (text || "").slice(0, max);
}

/**
 * Ask the model to classify the input. Returns ok=true when the document looks
 * like the expected type (and the ad looks like an ad, when required).
 * Fails "open" (ok=true) on any model/parse error so a flaky classifier never
 * blocks a legitimate paying user.
 */
export async function validateContent(
  promptKey: string,
  documentText: string,
  annonsText?: string | null
): Promise<ValidationVerdict> {
  const expected = EXPECTED_DOC[promptKey] ?? "ett relevant dokument";
  const needsAnnons = REQUIRES_ANNONS.has(promptKey);

  const system = [
    "Du är en snabb klassificerare. Avgör om texterna är av rätt typ.",
    "Svara ENDAST med JSON: {\"documentIsExpected\": boolean, \"annonsIsJobAd\": boolean, \"reason\": string}.",
    `Dokumentet FÖRVÄNTAS vara: ${expected}.`,
    "documentIsExpected = true om dokumentet rimligen är av den förväntade typen (var tillåtande; delvisa/ofullständiga CV:n räknas som CV).",
    needsAnnons
      ? "annonsIsJobAd = true om annonstexten rimligen är en jobbannons/platsannons (roll, krav, arbetsuppgifter e.d.)."
      : "annonsIsJobAd = true alltid (ingen annons krävs för denna tjänst).",
  ].join("\n");

  const user =
    `DOKUMENT (början):\n${head(documentText)}\n\n` +
    (needsAnnons ? `ANNONSTEXT:\n${head(annonsText || "", 1500) || "(tom)"}` : "(ingen annons krävs)");

  try {
    const { humanizer } = await getModels();
    const raw = await chatJson(humanizer, [
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const o = JSON.parse(cleaned) as {
      documentIsExpected?: boolean;
      annonsIsJobAd?: boolean;
      reason?: string;
    };

    if (o.documentIsExpected === false) {
      return {
        ok: false,
        problem: "document",
        message: `Det du laddade upp verkar inte vara ${expected}. Ladda upp rätt dokument och försök igen.`,
      };
    }
    if (needsAnnons && o.annonsIsJobAd === false) {
      return {
        ok: false,
        problem: "annons",
        message:
          "Texten du klistrade in verkar inte vara en jobbannons. Klistra in själva annonsen (roll, krav, arbetsuppgifter) och försök igen.",
      };
    }
    return { ok: true };
  } catch (e) {
    console.warn("[contentValidator] failed, allowing through:", e);
    return { ok: true }; // fail open
  }
}
