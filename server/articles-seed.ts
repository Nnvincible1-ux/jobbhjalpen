/**
 * SEO article seed data (Swedish). CMS-editable after seeding.
 * Written for humans: no em dashes, plain language, search-intent first.
 */
export type ArticleSeed = {
  slug: string;
  kind: "pillar" | "cluster";
  title: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  keyword: string;
  relatedSlugs: string;
  ctaServiceSlug: string | null;
  faqJson: string | null;
  sortOrder: number;
  body: string;
};

export const ARTICLES: ArticleSeed[] = [
  {
    slug: "skriva-cv",
    kind: "pillar",
    title: "Skriva CV: så bygger du ett CV som ger intervju",
    metaTitle: "Skriva CV 2026 – komplett guide som ger fler intervjuer",
    metaDescription:
      "Lär dig skriva ett CV som rekryterare faktiskt läser. Struktur, innehåll, vanliga misstag och en checklista. Få ditt CV granskat på minuter.",
    excerpt:
      "En praktisk guide till hur du skriver ett CV som tar dig vidare till intervju, från struktur och innehåll till de misstag som sorterar bort dig.",
    keyword: "skriva cv",
    relatedSlugs: "cv-mall,cv-exempel,ats-cv,kompetenser-cv",
    ctaServiceSlug: "cv-granskning",
    faqJson: JSON.stringify([
      { q: "Hur långt ska ett CV vara?", a: "För de flesta räcker en till två sidor. Ta med det som är relevant för tjänsten och stryk resten." },
      { q: "Ska jag ha med bild på CV:t?", a: "Det är frivilligt i Sverige. Välj en neutral, professionell bild om du tar med en, annars går det bra utan." },
      { q: "I vilken ordning ska jag lista erfarenhet?", a: "Omvänd kronologisk ordning, alltså senaste jobbet först. Det är vad rekryterare förväntar sig." },
    ]),
    sortOrder: 1,
    body: `Ett CV har egentligen ett enda jobb. Det ska få dig till intervju. Rekryteraren hinner ofta bara titta några sekunder innan hen bildar sig en uppfattning, så det gäller att snabbt visa att du passar. Den här guiden går igenom hur du bygger ett CV som håller, oavsett om det är ditt första jobb eller ett karriärbyte.

## Börja med rätt struktur

De flesta starka CV:n följer samma ordning. Högst upp har du namn, titel och kontaktuppgifter. Direkt under kommer en kort profiltext på tre eller fyra meningar som sammanfattar vem du är och vad du tillför. Därefter listar du arbetslivserfarenhet i omvänd kronologisk ordning, följt av utbildning och relevanta färdigheter.

Anledningen till att den här ordningen fungerar är enkel. Rekryteraren vill snabbt förstå din nuvarande nivå och din senaste erfarenhet. När du börjar med det senaste jobbet får läsaren svaret direkt.

## Skriv en profiltext som säger något

Profiltexten läses först, så den förtjänar lite extra tid. Hoppa över tomma fraser av typen "driven lagspelare med god samarbetsförmåga". Sådant kunde stå på vems CV som helst. Skriv i stället vad du faktiskt gör och vad du har åstadkommit. En utvecklare kan berätta att hen byggt tjänster som hanterar tusentals användare. En säljare kan nämna att hen ökade försäljningen på sitt distrikt med en tydlig siffra. Det konkreta fastnar, det generella glider förbi.

## Beskriv erfarenhet med resultat, inte bara uppgifter

Det vanligaste misstaget är att lista arbetsuppgifter. "Ansvarade för kundtjänst" säger ingenting om hur bra du var. Beskriv i stället vad du faktiskt uppnådde. Hur många ärenden hanterade du, vilken kundnöjdhet hade du, vad förbättrade du. Siffror och resultat gör skillnad eftersom de är jämförbara och trovärdiga.

## Anpassa CV:t efter varje tjänst

Ett generellt CV som skickas till alla jobb presterar sämre än ett som är anpassat efter annonsen. Läs annonsen noga och lyft fram den erfarenhet och de ord som matchar kraven. Det handlar inte om att hitta på, utan om att prioritera rätt saker överst. Många företag använder dessutom system som söker efter nyckelord, vilket gör anpassningen ännu viktigare.

## Undvik de vanligaste misstagen

Stavfel och slarvig formatering ger ett intryck av att du inte brydde dig, även om du gjorde det. Långa textstycken gör CV:t jobbigt att läsa, och gamla uppgifter som inte längre är relevanta tar plats från det som faktiskt spelar roll. Läs igenom med kritiska ögon, eller be någon annan läsa, innan du skickar.

## Checklista innan du skickar

Kontrollera att kontaktuppgifterna stämmer, att erfarenheten står i rätt ordning, att profiltexten är konkret och att dokumentet är fritt från stavfel. Se till att det är anpassat efter tjänsten du söker och att det går att läsa på några sekunder.

När du vill ha en objektiv bedömning kan du låta CV-Granskaren gå igenom ditt CV ur en rekryterares perspektiv och peka ut exakt vad som bör ändras.`,
  },
  {
    slug: "cv-mall",
    kind: "cluster",
    title: "CV-mall: välj rätt mall för din ansökan",
    metaTitle: "CV-mall 2026 – så väljer du rätt mall för jobbet",
    metaDescription:
      "Hitta rätt CV-mall för din bransch och erfarenhetsnivå. Så väljer du layout, format och struktur som passar tjänsten du söker.",
    excerpt:
      "Vilken CV-mall passar dig? Så väljer du layout och format efter bransch, erfarenhet och hur rekryterare läser.",
    keyword: "cv mall",
    relatedSlugs: "skriva-cv,cv-exempel,ats-cv",
    ctaServiceSlug: "cv-anpassning",
    faqJson: JSON.stringify([
      { q: "Vilken CV-mall är bäst?", a: "Den som är ren, lättläst och passar din bransch. För traditionella yrken välj en stram mall, för kreativa yrken kan du ta en mer visuell." },
      { q: "Fungerar färgglada mallar?", a: "De kan fungera i kreativa branscher, men håll dem läsbara. För de flesta tjänster vinner en enkel och tydlig layout." },
    ]),
    sortOrder: 2,
    body: `Mallen avgör hur ditt CV uppfattas innan ett enda ord har lästs. En rörig layout gör att viktig information drunknar, medan en ren mall låter dina meriter komma fram. Valet av mall handlar därför inte om smak, utan om att göra det lätt för rekryteraren att hitta det som spelar roll.

## Anpassa mallen efter bransch

Olika branscher har olika förväntningar. För ekonomi, juridik och förvaltning passar en stram och klassisk mall som signalerar ordning. För design, marknad och andra kreativa yrken kan en mer visuell mall fungera, så länge den fortfarande är lättläst. När du är osäker är en enkel mall alltid ett säkert val.

## Tänk på erfarenhetsnivå

Den som har lång erfarenhet behöver utrymme för arbetslivshistorik och kan låta den delen ta störst plats. Den som är ny på arbetsmarknaden tjänar på en mall som ger plats åt utbildning, projekt och färdigheter i stället. Mallen ska spegla dina starkaste sidor.

## Format som klarar granskning

Många arbetsgivare använder system som läser av CV:t automatiskt. Mallar med komplicerade tabeller, textrutor och grafik kan ställa till det för sådana system. En mall med tydlig struktur och vanlig text läses korrekt både av människor och av maskiner.

## Gör mallen till din egen

En mall är en utgångspunkt, inte en tvångströja. Fyll den med konkret innehåll och anpassa rubrikerna efter din situation. När du har valt mall och fyllt i dina uppgifter kan du låta oss anpassa innehållet mot en specifik jobbannons, så att rätt nyckelord och meriter hamnar överst.`,
  },
  {
    slug: "cv-exempel",
    kind: "cluster",
    title: "CV-exempel: så ser ett bra CV ut",
    metaTitle: "CV-exempel 2026 – konkreta exempel som ger intervju",
    metaDescription:
      "Se hur ett bra CV ser ut med konkreta exempel på profiltext, erfarenhet och färdigheter. Lär dig vad som skiljer ett starkt CV från ett svagt.",
    excerpt:
      "Konkreta exempel på vad som gör ett CV starkt, från profiltext till hur du beskriver erfarenhet med resultat.",
    keyword: "cv exempel",
    relatedSlugs: "skriva-cv,cv-mall,kompetenser-cv",
    ctaServiceSlug: "cv-granskning",
    faqJson: null,
    sortOrder: 3,
    body: `Det är ofta lättare att förstå vad som gör ett CV bra när man ser ett exempel. Här går vi igenom vad som skiljer en stark formulering från en svag, så att du kan applicera samma tänk på ditt eget CV.

## Profiltext: före och efter

En svag profiltext låter så här: "Ansvarstagande person som gillar att jobba i team och vill utvecklas." Den säger inget specifikt och kunde gälla vem som helst. En starkare version låter så här: "Ekonom med fem års erfarenhet av redovisning för medelstora bolag, van att stänga månadsbokslut och effektivisera rutiner." Den andra varianten ger en tydlig bild av vem du är.

## Erfarenhet: uppgift mot resultat

Jämför "Skötte sociala medier" med "Byggde upp företagets Instagram från noll till 12 000 följare på ett år och ökade trafiken till webben med 40 procent." Den andra formuleringen visar effekt och är mätbar. Försök beskriva dina egna roller på samma sätt, med fokus på vad du åstadkom.

## Färdigheter som är relevanta

Lista inte allt du kan, utan det som är relevant för tjänsten. En lång lista med generiska färdigheter sänker värdet på de viktiga. Välj ut de färdigheter som matchar annonsen och som du faktiskt behärskar.

## Använd exemplen på ditt eget CV

Gå igenom ditt CV stycke för stycke och fråga dig om varje mening säger något konkret. När du vill ha en oberoende bedömning av vad som håller och vad som bör skärpas kan CV-Granskaren ge dig konkret feedback ur en rekryterares perspektiv.`,
  },
];

