import type { ArticleSeed } from "./articles-seed";

/**
 * Profession-specific "CV-exempel [yrke]" guides. These target long-tail
 * searches like "cv exempel sjuksköterska". Written for humans, plain Swedish.
 */
type Yrke = {
  slug: string;
  yrke: string;
  keyword: string;
  intro: string;
  styrkor: string;
  format: string;
};

const YRKEN: Yrke[] = [
  {
    slug: "cv-exempel-sjukskoterska",
    yrke: "sjuksköterska",
    keyword: "cv exempel sjuksköterska",
    intro:
      "Som sjuksköterska konkurrerar du ofta om tjänster där legitimation, specialistinriktning och erfarenhet av olika vårdmiljöer väger tungt. Ett bra CV gör det lätt för en vårdchef att snabbt se att du har rätt kompetens.",
    styrkor:
      "Lyft fram din legitimation och eventuell specialistutbildning högt upp. Beskriv vilka avdelningar och patientgrupper du arbetat med, och var konkret om ansvar, som att du handlett nya kollegor eller ansvarat för läkemedelshantering.",
    format:
      "Håll CV:t till en eller två sidor. Sätt legitimation, specialitet och erfarenhet överst. Var tydlig med datum för anställningar, eftersom vården ofta värderar sammanhängande erfarenhet.",
  },
  {
    slug: "cv-exempel-lagerarbetare",
    yrke: "lagerarbetare",
    keyword: "cv exempel lagerarbetare",
    intro:
      "För lagerjobb tittar arbetsgivaren ofta efter att du är pålitlig, kan jobba i högt tempo och har erfarenhet av truck eller plocksystem. Ett enkelt och tydligt CV slår ett rörigt varje gång.",
    styrkor:
      "Nämn truckkort och vilka trucktyper du kört. Ta upp erfarenhet av plock, pack, inventering och vanliga affärssystem. Om du har hållit hög plocktakt eller låg felmarginal, skriv det med siffror.",
    format:
      "En sida räcker oftast. Sätt truckkort och praktisk erfarenhet överst. Skriv kort och konkret, och ta med tillgänglighet om du kan jobba skift.",
  },
  {
    slug: "cv-exempel-ekonom",
    yrke: "ekonom",
    keyword: "cv exempel ekonom",
    intro:
      "Som ekonom bedöms du på utbildning, system du behärskar och vilken typ av ekonomiskt arbete du utfört. Rekryteraren vill snabbt se om du passar för rollen, från redovisning till controlling.",
    styrkor:
      "Var tydlig med din inriktning, till exempel redovisning, lön eller analys. Lista affärssystem och Excel-nivå. Beskriv konkreta uppgifter som månadsbokslut, budgetarbete eller rapportering, gärna med omfattning.",
    format:
      "En till två sidor. Sätt utbildning och systemkunskap överst, följt av erfarenhet i omvänd kronologisk ordning. Använd ekonomitermer som matchar annonsen.",
  },
  {
    slug: "cv-exempel-forskollarare",
    yrke: "förskollärare",
    keyword: "cv exempel förskollärare",
    intro:
      "Som förskollärare väger legitimation, pedagogisk erfarenhet och din syn på barns lärande tungt. Ett CV som visar både formell behörighet och praktisk erfarenhet hjälper dig vidare.",
    styrkor:
      "Lyft fram legitimation och examen tidigt. Beskriv åldersgrupper du arbetat med och pedagogiska projekt du drivit. Ta gärna med samarbete med vårdnadshavare och kollegor.",
    format:
      "En till två sidor. Sätt behörighet och erfarenhet överst. Skriv konkret om din pedagogiska roll snarare än allmänna fraser.",
  },
  {
    slug: "cv-exempel-saljare",
    yrke: "säljare",
    keyword: "cv exempel säljare",
    intro:
      "För säljroller är resultat allt. Arbetsgivaren vill se att du kan driva affärer och nå mål. Ett CV utan siffror är en missad chans.",
    styrkor:
      "Visa konkreta resultat: försäljningssiffror, måluppfyllnad, nya kunder eller tillväxt på ditt distrikt. Beskriv vilka kundsegment och produkter du sålt, och vilken säljprocess du arbetat i.",
    format:
      "En sida om du kan. Sätt dina starkaste resultat överst, redan i profiltexten. Låt siffrorna synas tydligt i varje roll.",
  },
  {
    slug: "cv-exempel-it-tekniker",
    yrke: "IT-tekniker",
    keyword: "cv exempel it-tekniker",
    intro:
      "Som IT-tekniker bedöms du på vilka system och miljöer du behärskar och hur du löser problem i praktiken. Rekryteraren letar efter konkret teknisk bredd.",
    styrkor:
      "Lista operativsystem, nätverk, hårdvara och supportverktyg du arbetat med. Beskriv typ av support, första eller andra linjen, och ge exempel på problem du löst. Certifikat hör hemma högt upp.",
    format:
      "En till två sidor. Sätt teknisk kompetens och certifikat överst, följt av erfarenhet. Spegla de system som nämns i annonsen.",
  },
  {
    slug: "cv-exempel-underskoterska",
    yrke: "undersköterska",
    keyword: "cv exempel undersköterska",
    intro:
      "Som undersköterska bedöms du på din omvårdnadserfarenhet, vilka verksamheter du arbetat i och hur du bemöter patienter och boende. Ett tydligt CV gör det lätt för en chef att se att du passar.",
    styrkor:
      "Lyft fram utbildning och vilka verksamheter du arbetat i, som äldreomsorg, sjukhus eller hemtjänst. Beskriv konkreta arbetsuppgifter och ansvar, och ta med eventuella vidareutbildningar inom till exempel demens eller palliativ vård.",
    format:
      "En sida räcker oftast. Sätt utbildning och erfarenhet överst. Var tydlig med var och hur länge du arbetat, och ta med tillgänglighet för schema och helger.",
  },
  {
    slug: "cv-exempel-larare",
    yrke: "lärare",
    keyword: "cv exempel lärare",
    intro:
      "Som lärare väger legitimation, ämnesbehörighet och din pedagogiska erfarenhet tungt. Rektorn vill snabbt se vilka stadier och ämnen du kan undervisa i.",
    styrkor:
      "Sätt legitimation och behöriga ämnen och stadier högt upp. Beskriv klasser och åldrar du undervisat, och ta med mentorskap, utvecklingsarbete eller digitala verktyg du använt i undervisningen.",
    format:
      "En till två sidor. Sätt behörighet överst, följt av erfarenhet i omvänd kronologisk ordning. Var konkret om ämnen och stadier.",
  },
  {
    slug: "cv-exempel-projektledare",
    yrke: "projektledare",
    keyword: "cv exempel projektledare",
    intro:
      "Som projektledare bedöms du på vilka projekt du drivit, deras storlek och vilka resultat du nått. Arbetsgivaren letar efter någon som kan hålla ihop tid, budget och team.",
    styrkor:
      "Beskriv projekt du lett med konkreta siffror: budget, antal personer, tidsram och resultat. Nämn metoder du arbetat i, som agilt eller vattenfall, och verktyg du använt. Visa att du levererat i mål.",
    format:
      "En till två sidor. Sätt dina starkaste projekt och resultat överst. Låt siffror och utfall synas i varje uppdrag.",
  },
  {
    slug: "cv-exempel-snickare",
    yrke: "snickare",
    keyword: "cv exempel snickare",
    intro:
      "Som snickare bedöms du på din yrkeserfarenhet, vilka typer av projekt du arbetat med och eventuella certifikat. Ett enkelt CV som visar vad du faktiskt byggt slår ett rörigt.",
    styrkor:
      "Beskriv vilka typer av arbeten du utfört, som nybyggnation, renovering eller stommontage. Ta med behörigheter och certifikat, som heta arbeten eller ställningsbygge, och nämn körkort om du har.",
    format:
      "En sida räcker oftast. Sätt yrkeserfarenhet och certifikat överst. Skriv konkret om vad du byggt och var, och ta med referenser om du kan.",
  },
  {
    slug: "cv-exempel-utan-erfarenhet",
    yrke: "dig utan tidigare erfarenhet",
    keyword: "cv utan erfarenhet",
    intro:
      "Att skriva CV utan tidigare jobb känns svårt, men du har mer att visa än du tror. Skola, projekt, praktik och ideellt arbete säger en del om vem du är.",
    styrkor:
      "Lyft fram utbildning, kurser och projekt. Ta med praktik, sommarjobb, föreningsuppdrag och annat som visar ansvar och initiativ. Beskriv vad du faktiskt gjorde, inte bara att du var med.",
    format:
      "En sida räcker gott. Sätt utbildning och projekt överst eftersom det är dina starkaste kort. Skriv en profiltext som visar din motivation och vad du vill bidra med.",
  },
];

