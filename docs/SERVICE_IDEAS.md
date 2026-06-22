# Nya mikrotjänster för privatpersoner (49 kr)

Förutom jobbsök (CV, LinkedIn, Intervju) finns det en enorm marknad för engångstjänster riktade mot privatpersoner vid stora livshändelser, där juridisk eller ekonomisk expertis traditionellt är dyr.

## 1. Bostadsköp: Granskning av BRF Årsredovisning & Stadgar
**Smärtpunkt:** Köpare av bostadsrätt får en 30-sidig PDF (årsredovisning) full av ekonomisk jargong och nyckeltal. De flesta förstår inte om föreningen har dolda skulder, hög räntekänslighet eller kommande avgiftshöjningar.
**Tjänst (49 kr):** Användaren laddar upp årsredovisningen (PDF). AI:n extraherar lån/kvm, kassaflöde, räntebindningstider och underhållsbehov, och levererar en "Trafikljus-rapport" (Grön/Gul/Röd) med 3 konkreta frågor att ställa till mäklaren.
**Konkurrens:** Det finns gratisverktyg (t.ex. kollabrf.nu, brfkollen.io) som börjar dyka upp, men en välpaketerad "expertrapport" för 49 kr kan säljas på förtroende och användarvänlighet.

## 2. Köpekontrakt & Avtalsgranskning
**Smärtpunkt:** Privatpersoner köper begagnad bil, hantverkstjänster eller hyr i andra hand. De får ett kontrakt men vet inte om det innehåller orimliga friskrivningar eller saknar viktiga skydd.
**Tjänst (49 kr):** "Avtalskollen". Användaren laddar upp kontraktet (PDF/bild-till-text via OCR pre-processing) och anger sin roll (t.ex. "köpare"). AI:n letar efter fallgropar (t.ex. avsaknad av ångerrätt, dolda avgifter, orimliga dröjsmålsräntor) och föreslår 2-3 tilläggsklausuler för att skydda användaren.

## 3. Myndighetsbrev / Överklaganden
**Smärtpunkt:** Att skriva formella överklaganden till Försäkringskassan, Skatteverket eller kommunen (t.ex. bygglov, p-böter) är svårt. Språket måste vara formellt och hänvisa till rätt paragrafer.
**Tjänst (49 kr):** Användaren beskriver sitt ärende kortfattat med egna ord och laddar upp beslutet. Systemet genererar ett formellt, juridiskt gångbart överklagandedokument redo att signeras.

## Sammanfattning av upplägg
Genom att applicera exakt samma arkitektur (Strikt Systemprompt + Pre-processing av filer + 49 kr engångskostnad + max 3 justeringar) kan du bygga ett ekosystem av "Expert-bottar". Marginalen förblir över 85% eftersom dokumenten sällan överstiger 10 000 tokens (ca 0,50 kr i AI-kostnad).
