# Kostnad och marginal

Tjänsterna säljs för 49 kr per styck. Den dominerande kostnaden är kundanskaffning, inte AI. Nedan en realistisk kalkyl baserad på aktuella modellpriser (USD/SEK ≈ 10,5).

## AI-kostnad per leverans

Standardmodellen i motorn är `gpt-5`. En typisk körning för CV-anpassning (≈7000 input-tokens, ≈2000 output-tokens) kostar omkring **0,30 kr**. För tjänster med tre justeringsrundor tillkommer cirka 0,15 kr per runda, alltså maximalt ungefär **0,75 kr** totalt inklusive alla tre rundorna. Vid behov kan en billigare modell (t.ex. `gpt-5-mini`) sänka kostnaden ytterligare.

## Marginal per köp (49 kr)

| Post | Belopp |
| :--- | :--- |
| Kundpris (inkl. moms) | 49,00 kr |
| Pris exkl. moms (25 %) | 39,20 kr |
| Betalningsavgift (≈2,5 % + 1,80 kr) | −3,03 kr |
| AI-kostnad (max, inkl. justeringar) | −0,75 kr |
| **Vinst per köp** | **≈35,4 kr (≈90 %)** |

## Slutsats

Marginalen är robust även med den starkaste modellen och tre justeringsrundor. Det innebär att modellvalet kan optimeras för kvalitet snarare än kostnad. Den ekonomiska risken ligger i marknadsföringskostnaden per kund (CAC); så länge CAC hålls under cirka 15–20 kr är affären lönsam på volym.

## Modellbyte

Modellen sätts på ett ställe: konstanten `MODEL` i `server/ai/engine.ts`. Byt där för att växla mellan kvalitet och kostnad.
