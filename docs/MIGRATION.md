# Migrera till egen VPS

Projektet utvecklas i Manus WebDev men är byggt för att kunna flyttas till en egen VPS. Den här guiden beskriver stegen. (Vi kör just nu Alternativ B: färdigställ POC i WebDev, migrera senare.)

## Översikt över beroenden att byta ut

| Område | I WebDev | På din VPS |
| :--- | :--- | :--- |
| Databas | Inbyggd MySQL/TiDB | Egen MySQL eller Postgres (sätt `DATABASE_URL`) |
| LLM | Inbyggd Forge-proxy | Egen OpenAI/Anthropic-nyckel (sätt `BUILT_IN_FORGE_API_URL` + `BUILT_IN_FORGE_API_KEY`) |
| Betalning | Stripe via secrets | Egna Stripe-nycklar |
| Inloggning (admin) | Manus OAuth | Eget auth, se nedan |
| Lagring | Inbyggd S3-proxy | Egen S3/bucket vid behov |

## Steg

1. **Klona repot** till din VPS och kör `pnpm install`.
2. **Sätt upp databasen.** Skapa en MySQL-databas och kör schemat: `pnpm drizzle-kit generate` följt av migrationerna i `drizzle/`. Sätt `DATABASE_URL`.
3. **LLM.** Peka `BUILT_IN_FORGE_API_URL` mot din leverantörs OpenAI-kompatibla endpoint och sätt `BUILT_IN_FORGE_API_KEY`. Hjälparen i `server/_core/llm.ts` använder dessa. Justera modellnamnet i `server/ai/engine.ts` om din leverantör har andra namn.
4. **Stripe.** Sätt `STRIPE_SECRET_KEY` och `STRIPE_WEBHOOK_SECRET`. Peka din Stripe-webhook till `https://din-doman.se/api/stripe/webhook`. När `STRIPE_SECRET_KEY` är satt aktiveras riktig betalning automatiskt och demoläget slås av.
5. **Auth.** Manus OAuth-flödet ligger i `server/_core/oauth.ts` och `client/src/const.ts`. På VPS byter du detta mot t.ex. e-post/lösenord med JWT eller en OAuth-leverantör du väljer. Admin-skyddet bygger på rollfältet `admin` i `users`-tabellen, så det enda du behöver bevara är att din inloggade admin får `role = 'admin'`.
6. **Bygg och kör.** `pnpm build` följt av `pnpm start`. Servern lyssnar på `PORT` (default 3000).
7. **Reverse proxy + TLS.** Kör appen bakom Nginx eller Caddy med automatiskt Let's Encrypt-certifikat. Sätt `PUBLIC_BASE_URL` till din domän (används i sitemap).

## Förslag på Docker-setup (skiss)

En enkel produktionssetup består av tre delar: en container för Node-appen, en MySQL-databas och Caddy/Nginx som TLS-terminerande reverse proxy. Appen byggs med `pnpm build` och startas med `pnpm start`. Lägg miljövariablerna i en `.env` (se `ENV_EXAMPLE.md`). När du vill ha den fullständiga `docker-compose.yml` och Caddyfile skapar jag dem åt dig — säg bara till.

## Checklista före skarp drift

- Riktiga Stripe-nycklar satta och webhook verifierad.
- Egen LLM-nyckel med rimlig budget/larm.
- Databasbackup aktiverad.
- HTTPS och korrekt `PUBLIC_BASE_URL`.
- Admin-konto med `role = 'admin'`.
