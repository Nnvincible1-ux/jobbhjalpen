# Miljövariabler (exempel)

I Manus WebDev injiceras kärnvariablerna automatiskt. Listan nedan är till för när du driftar projektet på egen VPS. Skapa en `.env`-fil utifrån detta.

```env
# --- Kärna ---
DATABASE_URL=mysql://user:password@host:3306/jobbhjalpen
JWT_SECRET=byt-ut-mot-en-lang-slumpmassig-strang
PORT=3000
PUBLIC_BASE_URL=https://din-doman.se

# --- LLM ---
# I WebDev injiceras dessa automatiskt. På VPS, peka mot din egen leverantor:
BUILT_IN_FORGE_API_URL=https://din-llm-proxy-eller-openai
BUILT_IN_FORGE_API_KEY=sk-...

# --- Stripe (lamna tomt i POC-lage => demolage aktiveras) ---
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# --- Auth (WebDev anvander Manus OAuth; byt pa VPS, se MIGRATION.md) ---
VITE_APP_ID=
OAUTH_SERVER_URL=
VITE_OAUTH_PORTAL_URL=
OWNER_OPEN_ID=
OWNER_NAME=
```
