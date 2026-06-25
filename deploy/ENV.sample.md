# Miljövariabler för VPS (.env)

Skapa en fil som heter `.env` i projektroten på din VPS och klistra in raderna nedan. Fyll i dina egna värden. Dela aldrig den ifyllda filen och checka aldrig in den i git.

```env
# --- Databas (MySQL/MariaDB på din VPS) ---
DATABASE_URL=mysql://ANVANDARE:LOSENORD@127.0.0.1:3306/cvpiloten

# --- Sessioner (generera med: openssl rand -hex 32) ---
JWT_SECRET=byt-ut-mot-en-lang-slumpmassig-strang

# --- AI-leverantör (OpenAI-kompatibelt API) ---
BUILT_IN_FORGE_API_URL=https://api.openai.com
BUILT_IN_FORGE_API_KEY=din-egen-ai-nyckel
GEN_MODEL=gpt-5
HUMANIZER_MODEL=gpt-5-mini

# --- Stripe (skarp betalning) ---
STRIPE_SECRET_KEY=sk_live_eller_sk_test_din_nyckel
STRIPE_WEBHOOK_SECRET=whsec_din_webhook_hemlighet

# --- Publik adress och port ---
PUBLIC_BASE_URL=https://cvpiloten.se
PORT=3000

# --- Produktion: endast bekräftad Stripe-betalning låser upp ---
POC_DEMO_UNLOCK=false
```

Förklaring av nycklarna:

`DATABASE_URL` pekar på din MySQL- eller MariaDB-databas på servern. `JWT_SECRET` används för att signera inloggningssessioner. `BUILT_IN_FORGE_API_URL` och `BUILT_IN_FORGE_API_KEY` är din AI-leverantörs adress och nyckel (OpenAI fungerar direkt). `GEN_MODEL` och `HUMANIZER_MODEL` styr vilka modeller som används, och kan bytas utan att röra koden. Stripe-nycklarna aktiverar skarp betalning. `PUBLIC_BASE_URL` används i sitemap och länkar. `POC_DEMO_UNLOCK=false` säkerställer att inget låses upp utan betalning i produktion.
