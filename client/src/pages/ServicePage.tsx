import { useRef, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, FileUp, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useCms } from "@/contexts/CmsContext";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SERVICE_ICON } from "@/lib/services";

const ACCEPT = ".pdf,.doc,.docx,.txt";

export default function ServicePage() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const { getText } = useCms();
  const { data: service, isLoading } = trpc.services.get.useQuery({ slug });

  const [file, setFile] = useState<File | null>(null);
  const [annons, setAnnons] = useState("");
  const [annonsUrl, setAnnonsUrl] = useState("");
  const [annonsMode, setAnnonsMode] = useState<"text" | "url">("text");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isLinkedin = slug === "linkedin-makeover";

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!service) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-center">
          <p className="text-muted-foreground">Tjänsten kunde inte hittas.</p>
          <Link href="/" className="mt-4 inline-block underline">
            Till startsidan
          </Link>
        </div>
      </div>
    );
  }

  const Icon = SERVICE_ICON[service.slug] ?? FileUp;

  const fileToBase64 = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

  const onSelect = (f: File | null) => {
    setError(null);
    if (!f) return;
    const okExt = /\.(pdf|doc|docx|txt)$/i.test(f.name);
    if (!okExt) {
      setError("Endast PDF, DOC, DOCX eller TXT stöds. Bilder kan inte behandlas.");
      return;
    }
    setFile(f);
  };

  const start = async () => {
    if (!file) {
      setError("Välj ett dokument först.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/service/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceSlug: service.slug,
          fileBase64: base64,
          fileName: file.name,
          mimeType: file.type,
          annonsText: annonsMode === "text" ? annons : "",
          annonsUrl: annonsMode === "url" ? annonsUrl : "",
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        let msg = data.message || "Filen kunde inte behandlas.";
        if (data.code === "content_invalid" && typeof data.attemptsLeft === "number") {
          msg += ` Du har ${data.attemptsLeft} försök kvar.`;
        }
        setError(msg);
        setBusy(false);
        return;
      }
      // Proceed to payment (or free/test mode when price is 0 kr).
      const isFree = service.priceSek === 0;
      let accessCode: string | undefined;
      if (isFree) {
        accessCode = window.prompt("Den här tjänsten är i testläge. Ange åtkomstkod:") || "";
      }
      const checkout = await fetch("/api/service/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: data.sessionId, origin: window.location.origin, accessCode }),
      });
      const co = await checkout.json();
      if (co.ok && co.free) {
        navigate(`/resultat/${data.sessionId}`);
      } else if (co.ok && co.url) {
        window.location.href = co.url;
      } else if (co.needCode) {
        setError("Fel åtkomstkod för testläge.");
        setBusy(false);
      } else {
        setError(co.message || "Kunde inte starta betalning.");
        setBusy(false);
      }
    } catch (e) {
      setError("Något gick fel. Försök igen.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Tillbaka
        </Link>

        <div className="mt-8 grid gap-10 md:grid-cols-[1fr_0.9fr]">
          <div>
            <div
              className="grid h-12 w-12 place-items-center rounded-xl"
              style={{ background: "color-mix(in oklch, var(--brand-accent) 25%, white)" }}
            >
              <Icon className="h-6 w-6" style={{ color: "var(--brand-primary)" }} />
            </div>
            <h1 className="mt-5 font-display text-3xl font-semibold md:text-4xl">
              {getText(`service.${service.slug}.title`, service.slug)}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {getText(`service.${service.slug}.desc`, "")}
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" style={{ color: "var(--brand-accent)" }} />
                {service.priceSek === 0 ? "Testläge – ingen betalning" : `Fast pris ${service.priceSek} kr, engångsbetalning`}
              </li>
              {service.hasAdjustments && (
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" style={{ color: "var(--brand-accent)" }} />
                  {service.maxRounds} justeringsrundor ingår
                </li>
              )}
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" style={{ color: "var(--brand-accent)" }} />
                Resultat direkt efter betalning
              </li>
            </ul>
          </div>

          {/* Upload card */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold">Ladda upp ditt underlag</h2>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-4 flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors hover:bg-secondary/40"
            >
              <FileUp className="h-7 w-7 text-muted-foreground" />
              <span className="mt-3 text-sm font-medium">
                {file ? file.name : "Klicka för att välja fil"}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">PDF, DOC, DOCX eller TXT</span>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
              />
            </button>

            {isLinkedin && (
              <div className="mt-4 rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Så får du fram din profil</p>
                <p className="mt-1">
                  <strong>Rekommenderat, PDF:</strong> Öppna LinkedIn, klicka på <em>Me</em> (din bild uppe till höger) → <em>View Profile</em> → knappen <em>Resources</em> (eller <em>More</em>) → <em>Save to PDF</em>. Ladda sedan upp PDF:en här.
                </p>
                <p className="mt-2">
                  <strong>Publik länk:</strong> På din profil, se rutan <em>Public profile &amp; URL</em> uppe till höger, eller kopiera adressen från <em>Edit public profile &amp; URL</em>. Den ser ut som www.linkedin.com/in/dittnamn.
                </p>
                <p className="mt-2">Obs: LinkedIn blockerar ofta automatisk läsning av länkar. Fungerar inte länken, ladda upp PDF:en i stället.</p>
              </div>
            )}

            {service.acceptsAnnons && (
              <div className="mt-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAnnonsMode("text")}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${annonsMode === "text" ? "bg-foreground text-background" : "bg-secondary text-foreground"}`}
                  >
                    Klistra in text
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnnonsMode("url")}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${annonsMode === "url" ? "bg-foreground text-background" : "bg-secondary text-foreground"}`}
                  >
                    Dela länk
                  </button>
                </div>
                {annonsMode === "text" ? (
                  <div className="mt-3">
                    <label className="text-sm font-medium">Jobbannons (klistra in text)</label>
                    <Textarea
                      value={annons}
                      onChange={(e) => setAnnons(e.target.value)}
                      placeholder="Klistra in annonsen här..."
                      className="mt-2 min-h-28"
                    />
                  </div>
                ) : (
                  <div className="mt-3">
                    <label className="text-sm font-medium">Länk till jobbannonsen</label>
                    <input
                      type="url"
                      value={annonsUrl}
                      onChange={(e) => setAnnonsUrl(e.target.value)}
                      placeholder="https://..."
                      className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Vi läser annonstexten från länken. Om sidan kräver inloggning ber vi dig klistra in texten i stället.
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button onClick={start} disabled={busy} className="mt-5 w-full" size="lg">
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Bearbetar...
                </>
              ) : (
                service.priceSek === 0 ? "Starta (testläge)" : `Fortsätt till betalning – ${service.priceSek} kr`
              )}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Inga abonnemang. Betalning krävs innan tjänsten körs.
            </p>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