ARTICLES.push(
  {
    slug: "ats-cv",
    kind: "cluster",
    title: "ATS-CV: så klarar ditt CV de digitala filtren",
    metaTitle: "ATS-CV – så skriver du ett CV som klarar rekryteringssystem",
    metaDescription:
      "Många CV sorteras bort av rekryteringssystem innan en människa ser dem. Så optimerar du ditt CV för ATS utan att tappa läsbarhet.",
    excerpt:
      "Rekryteringssystem läser ditt CV först. Så ser du till att det tar sig förbi filtren och fram till en människa.",
    keyword: "ats cv",
    relatedSlugs: "skriva-cv,cv-mall,cv-anpassning-guide",
    ctaServiceSlug: "cv-anpassning",
    faqJson: JSON.stringify([
      { q: "Vad är ett ATS?", a: "Ett ATS är ett system som arbetsgivare använder för att samla in och sortera ansökningar, ofta genom att söka efter nyckelord." },
      { q: "Hur vet jag vilka nyckelord jag ska använda?", a: "Utgå från jobbannonsen. De ord och krav som nämns där är de du vill spegla i ditt CV." },
    ]),
    sortOrder: 4,
    body: `Innan en rekryterare ens ser ditt CV passerar det ofta ett system som sorterar och rangordnar ansökningar. Om CV:t inte matchar det systemet letar efter kan det sorteras bort, hur kvalificerad du än är. Det betyder inte att du ska lura systemet, utan att du ska göra det lätt för det att förstå att du passar.

## Hur systemen läser ditt CV

Ett rekryteringssystem läser texten i ditt dokument och jämför den med kraven i tjänsten. Det letar efter relevanta ord, titlar och färdigheter. Komplicerad formatering med tabeller, textrutor och bilder kan göra att systemet missar information eller läser den i fel ordning.

## Spegla orden från annonsen

Det enskilt viktigaste du kan göra är att använda samma ord som står i jobbannonsen, förutsatt att de stämmer med din erfarenhet. Står det "projektledning" i annonsen är det den termen du vill använda, inte en synonym. Det handlar inte om att stoppa in ord på måfå, utan om att beskriva din verkliga erfarenhet med rätt begrepp.

## Håll formatet rent

Använd vanliga rubriker som arbetslivserfarenhet och utbildning. Undvik att lägga viktig information i sidhuvud, fotnoter eller bilder. Spara gärna i ett format som både system och människor kan läsa. Ett rent format gynnar dig i båda leden.

## Behåll läsbarheten för människan

Glöm inte att en människa läser CV:t efter systemet. Optimera för nyckelord, men skriv fortfarande text som är tydlig och trevlig att läsa. Det går utmärkt att göra båda samtidigt.

När du laddar upp ditt CV och en jobbannons hos oss anpassar vi automatiskt ditt CV mot annonsens krav och nyckelord, så att det både tar sig förbi filtren och övertygar rekryteraren.`,
  },
  {
    slug: "kompetenser-cv",
    kind: "cluster",
    title: "Kompetenser på CV: vilka du ska ta med och hur",
    metaTitle: "Kompetenser på CV – vilka du ska lyfta fram och hur",
    metaDescription:
      "Vilka kompetenser ska du ta med på CV:t och hur beskriver du dem så att de övertygar? Så väljer du rätt färdigheter för tjänsten.",
    excerpt:
      "Så väljer och formulerar du kompetenser på CV:t så att de stärker din ansökan i stället för att fylla ut.",
    keyword: "kompetenser cv",
    relatedSlugs: "skriva-cv,cv-exempel",
    ctaServiceSlug: "cv-granskning",
    faqJson: null,
    sortOrder: 5,
    body: `Kompetensavsnittet på ett CV blir lätt en lång lista som ingen läser. Rätt använt är det i stället ett snabbt sätt att visa att du har det tjänsten kräver. Skillnaden ligger i vad du tar med och hur du beskriver det.

## Välj kompetenser efter tjänsten

Börja i jobbannonsen. Vilka färdigheter efterfrågas, och vilka av dem har du? De är de du ska lyfta fram. En lång lista med allmänna egenskaper späder ut de viktiga, så var hellre selektiv och relevant än heltäckande.

## Skilj på hårda och mjuka färdigheter

Hårda färdigheter är konkreta och mätbara, som ett programmeringsspråk, ett verktyg eller ett certifikat. Mjuka färdigheter handlar om hur du arbetar, som ledarskap eller kommunikation. Båda har sin plats, men de hårda är ofta lättare att verifiera och bör synas tydligt när tjänsten kräver dem.

## Visa, berätta inte bara

Att skriva "god kommunikationsförmåga" är svagt eftersom alla skriver det. Starkare är att visa kompetensen i erfarenhetsbeskrivningen, till exempel att du höll utbildningar eller ledde möten. Låt färdigheterna återkomma som konkreta exempel där du beskriver vad du gjort.

## Håll listan trovärdig

Ta bara med det du faktiskt behärskar. Om en kompetens kommer upp i en intervju ska du kunna stå för den. En kortare, ärlig lista är värd mer än en lång lista du inte kan backa upp.

Vill du veta om dina kompetenser kommer fram tydligt nog kan CV-Granskaren bedöma hur väl ditt CV matchar den typ av tjänst du söker.`,
  },
  {
    slug: "personligt-brev",
    kind: "pillar",
    title: "Personligt brev: så skriver du ett brev som öppnar dörrar",
    metaTitle: "Personligt brev 2026 – guide och struktur som fungerar",
    metaDescription:
      "Lär dig skriva ett personligt brev som kompletterar ditt CV och övertygar rekryteraren. Struktur, ton och exempel på vad som fungerar.",
    excerpt:
      "En guide till det personliga brevet: hur du fångar intresset, kopplar din erfarenhet till tjänsten och avslutar starkt.",
    keyword: "personligt brev",
    relatedSlugs: "personligt-brev-exempel,skriva-cv",
    ctaServiceSlug: "cv-anpassning",
    faqJson: JSON.stringify([
      { q: "Hur långt ska ett personligt brev vara?", a: "Håll det till en sida. Rekryteraren vill ha det viktigaste, inte en lång berättelse." },
      { q: "Ska jag skriva ett nytt brev för varje jobb?", a: "Ja, åtminstone anpassa det. Ett generellt brev märks och övertygar sällan." },
    ]),
    sortOrder: 6,
    body: `Det personliga brevet är din chans att med egna ord förklara varför just du passar. CV:t visar vad du har gjort. Brevet visar vem du är och varför du söker den här rollen. Här går vi igenom hur du skriver ett brev som faktiskt blir läst och inte bara ögnat igenom.

## Fånga intresset i första stycket

Rekryteraren bestämmer snabbt om brevet är värt att läsa vidare. Inled därför med något konkret om varför du söker just den här tjänsten på just det här företaget. Undvik den slitna inledningen "Jag såg er annons och vill härmed söka tjänsten". Visa i stället att du vet något om rollen och att du är genuint intresserad.

## Koppla din erfarenhet till tjänsten

Mitten av brevet ska binda ihop din bakgrund med kraven i annonsen. Välj ut ett par exempel ur din erfarenhet som visar att du kan det som efterfrågas. Berätta kort om en situation, vad du gjorde och vilket resultat det gav. Det gör brevet konkret och trovärdigt.

## Skriv i din egen röst

Ett personligt brev får låta som du. Det betyder inte slarvigt, men gärna mänskligt och rakt på. Krångliga formuleringar och tomma fraser gör mer skada än nytta. Skriv ungefär som om du satt mittemot rekryteraren och förklarade varför du vill ha jobbet.

## Avsluta med ett tydligt nästa steg

Avsluta med att visa att du ser fram emot att berätta mer, gärna i en intervju. En kort och självsäker avslutning lämnar ett bra sista intryck.

## Anpassa alltid efter tjänsten

Ett brev som skickas oförändrat till flera jobb märks direkt. Lägg den extra tiden på att anpassa innehållet efter varje annons. När du beställer CV-anpassning hos oss ingår ett personligt brev som skräddarsys mot tjänsten du söker, så att CV och brev hänger ihop.`,
  },
  {
    slug: "personligt-brev-exempel",
    kind: "cluster",
    title: "Personligt brev exempel: formuleringar som fungerar",
    metaTitle: "Personligt brev exempel – formuleringar som övertygar",
    metaDescription:
      "Konkreta exempel på hur du formulerar inledning, mitt och avslutning i ett personligt brev. Se vad som fungerar och vad du bör undvika.",
    excerpt:
      "Konkreta exempel på inledningar, brödtext och avslutningar i personliga brev, med vad du bör undvika.",
    keyword: "personligt brev exempel",
    relatedSlugs: "personligt-brev,skriva-cv",
    ctaServiceSlug: "cv-anpassning",
    faqJson: null,
    sortOrder: 7,
    body: `Att se exempel gör det lättare att skriva sitt eget personliga brev. Här går vi igenom formuleringar för de tre viktiga delarna, med både svaga och starka varianter.

## Inledning

Svag inledning: "Jag heter Anna och vill söka tjänsten som ni har annonserat." Den är passiv och säger inget. Starkare: "När jag läste att ni söker en projektledare som vill bygga upp en ny leveransprocess kände jag igen exakt det jag gjorde under mina tre år på mitt nuvarande jobb." Den andra varianten knyter direkt an till rollen.

## Brödtext

Svag brödtext räknar upp egenskaper utan stöd. Starkare brödtext visar dem. I stället för "jag är strukturerad och resultatinriktad" kan du skriva "jag införde en ny planeringsrutin som kortade våra leveranstider med två veckor". Konkreta exempel övertygar.

## Avslutning

Svag avslutning: "Hoppas att ni hör av er." Starkare: "Jag berättar gärna mer om hur jag skulle ta mig an rollen och ser fram emot ett samtal." Den senare är aktiv och självsäker utan att vara påträngande.

## Sätt ihop delarna

Ett bra brev hänger ihop från inledning till avslutning och pekar hela tiden mot tjänsten. När du vill ha ett brev som är skräddarsytt mot en specifik annons kan vi skriva det åt dig som en del av CV-anpassningen.`,
  },
  {
    slug: "intervjufragor",
    kind: "pillar",
    title: "Intervjufrågor: vanliga frågor och hur du svarar",
    metaTitle: "Vanliga intervjufrågor 2026 – och hur du svarar bra",
    metaDescription:
      "De vanligaste intervjufrågorna och hur du svarar på dem så att du sticker ut. Förbered dig med konkreta strategier inför nästa intervju.",
    excerpt:
      "De vanligaste intervjufrågorna och hur du svarar på dem med konkreta exempel, så att du känner dig trygg inför intervjun.",
    keyword: "intervjufrågor",
    relatedSlugs: "skriva-cv,personligt-brev",
    ctaServiceSlug: "intervju",
    faqJson: JSON.stringify([
      { q: "Hur förbereder jag mig bäst inför en intervju?", a: "Gå igenom tjänsten, dina egna exempel och de vanligaste frågorna. Öva på att svara konkret med situation, handling och resultat." },
      { q: "Vad svarar jag på frågan om mina svagheter?", a: "Välj en verklig svaghet och beskriv hur du arbetar med den. Det visar självinsikt utan att skada din kandidatur." },
    ]),
    sortOrder: 8,
    body: `Intervjun är ofta det sista som står mellan dig och jobbet. Det som skiljer en trygg kandidat från en nervös är sällan talang. Det är förberedelse. När du känner igen frågorna och redan har dina exempel klara blir samtalet mycket lättare att ta sig igenom.

## Berätta om dig själv

Den här öppna frågan kommer nästan alltid. Svara inte med hela din livshistoria. Ge en kort sammanfattning av var du är i karriären, vad du är bra på och varför du söker den här rollen. Tre eller fyra meningar räcker, och de sätter tonen för resten av samtalet.

## Varför söker du den här tjänsten

Här vill arbetsgivaren höra att du har tänkt efter. Koppla ihop dina mål och styrkor med vad rollen och företaget erbjuder. Ett svar som visar att du förstår tjänsten är mycket starkare än ett allmänt "jag vill utvecklas".

## Berätta om en utmaning du löst

Den här typen av fråga testar hur du arbetar i praktiken. Använd en enkel struktur: beskriv situationen, vad du gjorde och vilket resultat det gav. Välj ett verkligt exempel där din insats gjorde skillnad.

## Vad är din största svaghet

Undvik både falsk blygsamhet och svagheter som diskvalificerar dig. Välj något äkta och berätta hur du hanterar det. Det visar självinsikt, vilket arbetsgivare värderar högt.

## Har du några frågor till oss

Att inte ha några frågor signalerar svalt intresse. Förbered ett par genomtänkta frågor om rollen, teamet eller hur framgång mäts. Det visar engagemang och ger dig samtidigt information du behöver.

När du vill träna inför en specifik intervju kan Intervjusimulatorn ta fram de mest sannolika frågorna utifrån ditt CV och tjänsten du söker, tillsammans med strategier för hur du bäst besvarar dem.`,
  }
);
