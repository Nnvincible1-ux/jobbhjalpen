# AI-modell, humanizer och drift på egen VPS

Det här dokumentet svarar på tre saker: vilken AI-modell CV-piloten bör använda, hur du säkerställer att humanizer alltid tillämpas på det AI:n skriver, och hur allt körs från din Hostinger-VPS och pushas till cvpiloten.se.

## 1. Vilken AI ska du använda

Tjänsterna skriver text som en riktig person ska skicka till en arbetsgivare. Det är alltså användarvänd, varumärkeskänslig text, inte enkel extraktion. Då ska kvaliteten väga tyngst, men kostnaden per körning är ändå låg eftersom texterna är korta.

Rekommendationen är en tvådelad strategi: en stark modell som gör själva jobbet, och en billigare modell som städar texten enligt humanizer.

| Steg | Uppgift | Rekommenderad modell | Varför |
| :--- | :--- | :--- | :--- |
| Generering | CV, brev, LinkedIn, granskning, intervju | En flaggskeppsmodell (t.ex. GPT-5 eller Claude Sonnet) | Bäst på nyanserad, trovärdig svensk text |
| Humanisering | Putsa bort AI-spår | En mini-modell (t.ex. GPT-5-mini) | Enkel transformation, billig, snabb |

På din VPS kopplar du din egen leverantörsnyckel. Eftersom du äger driften är du fri att välja leverantör. Två vettiga vägar:

Om du vill ha enklast möjliga setup, kör allt på en leverantör (OpenAI: GPT-5 för generering, GPT-5-mini för humanisering). Om du vill ha bästa svenska prosan, kan Claude Sonnet vara generingsmodell och en billig modell sköta städningen.

Kostnaden är försumbar i sammanhanget. En körning rör sig om några ören upp till en krona även med en stark modell, mot ett pris på 49 kr. Marginalen håller med god marginal, så optimera för kvalitet först och kostnad sedan.

Viktigt: lås aldrig fast en enda modell hårt i koden. Lägg modellnamnet i en miljövariabel så att du kan byta leverantör eller modell utan att röra koden. Det skyddar dig mot prisändringar och avvecklade modeller.

## 2. Så säkerställer du att humanizer alltid används

Problemet med en systemprompt ensam är att modellen ibland glider tillbaka till AI-mönster. Det säkraste är att inte lita på en enda instruktion, utan bygga humanisering som ett eget steg i flödet. Då är det garanterat att varje leverans passerar samma kontroll.

### Tre lager som tillsammans ger trygghet

Det första lagret är generingsprompten. Lägg in humanizer-reglerna direkt i varje tjänsts systemprompt, så att modellen skriver rätt från början. Reglerna är enkla: inga tankstreck i brödtext, inga typiska AI-ord, undvik mekaniska uppräkningar i tre, variera meningslängd, skriv som en människa.

Det andra lagret är ett separat humaniseringssteg. Efter att texten genererats skickas den genom en andra, billig modell vars enda jobb är att städa enligt humanizer. Den ändrar inte innehållet, bara språket. Det här steget är det som gör skillnaden, eftersom det fångar det som slank igenom i första försöket.

Det tredje lagret är en deterministisk kontroll i kod. Efter humaniseringen körs en enkel funktion som rensar kvarvarande tankstreck och flaggar misstänkta AI-ord. Det är billigt, snabbt och kräver inget AI-anrop.

### Kodmönster (leverantörsoberoende)

Lägg humanizer-reglerna i en delad konstant och återanvänd dem både i generings- och städsteget.

```ts
// server/ai/humanizer.ts
export const HUMANIZER_RULES = `
Skriv som en människa, på naturlig svenska.
- Använd aldrig tankstreck (— eller –) i brödtext. Använd punkt, komma eller kolon.
- Undvik typiska AI-ord (avgörande, dyk ner i, robust, sömlös, i en värld där).
- Tvinga inte in uppräkningar i grupper om tre.
- Variera meningslängd. Blanda korta och långa meningar.
- Var konkret och rak. Undvik tomma fraser och överdrifter.
`.trim();

// Deterministisk slutstädning, inget AI-anrop.
export function stripAiTells(text: string): string {
  return text
    .replace(/\s[—–]\s/g, ", ")
    .replace(/[—–]/g, ", ");
}
```

Bygg sedan in det i motorn så att varje leverans humaniseras innan den returneras.

