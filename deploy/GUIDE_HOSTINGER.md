# Lansera CV-piloten på din Hostinger-VPS

Den här guiden tar dig från tom server till en fungerande sajt på cvpiloten.se. Den är skriven för dig som inte är van vid servrar. Följ stegen i ordning. Räkna med ungefär en timme första gången.

Innan du börjar behöver du tre saker som bara du kan ordna: en köpt domän (cvpiloten.se), en VPS hos Hostinger, och en AI-nyckel (t.ex. från OpenAI). Du behöver också din Stripe-nyckel när du vill aktivera betalning.

## Steg 1: Peka domänen mot servern

Logga in på Hostinger och hitta din VPS IP-adress (en sifferrad som 12.34.56.78). Gå sedan till domänens DNS-inställningar och skapa två A-poster: en för `@` (cvpiloten.se) och en för `www`, båda pekande mot din VPS IP. DNS kan ta upp till någon timme på sig att slå igenom.

## Steg 2: Logga in på servern

I Hostingers panel finns en knapp för terminal eller SSH-uppgifter. Logga in på servern. Du hamnar i ett kommandofönster. Allt nedan skrivs där.

## Steg 3: Installera det som behövs

Kör följande, en rad i taget. Det installerar Node, pnpm, databasen och webbservern Caddy.

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs mariadb-server git
sudo npm install -g pnpm pm2
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

## Steg 4: Skapa databasen

```bash
sudo mysql -e "CREATE DATABASE cvpiloten CHARACTER SET utf8mb4;"
sudo mysql -e "CREATE USER 'cvpiloten'@'localhost' IDENTIFIED BY 'VALJ_ETT_STARKT_LOSENORD';"
sudo mysql -e "GRANT ALL PRIVILEGES ON cvpiloten.* TO 'cvpiloten'@'localhost'; FLUSH PRIVILEGES;"
```

Kom ihåg lösenordet, det ska in i .env i nästa steg.

## Steg 5: Hämta koden

```bash
cd ~
git clone https://github.com/Nnvincible1-ux/jobbhjalpen.git cvpiloten
cd cvpiloten
```

## Steg 6: Fyll i miljövariabler

Skapa filen `.env` och klistra in innehållet från `deploy/ENV.sample.md`, med dina egna värden (databaslösenordet från steg 4, din AI-nyckel, din Stripe-nyckel). Skapa filen så här:

```bash
nano .env
```

Klistra in, fyll i, spara med Ctrl+O och Enter, stäng med Ctrl+X.

## Steg 7: Bygg och starta

```bash
pnpm install
pnpm build
pnpm drizzle-kit migrate
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup
```

Appen körs nu i bakgrunden på port 3000.

## Steg 8: Sätt på HTTPS med Caddy

```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy hämtar automatiskt ett giltigt HTTPS-certifikat. Öppna https://cvpiloten.se i webbläsaren. Nu ska sajten ligga uppe.

## Steg 9: Aktivera Stripe-betalning

I Stripe-panelen, skapa en webhook som pekar på `https://cvpiloten.se/api/service/stripe-webhook`. Kopiera webhook-hemligheten och din API-nyckel in i `.env`, kör sedan `bash deploy/deploy.sh` så att appen läser de nya värdena. Från och med nu låses en tjänst upp först när Stripe bekräftar betalningen.

## Uppdatera sajten i framtiden

När jag har gjort ändringar i koden och pushat till GitHub, uppdaterar du servern med ett enda kommando i projektmappen:

```bash
bash deploy/deploy.sh
```

Det hämtar senaste koden, bygger och startar om. Inget annat behövs.

## Om något krånglar

Se appens loggar med `pm2 logs cvpiloten`. Se Caddys status med `sudo systemctl status caddy`. Om sajten inte syns, kontrollera att DNS pekar rätt (steg 1) och att appen körs (`pm2 list`). Hör av dig så hjälper jag dig tolka felmeddelanden.
