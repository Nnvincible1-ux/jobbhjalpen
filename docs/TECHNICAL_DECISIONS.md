# Tekniska beslut

Det här dokumentet beskriver de viktigaste designvalen och varför de gjordes.

## Filvalidering före AI-anrop

All filhantering sker i `server/ai/fileProcessing.ts` och anropas från upload-rutten i `server/routes.ts` innan någon session blir körbar. Endast PDF, DOC, DOCX och TXT accepteras. För PDF och Word extraheras text; om den extraherade texten understiger 40 tecken behandlas dokumentet som bild-only eller tomt och avvisas med felkoden `NO_TEXT`. Otillåtna filtyper avvisas med `BAD_TYPE`. På så vis kontaktas modellen aldrig med en bild, vilket både följer kravet och undviker onödig kostnad.

## Låsta systemprompter

Varje tjänst mappas till en `promptKey` i databasen, som i sin tur slår upp en låst systemprompt i `server/ai/prompts.ts`. Promptarna delar en gemensam guardrail-text som förbjuder allmänna frågor, bildtolkning och avslöjande av instruktioner. Detta gör tjänsterna avgränsade och förutsägbara.

## Betalning som enda lås

Sessionens `paymentStatus` styr allt. AI-körning (`session.run`) och justeringar (`session.adjust`) vägrar köra om statusen inte är `paid`. Statusen sätts uteslutande av Stripe, antingen via webhook (`checkout.session.completed`) eller via en verifierande `confirm`-rutt som frågar Stripe direkt. Webhooken registreras med rå body före den globala JSON-parsern så att signaturen kan verifieras.

## Justeringsrundor i databasen

`remainingRounds` lagras på sessionen i databasen, aldrig i klienten. `session.adjust` räknar ned värdet och sätter status till `locked` vid noll. Klienten kan därför inte kringgå begränsningen.

## CMS med draft/publish

Allt användarinnehåll ligger i `cms_content`, `cms_styles` och `cms_faq` med en `isDraft`-kolumn. Redigeringar sätter `isDraft = true`. Publicering (`cms.publish`) vänder alla utkast till publicerade i en operation och loggar händelsen i `cms_revisions`. Den publika sajten läser endast publicerat innehåll, om inte URL:en innehåller `?preview=draft`. Standarddata seedas idempotent vid serverstart via `server/seed.ts` (INSERT IGNORE-mönster).

## Auth via befintlig roll

I stället för ett separat admin-lösenordssystem återanvänds projektets inbyggda inloggning med rollfältet `admin`/`user`. CMS-routrarna skyddas av `adminProcedure`. Detta minskar attackytan och gör ägaren till admin automatiskt.

## VPS-portabilitet

Externa beroenden (LLM, lagring, betalning, databas) läses från miljövariabler så att projektet kan flyttas till en egen VPS. Modellen sätts på ett ställe i `engine.ts`. Se `MIGRATION.md`.