```ts
// förenklad illustration i server/ai/engine.ts
const draft = await invokeLLM({
  model: process.env.GEN_MODEL,             // stark modell
  messages: [
    { role: "system", content: getSystemPrompt(promptKey) + "\n\n" + HUMANIZER_RULES },
    { role: "user", content: userContent },
  ],
});

const polished = await invokeLLM({
  model: process.env.HUMANIZER_MODEL,       // billig modell
  messages: [
    { role: "system", content: "Du redigerar text så den låter mänsklig. Ändra inte innehållet.\n" + HUMANIZER_RULES },
    { role: "user", content: extractText(draft) },
  ],
});

return stripAiTells(extractText(polished));
```

Med det här upplägget kan humaniseringen aldrig glömmas bort, eftersom den är en obligatorisk del av flödet och inte beroende av att någon kommer ihåg att be om den.

En praktisk avvägning: det dubbla anropet kostar marginellt mer och tar någon sekund extra. Om du vill spara, kan humaniseringssteget köras bara på de tjänster där texten skickas vidare av användaren (CV, brev, LinkedIn) och hoppas över på rena analyser (granskning, intervju), där ton är mindre känslig.

## 3. Drift på Hostinger-VPS med push till cvpiloten.se

Eftersom du vill äga driften själv körs appen på din VPS, inte i Manus. Här är arkitekturen.

### Komponenter på din VPS

Appen är en Node-process (Express som serverar API och den byggda React-frontenden). Den behöver en databas (MySQL eller MariaDB, som redan matchar projektets schema), en webbserver framför sig för HTTPS (Nginx eller Caddy), och en processhanterare som håller appen igång (PM2 eller systemd, alternativt Docker).

### Miljövariabler du sätter på VPS:n

Det här är skillnaden mot Manus-miljön. I stället för inbyggda nycklar sätter du dina egna i en `.env` på servern.

| Variabel | Beskrivning |
| :--- | :--- |
| `DATABASE_URL` | Din MySQL/MariaDB-anslutning på VPS:n |
| `JWT_SECRET` | Hemlig nyckel för sessioner |
| `GEN_MODEL` | Modell för generering, t.ex. gpt-5 |
| `HUMANIZER_MODEL` | Modell för städning, t.ex. gpt-5-mini |
| `LLM_API_KEY` | Din egen nyckel hos vald AI-leverantör |
| `LLM_API_URL` | Leverantörens API-bas |
| `STRIPE_SECRET_KEY` | Din Stripe-nyckel för skarp betalning |
| `STRIPE_WEBHOOK_SECRET` | För att verifiera Stripe-webhooks |
| `PUBLIC_BASE_URL` | https://cvpiloten.se |

Eftersom koden redan läser modellnamn och nycklar från miljön (om vi lägger dem där) behöver inget i logiken ändras när du byter leverantör.

### Deploy-flöde (GitHub till VPS)

Du pushar kod till GitHub-repot, och VPS:n hämtar och bygger. Det enklaste robusta flödet:

Först klonar du repot på servern en gång. Vid varje uppdatering kör du `git pull`, installerar beroenden, bygger frontend och startar om processen. Det kan automatiseras med en liten deploy-skript eller en GitHub Action som via SSH gör samma sak vid varje push till main.

```bash
# på VPS:n, i projektmappen
git pull origin main
pnpm install
pnpm build
pm2 restart cvpiloten   # eller: systemctl restart cvpiloten
```

### Domän och HTTPS

Peka cvpiloten.se mot VPS:ns IP via en A-post hos din DNS. Sätt upp Nginx eller Caddy som proxy mot Node-processens port, och låt Caddy eller Certbot hämta ett gratis Let's Encrypt-certifikat så att sajten körs på https. Lägg till de nordiska domänerna (.com/.no/.dk) som omdirigeringar till .se tills du expanderar.

### Stripe-webhooks

Webhooken behöver en fast, publik adress, vilket en VPS ger dig. Peka Stripe-webhooken till `https://cvpiloten.se/api/stripe/webhook` (lyssna på `checkout.session.completed`) och lägg in webhook-hemligheten i miljön. Då låses en tjänst upp först när Stripe bekräftar betalningen, precis som kravet säger.

## Sammanfattning

Använd en stark modell för att skriva och en billig för att humanisera, och lägg modellnamnen i miljövariabler. Gör humaniseringen till ett obligatoriskt steg i flödet plus en deterministisk slutstädning, så att den aldrig kan glömmas bort. Kör allt på din Hostinger-VPS med egen databas, egna nycklar, Nginx eller Caddy för HTTPS, och ett enkelt git-baserat deploy-flöde till cvpiloten.se.
