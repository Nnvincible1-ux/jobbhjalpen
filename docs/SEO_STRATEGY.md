# SEO-innehållsstrategi (Sverige)

Mål: ranka på köpstarka svenska CV-/ansökningssökord och konkurrera med cvkungen, cvmaker och cv.se. Strategin bygger på topic clusters: en pillar-sida per ämne med stödjande kluster-artiklar som korslänkar, plus tjänstelandningssidor som fångar transaktionsintention.

## Sökordskarta

| Avsikt | Sökord (exempel) | Sidtyp | Mål-URL |
| :--- | :--- | :--- | :--- |
| Transaktion | cv granskning, granska cv | Tjänstesida | /tjanst/cv-granskning |
| Transaktion | anpassa cv jobbannons, cv till tjänst | Tjänstesida | /tjanst/cv-anpassning |
| Transaktion | linkedin optimering, förbättra linkedin | Tjänstesida | /tjanst/linkedin-makeover |
| Info → köp | skriva cv, hur skriver man ett cv | Pillar | /guider/skriva-cv |
| Info → köp | cv mall, gratis cv mall | Kluster | /guider/cv-mall |
| Info → köp | personligt brev, personligt brev exempel | Pillar | /guider/personligt-brev |
| Info → köp | cv exempel, exempel på cv | Kluster | /guider/cv-exempel |
| Info → köp | ats cv, cv som klarar ats | Kluster | /guider/ats-cv |
| Info → köp | intervjufrågor, vanliga intervjufrågor | Kluster | /guider/intervjufragor |
| Info → köp | kompetenser cv, styrkor cv | Kluster | /guider/kompetenser-cv |

## Struktur (pillar + kluster)

**Pillar 1: Skriva CV** (/guider/skriva-cv) länkar till: cv-mall, cv-exempel, ats-cv, kompetenser-cv. Varje kluster länkar tillbaka till pillar och vidare till tjänsten CV-Granskaren / CV-anpassning.

**Pillar 2: Personligt brev** (/guider/personligt-brev) länkar till: personligt brev exempel, mall personligt brev. CTA mot CV-anpassning (brev ingår).

**Pillar 3: Intervju** (/guider/intervjufragor) länkar mot tjänsten Intervjusimulatorn.

## On-page-principer (svensk SEO)

- URL på svenska, gemener, bindestreck, inga å/ä/ö i slug (skriva-cv, personligt-brev).
- En H1 per sida med huvudsökordet; H2/H3 för delämnen och long-tail.
- Title 50–60 tecken, meta description 140–160 tecken, båda med sökord + nytta.
- Inledning som svarar på sökintentionen i första stycket (Google + läsare).
- Intern länkning: pillar ↔ kluster ↔ tjänst. Varje guide har en mjuk CTA till relevant 49 kr-tjänst.
- FAQPage- och Article-structured data (JSON-LD) för rich snippets.
- Innehåll skrivet för människor, AI som sekundärt; humanizer-regler (inga em-dash, ingen AI-vokabulär, undvik rule-of-three).

## Teknisk SEO (bygger på befintliga lärdomar)

- Server-side meta-injektion per route (title/description/OG/canonical) så crawlers ser unik metadata i en SPA.
- Dynamisk sitemap.xml från DB inklusive publicerade guider.
- Snabb LCP (prerendered hero), korrekt `lang="sv"`, mobilanpassning.

## Redaktionellt

Allt innehåll lagras i DB och är CMS-redigerbart (draft/publish). Publicera inte alla artiklar samma dag; sprid 2–3 dagar mellan, men artiklar som korslänkar publiceras samma dag för att undvika 404.
