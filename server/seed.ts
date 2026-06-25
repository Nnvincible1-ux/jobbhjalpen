/**
 * Auto-seed default CMS data with INSERT IGNORE semantics.
 * Runs once at server startup; never overwrites edited rows.
 */
import { getDb } from "./db";
import { articles, cmsContent, cmsFaq, cmsStyles, services } from "../drizzle/schema";
import { sql } from "drizzle-orm";
import { ARTICLES } from "./articles-seed";

type ServiceSeed = {
  slug: string;
  category: "job" | "private";
  promptKey: string;
  hasAdjustments: boolean;
  maxRounds: number;
  acceptsAnnons: boolean;
  sortOrder: number;
};

const SERVICES: ServiceSeed[] = [
  { slug: "cv-anpassning", category: "job", promptKey: "cv_anpassning", hasAdjustments: false, maxRounds: 0, acceptsAnnons: true, sortOrder: 1 },
  { slug: "linkedin-makeover", category: "job", promptKey: "linkedin_makeover", hasAdjustments: true, maxRounds: 3, acceptsAnnons: false, sortOrder: 2 },
  { slug: "cv-granskning", category: "job", promptKey: "cv_granskning", hasAdjustments: true, maxRounds: 3, acceptsAnnons: false, sortOrder: 3 },
  { slug: "intervju", category: "job", promptKey: "intervju", hasAdjustments: false, maxRounds: 0, acceptsAnnons: true, sortOrder: 4 },
  { slug: "brf-analys", category: "private", promptKey: "brf_analys", hasAdjustments: false, maxRounds: 0, acceptsAnnons: false, sortOrder: 5 },
  { slug: "avtal-granskning", category: "private", promptKey: "avtal_granskning", hasAdjustments: false, maxRounds: 0, acceptsAnnons: false, sortOrder: 6 },
  { slug: "overklagande", category: "private", promptKey: "overklagande", hasAdjustments: false, maxRounds: 0, acceptsAnnons: false, sortOrder: 7 },
];

// textKey -> [label, defaultContent, category]
const TEXTS: [string, string, string, string][] = [
  ["brand.name", "Varumärkesnamn", "Jobbhjälpen", "brand"],
  ["hero.eyebrow", "Hero etikett", "Expertis möter teknik", "hero"],
  ["hero.title", "Hero rubrik", "Vassa dokument. Färdiga på minuter.", "hero"],
  ["hero.subtitle", "Hero underrubrik", "Sju specialiserade tjänster byggda på rekryterings- och avtalsexpertis. Du laddar upp ditt underlag, vi levererar ett genomarbetat resultat. Engångspris, ingen prenumeration.", "hero"],
  ["hero.cta", "Hero knapp", "Se tjänsterna", "hero"],
  ["trust.title", "Trust rubrik", "Byggt på erfarenhet, inte gissningar", "trust"],
  ["trust.point1", "Trust punkt 1", "Varje tjänst utgår från beprövade metoder inom rekrytering, ekonomi och avtal.", "trust"],
  ["trust.point2", "Trust punkt 2", "Fast pris på 49 kr per tjänst. Inga abonnemang, inga dolda avgifter.", "trust"],
  ["trust.point3", "Trust punkt 3", "Dina dokument behandlas konfidentiellt och används bara för din beställning.", "trust"],
  ["services.title", "Tjänster rubrik", "Våra tjänster", "services"],
  ["services.subtitle", "Tjänster underrubrik", "Välj den hjälp du behöver. Varje leverans är skräddarsydd efter ditt underlag.", "services"],
  // Job services
  ["service.cv-anpassning.title", "CV-anpassning titel", "Skräddarsydd ansökan", "service"],
  ["service.cv-anpassning.tagline", "CV-anpassning kort", "Anpassa ditt CV och brev exakt mot en specifik jobbannons.", "service"],
  ["service.cv-anpassning.desc", "CV-anpassning beskrivning", "Ladda upp ditt CV och klistra in jobbannonsen. Du får ett omskrivet, ATS-vänligt CV och ett personligt brev som matchar tjänstens nyckelord och krav.", "service"],
  ["service.linkedin-makeover.title", "LinkedIn titel", "LinkedIn Makeover", "service"],
  ["service.linkedin-makeover.tagline", "LinkedIn kort", "En sökbar, övertygande profil byggd på ditt CV.", "service"],
  ["service.linkedin-makeover.desc", "LinkedIn beskrivning", "Vi tar fram rubrik, Om mig-text, erfarenhetspunkter och nyckelkompetenser. Ingår tre justeringsrundor så att profilen blir helt din.", "service"],
  ["service.cv-granskning.title", "CV-granskning titel", "CV-Granskaren", "service"],
  ["service.cv-granskning.tagline", "CV-granskning kort", "Ärlig feedback ur rekryterarens perspektiv.", "service"],
  ["service.cv-granskning.desc", "CV-granskning beskrivning", "En strukturerad granskning som visar vad som fungerar, vad som stoppar dig och exakt vad du bör ändra. Ingår tre justeringsrundor.", "service"],
  ["service.intervju.title", "Intervju titel", "Intervjusimulatorn", "service"],
  ["service.intervju.tagline", "Intervju kort", "De tio mest sannolika frågorna, med svarsstrategier.", "service"],
  ["service.intervju.desc", "Intervju beskrivning", "Utifrån ditt CV och tjänsten du söker får du de mest troliga intervjufrågorna, hur du bäst besvarar dem och tre frågor att ställa själv.", "service"],
  // Private services
  ["service.brf-analys.title", "BRF titel", "BRF-Granskaren", "service"],
  ["service.brf-analys.tagline", "BRF kort", "Förstå föreningens ekonomi innan du köper.", "service"],
  ["service.brf-analys.desc", "BRF beskrivning", "Ladda upp årsredovisningen och få en trafikljusbedömning av föreningens ekonomi, nyckeltal, risker och tre frågor att ställa till mäklaren.", "service"],
  ["service.avtal-granskning.title", "Avtal titel", "Avtalskollen", "service"],
  ["service.avtal-granskning.tagline", "Avtal kort", "Hitta fallgroparna innan du skriver under.", "service"],
  ["service.avtal-granskning.desc", "Avtal beskrivning", "Ladda upp avtalet eller köpekontraktet och få en genomgång av risker, dolda avgifter och förslag på skyddande tillägg ur ditt perspektiv.", "service"],
  ["service.overklagande.title", "Överklagande titel", "Överklagande-assistenten", "service"],
  ["service.overklagande.tagline", "Överklagande kort", "Ett sakligt, korrekt formulerat överklagande.", "service"],
  ["service.overklagande.desc", "Överklagande beskrivning", "Beskriv ärendet och ladda upp beslutet. Du får ett formellt överklagande med tydligt yrkande och motivering, redo att signera.", "service"],
  ["footer.tagline", "Footer text", "Specialiserade dokumenttjänster för jobbsök och privatliv.", "footer"],
];