export const YRKES_ARTICLES: ArticleSeed[] = YRKEN.map((y, i) => ({
  slug: y.slug,
  kind: "cluster",
  title: `CV-exempel ${y.yrke}: så skriver du ett CV som ${y.yrke === "dig utan tidigare erfarenhet" ? "öppnar dörrar" : "passar rollen"}`,
  metaTitle: `CV-exempel ${y.yrke} 2026 – mall och tips som ger intervju`,
  metaDescription: `Konkret CV-exempel för ${y.yrke}. Så lyfter du fram rätt kompetens, väljer format och skriver ett CV som tar dig vidare till intervju.`,
  excerpt: `Så skriver du ett CV som ${y.yrke}: vad du ska lyfta fram, hur du väljer format och vad rekryteraren letar efter.`,
  keyword: y.keyword,
  relatedSlugs: "skriva-cv,cv-mall,cv-granskning",
  ctaServiceSlug: "cv-granskning",
  faqJson: null,
  sortOrder: 20 + i,
  body: `${y.intro}

## Vad du ska lyfta fram

${y.styrkor}

## Format och upplägg

${y.format}

## Skriv med resultat, inte bara uppgifter

Oavsett yrke gäller samma grundregel. Beskriv vad du faktiskt åstadkom, inte bara vilka uppgifter du hade. En mening som visar ett resultat säger mer än en lång lista med ansvarsområden. Försök sätta siffror där det går.

## Anpassa efter annonsen

Läs jobbannonsen noga och spegla de ord och krav som står där, så länge de stämmer med din erfarenhet. Många arbetsgivare använder system som söker efter nyckelord, så rätt formuleringar hjälper dig förbi den första gallringen.

När du har ett utkast kan du låta CV-Granskaren gå igenom det och ge konkret feedback på vad som håller och vad som bör skärpas.`,
}));
