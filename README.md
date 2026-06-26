# CV-piloten

CV-piloten är en svensk webbapplikation som hjälper människor vidare i jobbsöket genom avgränsade AI-drivna tjänster. Varje tjänst är ett engångsköp för 49 kr. Produkten bygger på rekryteringsexpertis; AI används som en tyst motor i bakgrunden för att leverera den expertisen snabbt, och allt AI-genererat språk humaniseras automatiskt.

Domän: cvpiloten.se (driftas på egen VPS). Varumärke och all text är CMS-redigerbart.

## Tjänster

| Tjänst | Pris | Justeringsrundor | Underlag |
| :--- | :--- | :--- | :--- |
| Skräddarsydd ansökan (CV + brev mot annons) | 49 kr | – | CV + jobbannons |
| LinkedIn Makeover | 49 kr | 3 | CV |
| CV-Granskaren | 49 kr | 3 | CV |
| Intervjusimulatorn | 49 kr | – | CV (+ annons) |

> Privatlivstjänsterna (BRF, avtal, överklagande) är flyttade till ett separat repo (`mikroappar-privatliv`) och ingår inte här.

Detaljer i [`docs/SERVICES.md`](docs/SERVICES.md).

## Kärnprinciper

1. **Inget AI-anrop före filvalidering.** Endast PDF, DOC, DOCX och TXT accepteras. Bild-PDF utan läsbar text avvisas innan modellen kontaktas.
2. **Modellen är låst per tjänst.** Strikt systemprompt per tjänst som vägrar allmänna frågor och aldrig tolkar bilder. Se [`docs/PROMPT_ARCHITECTURE.md`](docs/PROMPT_ARCHITECTURE.md).
3. **Betalning är enda låset.** En session körs endast när `paymentStatus = 'paid'`, satt av Stripe. Justeringsrundor räknas ned i databasen.
4. **All copy humaniseras.** Genererad text passerar ett humaniseringssteg plus deterministisk städning. Se [`docs/AI_OCH_DRIFT.md`](docs/AI_OCH_DRIFT.md).

## AI-flöde

En stark modell (`GEN_MODEL`) genererar, en billig modell (`HUMANIZER_MODEL`) humaniserar användarvänd copy, och `stripAiTells` städar all output. Modellnamn och API-nyckel läses från miljön, så leverantör/modell kan bytas utan kodändring (`server/ai/engine.ts`, `server/ai/humanizer.ts`).

## Innehåll och SEO/AEO/GEO

Sajten har ett guidebibliotek (pillar + kluster + 30+ yrkesguider) i databasen, CMS-redigerbart med draft/publish. Varje guide har ett citatvänligt svarsblock (answerBlock) för AI-sökmotorer. Teknisk AEO/GEO: `robots.txt` släpper in AI-crawlers, dynamisk `/llms.txt`, dynamisk `/sitemap.xml`, samt Organization-, WebSite- och Article-schema. Strategi i [`docs/SEO_STRATEGY.md`](docs/SEO_STRATEGY.md).

## Teknisk stack

React 19, TypeScript, Tailwind CSS 4, tRPC 11, Drizzle ORM (MySQL/MariaDB), Express 4. Typografi: Newsreader (rubriker) + Inter (brödtext).

## Köra lokalt

```bash
pnpm install
pnpm dev          # server + Vite
pnpm test         # vitest
pnpm check        # typecheck
pnpm build        # produktionsbygge
```

## Drift på egen VPS (Hostinger)

CV-piloten körs på en VPS, inte på shared hosting, eftersom den är en ständigt körande Node-process med databas, AI-anrop och Stripe-webhooks. Allt som behövs ligger i `deploy/`:

| Fil | Syfte |
| :--- | :--- |
| [`deploy/GUIDE_HOSTINGER.md`](deploy/GUIDE_HOSTINGER.md) | Steg-för-steg från tom server till live på cvpiloten.se |
| [`deploy/STRIPE.md`](deploy/STRIPE.md) | Aktivera Stripe-betalning (webhook, testkort, säkerhet) |
| [`deploy/ENV.sample.md`](deploy/ENV.sample.md) | Alla miljövariabler för `.env` |
| [`deploy/Caddyfile`](deploy/Caddyfile) | HTTPS via Caddy (automatiskt certifikat) |
| [`deploy/nginx-cvpiloten.conf`](deploy/nginx-cvpiloten.conf) | Alternativ: Nginx + Certbot |
| [`deploy/ecosystem.config.cjs`](deploy/ecosystem.config.cjs) | PM2-process |
| [`deploy/cvpiloten.service`](deploy/cvpiloten.service) | Alternativ: systemd-enhet |
| [`deploy/deploy.sh`](deploy/deploy.sh) | Uppdatera servern: pull, bygg, starta om |

Kortversion på servern: klona repot, fyll i `.env` enligt `deploy/ENV.sample.md`, kör `pnpm install && pnpm build && pnpm drizzle-kit migrate`, starta med PM2, och sätt HTTPS med Caddy. Webhook till Stripe: `https://cvpiloten.se/api/stripe/webhook` (händelse `checkout.session.completed`).

## White-label SaaS för jobbcoach-bolag

Plattformen kan köras multi-tenant white-label för jobbcoach-bolag, parallellt med 49 kr-konsumentflödet. Tenant-resolver per subdomän, roller (`org_admin`/`coach`), handledarportal på `/coach`, och organisationsfakturering via `subscriptions`. Affärsunderlag i [`docs/SAAS_WHITELABEL.md`](docs/SAAS_WHITELABEL.md).

## Dokumentation

- [`docs/SERVICES.md`](docs/SERVICES.md) – tjänstebeskrivningar
- [`docs/PROMPT_ARCHITECTURE.md`](docs/PROMPT_ARCHITECTURE.md) – systemlåsning och guardrails
- [`docs/AI_OCH_DRIFT.md`](docs/AI_OCH_DRIFT.md) – modellval, humanizer och drift
- [`docs/SEO_STRATEGY.md`](docs/SEO_STRATEGY.md) – SEO/AEO/GEO-strategi
- [`docs/BRANDBOOK.md`](docs/BRANDBOOK.md) – varumärkesriktlinjer
- [`docs/OM_OSS.md`](docs/OM_OSS.md) – om oss-texten
- [`docs/COST_MARGIN.md`](docs/COST_MARGIN.md) – kostnads- och marginalanalys
- [`docs/TECHNICAL_DECISIONS.md`](docs/TECHNICAL_DECISIONS.md) – tekniska beslut
- [`docs/SAAS_WHITELABEL.md`](docs/SAAS_WHITELABEL.md) – white-label/SaaS-modell
- [`docs/MIGRATION.md`](docs/MIGRATION.md) – generell VPS-migrationsguide
