import { Link } from "wouter";
import { ArrowRight, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { trpc } from "@/lib/trpc";
import { useCms } from "@/contexts/CmsContext";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { CATEGORY_LABEL, SERVICE_ICON } from "@/lib/services";

export default function Home() {
  const { getText, faq } = useCms();
  const { data: services } = trpc.services.list.useQuery();

  const jobServices = (services ?? []).filter((s) => s.category === "job");
  const privateServices = (services ?? []).filter((s) => s.category === "private");

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--brand-accent)" }}
        />
        <div className="container grid gap-12 py-20 md:grid-cols-[1.1fr_0.9fr] md:py-28">
          <div className="reveal">
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--brand-accent)" }} />
              {getText("hero.eyebrow", "Expertis möter teknik")}
            </span>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
              {getText("hero.title", "Vassa dokument. Färdiga på minuter.")}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {getText(
                "hero.subtitle",
                "Sju specialiserade tjänster byggda på rekryterings- och avtalsexpertis. Du laddar upp ditt underlag, vi levererar ett genomarbetat resultat. Engångspris, ingen prenumeration."
              )}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#tjanster"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--brand-primary)" }}
              >
                {getText("hero.cta", "Se tjänsterna")}
                <ArrowRight className="h-4 w-4" />
              </a>
              <span className="text-sm text-muted-foreground">Fast pris 49 kr per tjänst</span>
            </div>
          </div>

          <div className="reveal grid grid-cols-2 gap-4 self-center">
            {[
              { k: "1", t: "Välj tjänst" },
              { k: "2", t: "Ladda upp underlag" },
              { k: "3", t: "Betala 49 kr" },
              { k: "4", t: "Få ditt resultat" },
            ].map((step) => (
              <div key={step.k} className="rounded-2xl border bg-card p-5 shadow-sm">
                <div
                  className="grid h-9 w-9 place-items-center rounded-full text-sm font-semibold text-white"
                  style={{ background: "var(--brand-accent)" }}
                >
                  {step.k}
                </div>
                <p className="mt-3 font-medium">{step.t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="tjanster" className="container py-16 md:py-20">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">
            {getText("services.title", "Våra tjänster")}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {getText("services.subtitle", "Välj den hjälp du behöver. Varje leverans är skräddarsydd efter ditt underlag.")}
          </p>
        </div>

        {[
          { label: CATEGORY_LABEL.job, items: jobServices },
          { label: CATEGORY_LABEL.private, items: privateServices },
        ]
          .filter((group) => group.items.length > 0)
          .map((group) => (
          <div key={group.label} className="mt-10">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </h3>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((s) => {
                const Icon = SERVICE_ICON[s.slug] ?? Sparkles;
                return (
                  <Link
                    key={s.slug}
                    href={`/tjanst/${s.slug}`}
                    className="group flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                  >
                    <div
                      className="grid h-11 w-11 place-items-center rounded-xl"
                      style={{ background: "color-mix(in oklch, var(--brand-accent) 25%, white)" }}
                    >
                      <Icon className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
                    </div>
                    <h4 className="mt-4 font-display text-xl font-semibold">
                      {getText(`service.${s.slug}.title`, s.slug)}
                    </h4>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {getText(`service.${s.slug}.tagline`, "")}
                    </p>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="font-display text-lg font-semibold">{s.priceSek} kr</span>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                        Starta
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section id="sa-funkar-det" className="border-y bg-secondary/40">
        <div className="container py-16 md:py-20">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">
            {getText("trust.title", "Byggt på erfarenhet, inte gissningar")}
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { icon: Sparkles, key: "trust.point1" },
              { icon: Wallet, key: "trust.point2" },
              { icon: ShieldCheck, key: "trust.point3" },
            ].map(({ icon: Icon, key }) => (
              <div key={key} className="rounded-2xl bg-card p-6 shadow-sm">
                <Icon className="h-6 w-6" style={{ color: "var(--brand-accent)" }} />
                <p className="mt-4 leading-relaxed">{getText(key, "")}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">Vanliga frågor</h2>
          <Accordion type="single" collapsible className="mt-8">
            {faq.map((item) => (
              <AccordionItem key={item.id} value={`faq-${item.id}`}>
                <AccordionTrigger className="text-left text-base">{item.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