const FAQS: [string, string, number][] = [
  ["Vad kostar en tjänst?", "Varje tjänst är ett engångsköp för 49 kr. Det finns inga abonnemang eller dolda avgifter.", 1],
  ["Vilka filformat kan jag ladda upp?", "Du kan ladda upp PDF-, DOC-, DOCX- och TXT-filer. Bilder och inskannade dokument utan läsbar text kan inte behandlas.", 2],
  ["Vad menas med justeringsrundor?", "CV-Granskaren och LinkedIn Makeover innehåller tre justeringsrundor. Du kan be om ändringar tre gånger innan resultatet låses.", 3],
  ["Hur hanteras mina dokument?", "Ditt underlag används enbart för att leverera din beställning och behandlas konfidentiellt.", 4],
  ["När får jag mitt resultat?", "Resultatet genereras direkt efter att betalningen bekräftats, oftast inom någon minut.", 5],
];

const STYLES: { key: string; value: string; label: string; cssVar: string; category: string; inputType: string; sort: number }[] = [
  { key: "color.primary", value: "#1a2e3b", label: "Primärfärg", cssVar: "--brand-primary", category: "colors", inputType: "color", sort: 1 },
  { key: "color.accent", value: "#c8a45c", label: "Accentfärg", cssVar: "--brand-accent", category: "colors", inputType: "color", sort: 2 },
  { key: "color.bg", value: "#faf8f4", label: "Bakgrund", cssVar: "--brand-bg", category: "colors", inputType: "color", sort: 3 },
  { key: "color.ink", value: "#21201d", label: "Textfärg", cssVar: "--brand-ink", category: "colors", inputType: "color", sort: 4 },
];

let seeded = false;

export async function seedDefaults(): Promise<void> {
  if (seeded) return;
  const db = await getDb();
  if (!db) return;

  try {
    for (const s of SERVICES) {
      await db
        .insert(services)
        .values({ slug: s.slug, category: s.category, priceSek: 49, promptKey: s.promptKey, hasAdjustments: s.hasAdjustments, maxRounds: s.maxRounds, acceptsAnnons: s.acceptsAnnons, sortOrder: s.sortOrder })
        .onDuplicateKeyUpdate({ set: { slug: sql`slug` } }); // no-op = INSERT IGNORE
    }

    for (const [textKey, label, content, category] of TEXTS) {
      await db
        .insert(cmsContent)
        .values({ textKey, label, content, defaultContent: content, category, isDraft: false })
        .onDuplicateKeyUpdate({ set: { textKey: sql`textKey` } });
    }

    // FAQ has no natural unique key; seed only if empty.
    const existingFaq = await db.select().from(cmsFaq).limit(1);
    if (existingFaq.length === 0) {
      for (const [question, answer, sortOrder] of FAQS) {
        await db.insert(cmsFaq).values({ question, answer, sortOrder, isDraft: false });
      }
    }

    for (const st of STYLES) {
      await db
        .insert(cmsStyles)
        .values({ styleKey: st.key, value: st.value, defaultValue: st.value, label: st.label, cssVar: st.cssVar, category: st.category, inputType: st.inputType, sortOrder: st.sort, isDraft: false })
        .onDuplicateKeyUpdate({ set: { styleKey: sql`styleKey` } });
    }

    for (const a of ARTICLES) {
      await db
        .insert(articles)
        .values({
          slug: a.slug,
          kind: a.kind,
          title: a.title,
          metaTitle: a.metaTitle,
          metaDescription: a.metaDescription,
          excerpt: a.excerpt,
          body: a.body,
          keyword: a.keyword,
          relatedSlugs: a.relatedSlugs,
          ctaServiceSlug: a.ctaServiceSlug,
          faqJson: a.faqJson,
          sortOrder: a.sortOrder,
          isDraft: false,
          publishedAt: new Date(),
        })
        .onDuplicateKeyUpdate({ set: { slug: sql`slug` } });
    }

    seeded = true;
    console.log("[seed] CMS defaults ensured");
  } catch (e) {
    console.error("[seed] failed", e);
  }
}
