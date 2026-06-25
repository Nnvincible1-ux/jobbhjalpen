# Jobbhjälpen — Project TODO

## Database & Schema
- [x] services table
- [x] cmsText table (draft/publish, unique textKey)
- [x] cmsStyle table
- [x] faq table
- [x] serviceSession table (paymentStatus, remainingRounds, ...)
- [x] sessionMessage table
- [x] Apply migration via webdev_execute_sql

## Backend
- [x] CMS db helpers (getText, getStyle, getFaq, publish all drafts)
- [x] Auto-seed CMS defaults (INSERT IGNORE) 7 services + copy + FAQ + styles
- [x] File pre-processing: accept pdf/doc/docx/txt; reject other; reject image-only PDF BEFORE any LLM call
- [x] AI engine: 7 strict per-service system prompts with guardrails (no off-topic, no images)
- [x] cms router (admin write, publish)
- [x] services router (list, get)
- [x] session router (run gated by payment, adjust with DB round counter, lock at 0)
- [x] Stripe: checkout, webhook, confirm — unlock only after paid

## Frontend (public)
- [x] Global theme: elegant premium design (Fraunces + Inter, tokens)
- [x] Landing page: hero, 7 service cards (49 kr), trust, FAQ
- [x] GDPR cookie consent banner (opt-in before analytics)
- [x] Service detail page + upload flow (validation feedback)
- [x] Payment → result view, adjustment rounds UI (locks at 0)
- [x] Dynamic sitemap.xml

## CMS Admin
- [x] Admin auth (role=admin gate via existing login)
- [x] Content editor (texts + FAQ) — edit without code
- [x] Draft/publish + preview (?preview=draft)

## Payments
- [x] Stripe integration in code (vilande utan nycklar)
- [x] 49 kr one-time per service
- [x] Session unlock gated solely by Stripe confirmation
- [x] POC demo-mode fallback when Stripe not configured

## Docs & Repo
- [x] README + docs (SERVICES, PROMPT_ARCHITECTURE, COST_MARGIN, TECHNICAL_DECISIONS, MIGRATION, STRATEGY)
- [x] New private GitHub repo + push (Nnvincible1-ux/jobbhjalpen)
- [x] vitest: file validation, prompt guardrails, payment gate, round counter (10 tests pass)

## VPS / Deploy (Option B)
- [x] Demo-/POC-läge utan Stripe
- [x] VPS-portabel kod
- [x] MIGRATION.md guide

## Verify
- [x] Screenshots of landing, service, admin
- [x] All tests pass (10/10)

## SaaS / White-label (multi-tenant) — utöver konsument
- [x] tenants-tabell (namn, slug/subdomän, branding, status)
- [x] Koppla tenantId till sessioner; tenants/memberships/participants/subscriptions
- [x] Tenant-resolver: läs tenant från subdomän/host (?tenant= för dev), fallback default
- [x] Tenant-styrd branding (logo/färger/tagline) i header/footer + CSS-variabler
- [x] Organisationsroller: org_admin, coach (memberships-tabell)
- [x] Behörighet: coach ser bara sin organisations data (assertTenantAccess)
- [x] Deltagare-tabell (participants) kopplad till tenant + coach
- [x] Handledar-UI (/coach): lägg upp deltagare, statusbyte, starta tjänst
- [x] Org-fakturering (datamodell + visning): subscriptions (per coach/per deltagare/plattform)
- [x] Tester: tenant-isolering, branding-resolver, rollbehörighet (19/19 pass)
- [x] SAAS_WHITELABEL.md

## SaaS end-to-end (uppföljning efter självgranskning)
- [x] Sessioner bär tenantId/participantId/coachUserId; coach-start skapar sådan session
- [x] coach.myOrgs returnerar riktiga medlemskap för icke-admin (listUserOrgs)
- [x] Handledare kan skapa membership (coach.addCoach, org_admin/plattformsadmin)
- [x] "Starta tjänst" i portalen: org-kontext-uppladdning -> org-betald session -> resultat
- [x] Org-faktureringsmodell + visning (subscriptions) klar; org-sessioner bär coachUserId
- [~] Skarp Stripe Billing-prenumeration: medvetet uppskjuten i POC, aktiveras när du levererar Stripe-nycklar (samma som konsument-Stripe). Datamodell + visning klar.
- [x] README uppdaterad med white-label/SaaS-arkitektur

## SEO-innehåll (ranka mot cvkungen i Sverige)
- [x] SEO-strategi: pillar + kluster + sökordskarta (docs/SEO_STRATEGY.md)
- [x] articles-tabell (slug, kind, meta, body, keyword, related, cta, faq) draft/publish
- [x] 3 pillar + 5 kluster svenska SEO-artiklar seedade (köpstark, människolik text)
- [x] Bloggmotor: /guider listsida + /guider/:slug artikelsida
- [x] On-page-SEO: useSEO (title/description/canonical) + JSON-LD Article/FAQPage
- [x] Intern länkning pillar<->kluster + CTA till 49 kr-tjänst
- [x] Dynamisk sitemap inkluderar alla guider
- [x] Guider-länk i navet
- [x] Tester: guides list/get + draft-isolering (23/23 pass)
- [~] Server-side meta-injektion per route: medveten framtida förbättring (kräver ändring i kärnfilen vite.ts; dokumenterad i SEO_STRATEGY.md). Client-side meta + JSON-LD + sitemap räcker för lansering.

## AI-flöde, humanizer och VPS-drift
- [x] Humanizer-modul (regler + deterministisk städning stripAiTells)
- [x] Dubbelt AI-flöde: generering (GEN_MODEL) + humanisering (HUMANIZER_MODEL)
- [x] Modeller via env (byts utan kodändring), LLM-lager leverantörsoberoende
- [x] Humanizer obligatorisk i flödet + deterministisk slutstädning på all output
- [x] Tester för humanizer (28/28 totalt) + end-to-end verifierat (0 tankstreck i output)
- [x] VPS-deploypaket: ENV.sample.md, Caddyfile, nginx-conf, PM2, systemd, deploy.sh
- [x] Svensk steg-för-steg-guide för Hostinger (deploy/GUIDE_HOSTINGER.md)
- [x] docs/AI_OCH_DRIFT.md (modellval + humanizer + drift)

## Content-skalning + AEO/GEO (enligt SEO-skill)
- [x] Läste SEO/GEO/AEO-skills i ultimate-website-skill
- [x] Genererade 30 nya yrkesguider parallellt (AEO-optimerade)
- [x] answerBlock-kolumn + citatvänligt sammanfattningsblock per guide
- [x] 41 guider live totalt (32 yrkesguider, 4 pillar)
- [x] robots.txt släpper in AI-crawlers (GPTBot, ClaudeBot, PerplexityBot m.fl.)
- [x] Dynamisk llms.txt med tjänster, guider och fakta
- [x] Organization + WebSite JSON-LD i index.html
- [x] Article-schema använder answerBlock som description
- [x] sitemap inkluderar alla 49 URL:er, bas cvpiloten.se
- [x] 28/28 tester passerar
