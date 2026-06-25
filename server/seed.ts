/**
 * Auto-seed default CMS data with INSERT IGNORE semantics.
 * Runs once at server startup; never overwrites edited rows.
 */
import { getDb } from "./db";
import { articles, cmsContent, cmsFaq, cmsStyles, services } from "../drizzle/schema";
import { sql } from "drizzle-orm";
import { ARTICLES } from "./articles-seed";
import { YRKES_ARTICLES } from "./articles-yrken-seed";
import { YRKES2_ARTICLES } from "./articles-yrken2-seed";

type ServiceSeed = {
  slug: string;
  category: "job" | "private";
  promptKey: string;
  hasAdjustments: boolean;
  maxRounds: number;
  acceptsAnnons: boolean;
  sortOrder: number;
  active?: boolean;
};

const SERVICES: ServiceSeed[] = [
  { slug: "cv-anpassning", category: "job", promptKey: "cv_anpassning", hasAdjustments: false, maxRounds: 0, acceptsAnnons: true, sortOrder: 1 },
  { slug: "linkedin-makeover", category: "job", promptKey: "linkedin_makeover", hasAdjustments: true, maxRounds: 3, acceptsAnnons: false, sortOrder: 2 },
  { slug: "cv-granskning", category: "job", promptKey: "cv_granskning", hasAdjustments: true, maxRounds: 3, acceptsAnnons: false, sortOrder: 3 },
  { slug: "intervju", category: "job", promptKey: "intervju", hasAdjustments: false, maxRounds: 0, acceptsAnnons: true, sortOrder: 4 },
  // Privatlivstjänster är flyttade till ett separat repo: mikroappar-privatliv.
];

const ABOUT_BODY = `Tanken bakom CV-piloten har funnits länge. Den växte fram ur en enkel iakttagelse: alldeles för många kompetenta människor fastnar i jobbsöket, inte för att de saknar förmåga, utan för att de inte får fram vad de kan på ett papper. Ett rörigt CV eller ett svagt brev kan stänga en dörr som egentligen borde stått öppen. Det kändes fel, och det kändes som något vi faktiskt kunde göra något åt.

## Ett jobb är mer än en lön

Vi tror att arbete är en av de viktigaste vägarna in i samhället. Ett jobb ger inkomst, men det ger också något svårare att mäta. Det ger en plats att gå till, kollegor att prata med och en känsla av att behövas. Det ger en anledning att gå upp på morgonen och ett sammanhang att vara en del av. För många är det också vägen till språk, nätverk och tillhörighet i ett nytt land.

När människor står utanför arbetsmarknaden förlorar vi alla något. Den enskilde förlorar trygghet och självkänsla, och samhället förlorar kompetens och kraft. Arbetslöshet är ett verkligt samhällsproblem, och vi ville bygga något som drar åt rätt håll, även om det är en liten del av en större helhet.

## Därför byggde vi CV-piloten

Vi ville göra något som skapar värde på riktigt, inte ännu en tjänst för att fylla en lucka i marknaden. CV-piloten är vårt sätt att sänka tröskeln. Vi tar det vi kan om hur rekrytering fungerar och gör det tillgängligt för alla, inte bara för dem som har råd med en konsult eller känner någon som kan läsa igenom ansökan.

Idén är att hjälpen ska vara enkel, snabb och prisvärd. Du laddar upp ditt underlag och får tillbaka ett genomarbetat resultat, oavsett om det gäller ett CV, ett personligt brev eller förberedelser inför en intervju. Tekniken arbetar i bakgrunden, men det är erfarenheten av vad som faktiskt fungerar i rekrytering som styr.

## Vad vi vill åstadkomma

Vårt mål är att fler ska ta sig till intervju och vidare till jobb. Varje ansökan som blir tydligare, varje person som känner sig lite mer förberedd inför en intervju, är ett steg i rätt riktning. Vi mäter inte framgång i antal sålda tjänster, utan i hur många som kommer närmare ett arbete.

Det här är bara början. Vår ambition är att fortsätta bygga verktyg som gör vägen in på arbetsmarknaden kortare och rakare, för så många som möjligt.`;

