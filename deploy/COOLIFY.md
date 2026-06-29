# Drift på Coolify (cvpiloten.se)

CV-piloten driftas på en Hostinger-VPS via Coolify, byggd från en Dockerfile. Den här filen beskriver uppsättningen och de fallgropar som löstes, så att framtida deploys går smidigt.

## Uppsättning i korthet

- **Server:** Hostinger-VPS, IP `76.13.59.213`, Coolify på port 8000.
- **Databas:** MariaDB som egen Coolify-resurs. Appen når den via det interna värdnamnet i Docker-nätverket `coolify`. `DATABASE_URL` sätts i appens Environment Variables.
- **App:** privat GitHub-repo `Nnvincible1-ux/jobbhjalpen`, branch `main`, **Build Pack: Dockerfile**, Ports Exposes `3000`, domän `https://cvpiloten.se`.
- **DNS:** A-post för `cvpiloten.se` → `76.13.59.213` hos Strato. Coolify utfärdar HTTPS automatiskt (Let's Encrypt) när DNS pekar rätt.

## Viktiga fallgropar som löstes

1. **Static vs server.** Coolify gissade först att projektet var en statisk sida (serverade via Caddy) i stället för att köra Node-servern. Lösning: Build Pack = Dockerfile, så vi styr körningen helt.

2. **Servern importerar devDependencies (t.ex. `vite`).** Bygget buntar servern med `esbuild --packages=external`, så paket som servern importerar måste finnas i `node_modules` vid runtime. `vite` ligger i devDependencies. En `pnpm install --prod` gör då att containern kraschar med `Cannot find package 'vite'` och hamnar i omstartsloop. **Lösning:** runtime-imagen installerar ALLA dependencies (se `Dockerfile`), inte bara prod.

3. **Databasschema saknades vid första start.** Appen seedar vid start men skapar inte tabeller. **Lösning:** `scripts/migrate.mjs` kör alla `drizzle/*.sql` idempotent före servern startar (via Dockerfile CMD). Skriptet blockerar aldrig start (avslutar 0 även vid DB-fel).

## Felsöka en krasch

Containern städas av Coolify när den dör, så `docker logs` på en stoppad container ger ofta inget. Bygg och kör imagen manuellt på servern i förgrunden för att se felet direkt:

```
cd /tmp && git clone https://github.com/Nnvincible1-ux/jobbhjalpen.git cvpbuild && cd cvpbuild \
  && docker build -t cvp-debug . \
  && docker run --rm --network coolify --env-file /data/coolify/applications/<APP_ID>/.env cvp-debug
```

(Repo måste vara åtkomligt; gör det tillfälligt publikt eller använd en token. Den slimmade Node-imagen saknar `wget`/`curl` — använd `node -e "fetch(...)"` för interna anrop.)

## Kvarstående (ej blockerande)

- **OAUTH_SERVER_URL** är inte satt, så Manus-inloggning (admin) fungerar inte i denna miljö. Konsument-flödet (49 kr-tjänster) kräver ingen inloggning. För admin/CMS behövs en egen auth-lösning eller att OAuth-variablerna konfigureras.
- **Stripe** aktiveras när `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` är satta och webhooken pekar på `https://cvpiloten.se/api/stripe/webhook`.
- **AI:** leverantör/modell/nyckel ställs in i adminpanelens AI-flik (Gemini gratis som standard).
