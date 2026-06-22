# Jobbhjälpen som SaaS / white-label för jobbcoach-bolag

Det här dokumentet beskriver hur plattformen kan erbjudas som en multi-tenant SaaS-lösning till svenska jobbcoach-bolag (leverantörer inom Rusta och matcha), utöver den befintliga standalone-konsumenttjänsten.

## Marknaden

Inom Arbetsförmedlingens tjänst **Rusta och matcha** väljer den arbetssökande själv en leverantör som ska hjälpa hen till jobb eller utbildning. Leverantörerna får en grundersättning per deltagare och dag samt en **resultatersättning som betalas ut när deltagaren får jobb eller påbörjar utbildning** [1] [2]. Det finns många sådana leverantörer, och de konkurrerar om deltagare och om att leverera resultat effektivt. Ett digitalt verktyg som hjälper handledare och deltagare att snabbt producera vassa ansökningshandlingar är därför direkt kopplat till leverantörens intäkt: bättre handlingar leder till fler jobb, vilket leder till mer resultatersättning.

Det gör att din plattform har ett tydligt värdeerbjudande mot dessa bolag: den hjälper deras handledare att skala upp kvaliteten på CV, brev, LinkedIn och intervjuförberedelser för många deltagare samtidigt, utan att varje handledare behöver göra allt manuellt.

## Två sätt att paketera

**1. Standalone (idag).** Privatpersoner köper enskilda tjänster för 49 kr. Detta behålls oförändrat.

**2. White-label SaaS (nytt).** Ett jobbcoach-bolag får en egen instans/utrymme i plattformen under sitt eget varumärke ("deras skin"): egen logotyp, egna färger, egen subdomän (t.ex. `coach.företaget.se`) och eventuellt egna texter. Deras handledare loggar in, lägger upp sina deltagare och använder tjänsterna obegränsat. Bolaget betalar dig en abonnemangsavgift eller en avgift per deltagare/per handledare, i stället för 49 kr per styck.

## Affärsmodeller mot coach-bolagen

| Modell | Hur det fungerar | Passar när |
| :--- | :--- | :--- |
| Per säte (handledare) | Fast pris per handledarkonto och månad | Bolag med stabil personalstyrka |
| Per aktiv deltagare | Pris per deltagare och månad | Bolag med varierande deltagarvolym |
| Plattformsavgift + förbrukning | Lägre fast avgift plus rörlig kostnad för AI-körningar | Bolag som vill ha låg tröskel |
| Intäktsdelning | En andel kopplad till bolagets resultatersättning | Avancerat, kräver förtroende och uppföljning |

Eftersom din AI-kostnad per leverans är några ören är marginalen mycket god även vid generös användning. En enkel startpunkt är en fast månadsavgift per handledare med ett rimligt tak på antal körningar.

## Vad som krävs tekniskt (multi-tenancy)

Plattformen är redan nära detta tack vare CMS-arkitekturen, men en riktig white-label-lösning kräver att data och utseende isoleras per kund. Följande är de viktigaste tilläggen:

1. **Tenant-modell.** En ny tabell `tenants` (organisation, subdomän, status). Allt kundspecifikt innehåll och all data får en `tenantId`. Den publika standalone-sajten blir helt enkelt en standard-tenant.
2. **Tenant-styrd branding.** CMS-stilarna (logotyp, färger, typsnitt) och texterna kopplas till `tenantId`. Plattformen läser branding utifrån vilken subdomän eller domän besökaren kommer in på, så att "deras skin" laddas automatiskt. Detta bygger vidare på den `getStyle`/`getText`-provider som redan finns.
3. **Roller per organisation.** Utöver dagens `admin`/`user` behövs roller som `org_admin` (bolagets administratör) och `coach` (handledare). En handledare ser bara sin organisations deltagare.
4. **Deltagarhantering.** Handledare lägger upp deltagare och kör tjänsterna åt eller tillsammans med dem. Sessionerna kopplas till både handledare och deltagare för uppföljning.
5. **Fakturering mot organisationen.** I stället för 49 kr-betalning per session faktureras organisationen (abonnemang via Stripe Billing eller faktura). Konsumentflödet med engångsbetalning behålls parallellt.
6. **Domän och isolering.** Varje tenant kan få egen subdomän. Data filtreras alltid på `tenantId` på serversidan så att inget läcker mellan organisationer.

## Viktiga hänsyn

- **Sekretess och GDPR.** Deltagardata inom Rusta och matcha är känslig. En affär mot dessa bolag kräver tydliga personuppgiftsbiträdesavtal, dataisolering per tenant och radering på begäran. Detta bör vara en uttalad del av erbjudandet.
- **Arbetsförmedlingens regelverk.** Plattformen är ett hjälpmedel för leverantörens egen verksamhet, inte en upphandlad tjänst i sig. Det är viktigt att positionera den som ett produktivitetsverktyg, inte som något som ersätter leverantörens åtaganden.
- **AI som sekundärt.** Precis som i konsumentdelen bör säljbudskapet mot bolagen betona att verktyget bygger på rekryteringsexpertis och hjälper handledarna att jobba snabbare och mer enhetligt, med AI som motorn i bakgrunden.

## Föreslagen utbyggnadsordning

En rimlig väg är att först lägga till tenant-modellen och tenant-styrd branding så att en pilotkund kan köra sitt eget skin, därefter roller och deltagarhantering, och sist organisationsfakturering. Den nuvarande POC:en behöver inte byggas om; den blir standard-tenanten och resten läggs ovanpå.

---
### Referenser
[1] Arbetsförmedlingen. *Rusta och matcha*. https://arbetsformedlingen.se/for-arbetssokande/extra-stod/stod-a-o/rusta-och-matcha
[2] Kompetensföretagen. *Hur fungerar Rusta och matcha 2?* https://www.kompetensforetagen.se/2021/03/hur-fungerar-krom/
