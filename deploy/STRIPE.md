# Aktivera Stripe-betalning på CV-piloten (VPS)

Betalningen är redan inbyggd. Den ligger vilande tills du lägger in dina Stripe-nycklar. När de finns låses en tjänst upp först när Stripe bekräftar betalningen, vilket är det enda som öppnar resultatet.

## Så fungerar flödet

När en besökare laddat upp sitt underlag skapar appen en Stripe Checkout-session och skickar användaren till Stripes betalsida. Efter betalning skickar Stripe en webhook till din server. Servern verifierar webhooken och markerar sessionen som betald, varpå AI-resultatet kan visas. Ingen kan komma åt resultatet utan en bekräftad betalning.

## Steg för att aktivera

Först skaffar du dina nycklar i Stripe. I Stripe-panelen under Utvecklare och API-nycklar hittar du din hemliga nyckel som börjar med `sk_live_` (eller `sk_test_` medan du testar).

Sedan skapar du en webhook. Gå till Utvecklare och Webhooks, lägg till en endpoint med adressen nedan och välj händelsen `checkout.session.completed`.

```
https://cvpiloten.se/api/stripe/webhook
```

Efter att webhooken skapats visar Stripe en webhook-hemlighet som börjar med `whsec_`. Kopiera den.

Till sist lägger du in båda värdena i `.env` på din VPS och startar om appen.

```env
STRIPE_SECRET_KEY=sk_live_din_nyckel
STRIPE_WEBHOOK_SECRET=whsec_din_hemlighet
POC_DEMO_UNLOCK=false
```

```bash
bash deploy/deploy.sh
```

## Testa att det fungerar

Använd Stripes testläge först. Sätt `sk_test_`-nyckeln, gör ett köp med Stripes testkort `4242 4242 4242 4242` (valfritt framtida datum och valfri CVC). Kontrollera att du skickas tillbaka till resultatsidan och att resultatet visas. I Stripe-panelen under Webhooks ser du att eventet `checkout.session.completed` levererades med status 200.

När testet fungerar byter du till dina skarpa `sk_live_`-nycklar och en webhook skapad i live-läge.

## Viktigt

Sätt alltid `STRIPE_WEBHOOK_SECRET` i produktion. Utan den verifieras inte webhookens signatur, och appen loggar en varning. Håll `POC_DEMO_UNLOCK=false` i produktion så att endast riktig betalning låser upp en tjänst. Dela aldrig dina `sk_live`- eller `whsec`-värden offentligt.

## Pris

Priset per tjänst sätts i databasen (kolumnen `priceSek` på varje tjänst, just nu 49 kr) och skickas till Stripe i öre. Vill du ändra pris gör du det i admin eller direkt i databasen, utan kodändring.
