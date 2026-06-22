import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export default function Privacy() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Tillbaka
        </Link>
        <article className="prose prose-sm mt-8 max-w-3xl prose-headings:font-display">
          <h1>Integritet & cookies</h1>
          <p>
            Vi värnar om din integritet. Den här sidan förklarar hur vi hanterar dina uppgifter och
            vilka cookies vi använder.
          </p>
          <h2>Dokument du laddar upp</h2>
          <p>
            De dokument du laddar upp används enbart för att leverera den tjänst du har beställt. Vi
            säljer aldrig vidare dina uppgifter och delar dem inte med tredje part för marknadsföring.
          </p>
          <h2>Cookies</h2>
          <p>
            Vi använder nödvändiga cookies för att sajten ska fungera. Med ditt samtycke använder vi
            även cookies för anonym besöksstatistik. Du kan när som helst ändra ditt val genom att
            rensa webbläsarens lagring.
          </p>
          <h2>Betalning</h2>
          <p>
            Betalningar hanteras av en extern betalleverantör. Vi lagrar aldrig dina fullständiga
            kortuppgifter.
          </p>
          <h2>Kontakt</h2>
          <p>Har du frågor om hur vi hanterar dina uppgifter är du välkommen att kontakta oss.</p>
        </article>
      </div>
      <SiteFooter />
    </div>
  );
}