// textKey -> [label, defaultContent, category]
const TEXTS: [string, string, string, string][] = [
  ["brand.name", "Varumärkesnamn", "CV-piloten", "brand"],
  ["hero.eyebrow", "Hero etikett", "Erfarenhet och teknik", "hero"],
  ["hero.title", "Hero rubrik", "Ett vassare CV på några minuter", "hero"],
  ["hero.subtitle", "Hero underrubrik", "Vi hjälper dig skriva CV, personligt brev och mer. Du laddar upp ditt underlag och får tillbaka ett genomarbetat resultat. Du betalar en gång och slipper abonnemang.", "hero"],
  ["hero.cta", "Hero knapp", "Se tjänsterna", "hero"],
  ["trust.title", "Trust rubrik", "Byggt på erfarenhet, inte gissningar", "trust"],
  ["trust.point1", "Trust punkt 1", "Varje tjänst bygger på hur rekryterare faktiskt läser och bedömer ansökningar.", "trust"],
  ["trust.point2", "Trust punkt 2", "Du betalar 49 kr per tjänst, en gång. Inga abonnemang och inga dolda avgifter.", "trust"],
  ["trust.point3", "Trust punkt 3", "Dina dokument används bara för din beställning och hanteras konfidentiellt.", "trust"],
  ["services.title", "Tjänster rubrik", "Våra tjänster", "services"],
  ["services.subtitle", "Tjänster underrubrik", "Välj det du behöver hjälp med. Vi anpassar varje leverans efter ditt underlag.", "services"],
  // Job services
  ["service.cv-anpassning.title", "CV-anpassning titel", "Skräddarsydd ansökan", "service"],
  ["service.cv-anpassning.tagline", "CV-anpassning kort", "Anpassa ditt CV och brev exakt mot en specifik jobbannons.", "service"],
  ["service.cv-anpassning.desc", "CV-anpassning beskrivning", "Ladda upp ditt CV och klistra in jobbannonsen. Du får tillbaka ett CV och ett personligt brev som är anpassade efter tjänsten, med de ord och krav som annonsen efterfrågar.", "service"],
  ["service.linkedin-makeover.title", "LinkedIn titel", "LinkedIn Makeover", "service"],
  ["service.linkedin-makeover.tagline", "LinkedIn kort", "En sökbar, övertygande profil byggd på ditt CV.", "service"],
  ["service.linkedin-makeover.desc", "LinkedIn beskrivning", "Du får en ny rubrik, en Om mig-text, punkter för dina roller och förslag på kompetenser. Tre justeringsrundor ingår så att profilen blir som du vill ha den.", "service"],
  ["service.cv-granskning.title", "CV-granskning titel", "CV-Granskaren", "service"],
  ["service.cv-granskning.tagline", "CV-granskning kort", "Ärlig feedback ur rekryterarens perspektiv.", "service"],
  ["service.cv-granskning.desc", "CV-granskning beskrivning", "Du får en genomgång som visar vad som fungerar i ditt CV, vad som håller dig tillbaka och vad du bör ändra. Tre justeringsrundor ingår.", "service"],
  ["service.intervju.title", "Intervju titel", "Intervjusimulatorn", "service"],
  ["service.intervju.tagline", "Intervju kort", "De tio mest sannolika frågorna, med svarsstrategier.", "service"],
  ["service.intervju.desc", "Intervju beskrivning", "Utifrån ditt CV och tjänsten du söker får du de frågor som troligen kommer, hur du kan svara på dem och några frågor du själv kan ställa.", "service"],
  ["footer.tagline", "Footer text", "Dokumenttjänster som hjälper dig vidare i jobbsöket.", "footer"],
  ["about.title", "Om oss rubrik", "Om CV-piloten", "about"],
  ["about.body", "Om oss brödtext", ABOUT_BODY, "about"],
];

const FAQS: [string, string, number][] = [
  ["Vad kostar en tjänst?", "Varje tjänst kostar 49 kr och du betalar en gång. Du binder inte upp dig på något abonnemang.", 1],
  ["Vilka filformat kan jag ladda upp?", "Du kan ladda upp PDF, DOC, DOCX och TXT. En bild eller ett inskannat dokument utan läsbar text går inte att behandla.", 2],
  ["Vad menas med justeringsrundor?", "I CV-Granskaren och LinkedIn Makeover kan du be om ändringar tre gånger. Därefter låses resultatet.", 3],
  ["Hur hanteras mina dokument?", "Vi använder ditt underlag bara för att leverera din beställning, och vi hanterar det konfidentiellt.", 4],
  ["När får jag mitt resultat?", "Du får resultatet direkt när betalningen är bekräftad, oftast inom en minut.", 5],
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
        .values({ slug: s.slug, category: s.category, priceSek: 49, promptKey: s.promptKey, hasAdjustments: s.hasAdjustments, maxRounds: s.maxRounds, acceptsAnnons: s.acceptsAnnons, sortOrder: s.sortOrder, active: s.active ?? true })
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

    const allArticles: (typeof ARTICLES[number] & { answerBlock?: string })[] = [
      ...ARTICLES,
      ...YRKES_ARTICLES,
      ...YRKES2_ARTICLES,
    ];
    for (const a of allArticles) {
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
          answerBlock: a.answerBlock ?? null,
          relatedSlugs: a.relatedSlugs,
          ctaServiceSlug: a.ctaServiceSlug,
          faqJson: a.faqJson || null,
          sortOrder: a.sortOrder,
          isDraft: false,
          publishedAt: new Date(),
        })
        // Backfill answerBlock on existing rows (idempotent for the rest).
        .onDuplicateKeyUpdate({ set: { answerBlock: a.answerBlock ?? null } });
    }

    seeded = true;
    console.log("[seed] CMS defaults ensured");
  } catch (e) {
    console.error("[seed] failed", e);
  }
}
