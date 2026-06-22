# Jobbhjälpen

Jobbhjälpen är en webbapplikation som säljer avgränsade AI-drivna dokumenttjänster för jobbsök och privatliv. Varje tjänst är ett engångsköp för 49 kr. Produkten är byggd kring rekryterings-, ekonomi- och avtalsexpertis; AI används som en tyst motor i bakgrunden för att leverera den expertisen snabbt.

## Tjänster

| Tjänst | Kategori | Pris | Justeringsrundor | Underlag |
| :--- | :--- | :--- | :--- | :--- |
| Skräddarsydd ansökan | Jobbsök | 49 kr | – | CV + jobbannons |
| LinkedIn Makeover | Jobbsök | 49 kr | 3 | CV |
| CV-Granskaren | Jobbsök | 49 kr | 3 | CV |
| Intervjusimulatorn | Jobbsök | 49 kr | – | CV (+ annons) |
| BRF-Granskaren | Privatliv | 49 kr | – | Årsredovisning |
| Avtalskollen | Privatliv | 49 kr | – | Avtal/kontrakt |
| Överklagande-assistenten | Privatliv | 49 kr | – | Beslut + ärendebeskrivning |

Detaljerade beskrivningar finns i [`docs/SERVICES.md`](docs/SERVICES.md).

## Kärnprinciper

Tre regler styr hela arkitekturen och får aldrig brytas:

1. **Inget AI-anrop sker innan filvalidering är klar.** Uppladdade filer pre-processas på servern. Endast PDF, DOC, DOCX och TXT accepteras. Bild-only-PDF:er utan läsbar text avvisas innan modellen kontaktas.
2. **Modellen är låst per tjänst.** Varje tjänst har en strikt systemprompt som bara tillåter sin egna uppgift, vägrar svara på allmänna frågor och aldrig tolkar bilder. Se [`docs/PROMPT_ARCHITECTURE.md`](docs/PROMPT_ARCHITECTURE.md).
3. **Betalning är enda låset.** En session kan endast köras när `paymentStatus = 'paid'`, satt av Stripe. Justeringsrundor räknas ned i databasen, aldrig i klienten.

## Teknisk stack

React 19, TypeScript, Tailwind CSS 4, tRPC 11, Drizzle ORM (MySQL/TiDB), Express 4. Innehåll hanteras via ett inbyggt CMS med draft/publish.

## Projektstruktur

```
server/
  ai/
    prompts.ts          Låsta systemprompter (7 tjänster) + guardrails
    fileProcessing.ts   Filvalidering + textextraktion (pre-processing)
    engine.ts           AI-körning + justeringsrundor
  payments/stripe.ts    Stripe-klient (graceful om ej konfigurerad)
  routes.ts             Upload, checkout, webhook, confirm, sitemap
  routers.ts            tRPC: services, content, session, cms (admin)
  db.ts                 DB-hjälpare
  seed.ts               Auto-seed av tjänster, CMS-text, FAQ, stilar
drizzle/schema.ts       Databasschema (8 tabeller)
client/src/
  pages/                Home, ServicePage, ResultPage, Privacy, AdminPage
  contexts/CmsContext   getText/getStyle-provider
  components/           SiteChrome, CookieConsent
```

## Köra lokalt

```bash
pnpm install
pnpm dev          # startar server + Vite
pnpm test         # kör vitest
pnpm check        # typecheck
```

## Miljövariabler

Se [`.env.example`](.env.example). I POC-läge (utan `STRIPE_SECRET_KEY`) faller betalsteget tillbaka till ett demoläge så hela flödet kan provas.

## Hosting

Projektet är byggt VPS-portabelt. Guide för att flytta från Manus WebDev till egen VPS finns i [`docs/MIGRATION.md`](docs/MIGRATION.md).

## Dokumentation

- [`docs/SERVICES.md`](docs/SERVICES.md) – tjänstebeskrivningar
- [`docs/PROMPT_ARCHITECTURE.md`](docs/PROMPT_ARCHITECTURE.md) – systemlåsning och guardrails
- [`docs/COST_MARGIN.md`](docs/COST_MARGIN.md) – kostnads- och marginalanalys
- [`docs/TECHNICAL_DECISIONS.md`](docs/TECHNICAL_DECISIONS.md) – tekniska beslut
- [`docs/MIGRATION.md`](docs/MIGRATION.md) – VPS-migrationsguide
