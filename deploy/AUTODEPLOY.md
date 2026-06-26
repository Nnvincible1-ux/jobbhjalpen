# Automatisk deploy från GitHub till din VPS

När det här är uppsatt sker varje framtida uppdatering automatiskt: jag pushar kod till GitHub, och GitHub loggar in på din VPS och driftsätter den. Du behöver bara göra den här uppsättningen en gång.

Det finns tre delar: en deploy-nyckel så att GitHub får logga in på servern, fem GitHub Secrets med dina serveruppgifter, och en första manuell installation på servern. Efter det är allt automatiskt.

## Del 1: Skapa en deploy-nyckel (på din VPS)

Logga in på din VPS och skapa ett SSH-nyckelpar som bara används för deploy.

```bash
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/github_deploy
```

Det sista kommandot skriver ut den privata nyckeln. Kopiera hela utskriften, inklusive raderna `-----BEGIN...` och `-----END...`. Den ska in i GitHub i nästa del.

## Del 2: Lägg in GitHub Secrets

Gå till repot på GitHub: Settings, sedan Secrets and variables, sedan Actions, och klicka New repository secret. Skapa dessa fem:

| Secret-namn | Värde |
| :--- | :--- |
| `VPS_HOST` | Din VPS IP-adress (t.ex. 12.34.56.78) |
| `VPS_USER` | Ditt användarnamn på servern (t.ex. root eller ubuntu) |
| `VPS_PORT` | SSH-porten, oftast `22` |
| `VPS_SSH_KEY` | Hela den privata nyckeln du kopierade i Del 1 |
| `VPS_APP_DIR` | Sökvägen till appen, t.ex. `/root/cvpiloten` eller `/home/ubuntu/cvpiloten` |

## Del 3: Första installationen på servern (en gång)

Den automatiska deployen uppdaterar en redan installerad app. Första gången sätter du upp den manuellt:

```bash
cd ~
git clone https://github.com/Nnvincible1-ux/jobbhjalpen.git cvpiloten
cd cvpiloten
bash deploy/bootstrap.sh
```

Skapa sedan databasen (se `GUIDE_HOSTINGER.md` steg 4), skapa `.env` (se `ENV.sample.md`), och kör igång appen:

```bash
pnpm install && pnpm build && pnpm drizzle-kit migrate
pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

Mappen du klonade till måste matcha det du angav i `VPS_APP_DIR`.

## Klart

Från och med nu: varje gång ny kod pushas till main kör GitHub automatiskt deployen på din server. Du kan också trigga den manuellt under fliken Actions i repot, genom att välja "Deploy till VPS" och klicka Run workflow.

## Felsökning

Om en deploy misslyckas, öppna fliken Actions i repot och klicka på den röda körningen för att se loggen. Vanliga orsaker är fel i en secret (kontrollera IP, användarnamn och att hela den privata nyckeln klistrades in), eller att `VPS_APP_DIR` inte pekar på rätt mapp. Du kan alltid köra `bash deploy/deploy.sh` direkt på servern för att deploya manuellt och se felmeddelanden där.
