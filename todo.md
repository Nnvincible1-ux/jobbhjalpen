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
- [ ] New private GitHub repo + push
- [x] vitest: file validation, prompt guardrails, payment gate, round counter (10 tests pass)

## VPS / Deploy (Option B)
- [x] Demo-/POC-läge utan Stripe
- [x] VPS-portabel kod
- [x] MIGRATION.md guide

## Verify
- [x] Screenshots of landing, service, admin
- [x] All tests pass (10/10)
