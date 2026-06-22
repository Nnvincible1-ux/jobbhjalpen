# Tjänster

Alla tjänster är engångsköp för 49 kr. Allt användarvänligt innehåll (titlar, beskrivningar, FAQ) styrs via CMS och kan ändras utan kodändringar.

## Jobbsök

### Skräddarsydd ansökan (`cv-anpassning`)
Användaren laddar upp sitt CV och klistrar in en jobbannons. Leverans: ett omskrivet, ATS-vänligt CV, ett personligt brev och en kort förklaring av vilka nyckelord och krav som lyftes fram. Inga justeringsrundor.

### LinkedIn Makeover (`linkedin-makeover`)
Utifrån CV:t genereras rubrik (tre alternativ), Om mig-text, erfarenhetspunkter och nyckelkompetenser. Innehåller tre justeringsrundor.

### CV-Granskaren (`cv-granskning`)
En strukturerad granskning ur rekryterarens perspektiv: helhetsintryck med betyg, styrkor, svagheter och en prioriterad åtgärdslista. Innehåller tre justeringsrundor.

### Intervjusimulatorn (`intervju`)
Utifrån CV och eventuell annons genereras de tio mest sannolika intervjufrågorna, svarsstrategier och tre frågor att ställa till arbetsgivaren. Inga justeringsrundor.

## Privatliv

### BRF-Granskaren (`brf-analys`)
Användaren laddar upp en bostadsrättsförenings årsredovisning. Leverans: en trafikljusbedömning, nyckeltal (belåning/kvm, kassaflöde, räntekänslighet, underhåll, avgift), risker och tre frågor till mäklaren. Tydlig markering om att det är informativ analys, inte finansiell rådgivning.

### Avtalskollen (`avtal-granskning`)
Användaren laddar upp ett avtal eller köpekontrakt. Leverans: sammanfattning, fallgropar och risker ur användarens perspektiv, samt förslag på skyddande tilläggsklausuler.

### Överklagande-assistenten (`overklagande`)
Användaren beskriver ärendet och laddar upp beslutet. Leverans: ett formellt, korrekt formulerat överklagande med yrkande och motivering, redo att signera.

## Justeringsrundor

CV-Granskaren och LinkedIn Makeover innehåller tre justeringsrundor. Räknaren (`remainingRounds`) lagras i databasen på sessionen. När den når noll låses inmatningen och ett tydligt meddelande visas. Detta hanteras i `server/routers.ts` (`session.adjust`).
