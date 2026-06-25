import { useMemo } from "react";
import { Link, useParams } from "wouter";
import { Streamdown } from "streamdown";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { trpc } from "@/lib/trpc";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { useSEO, useJsonLd } from "@/lib/seo";

export default function GuidePage() {
  const { slug } = useParams<{ slug: string }>();
  const preview = new URLSearchParams(window.location.search).get("preview") === "draft";
  const { data: article, isLoading } = trpc.guides.get.useQuery({ slug, preview });
  const { data: allGuides } = trpc.guides.list.useQuery();
  const { data: service } = trpc.services.get.useQuery(
    { slug: article?.ctaServiceSlug ?? "" },
    { enabled: !!article?.ctaServiceSlug }
  );

  const faqs = useMemo<{ q: string; a: string }[]>(() => {
    if (!article?.faqJson) return [];
    try {
      return JSON.parse(article.faqJson);
    } catch {
      return [];
    }
  }, [article]);

  const related = useMemo(() => {
    if (!article?.relatedSlugs || !allGuides) return [];
    const slugs = article.relatedSlugs.split(",").map((s) => s.trim());
    return allGuides.filter((g) => slugs.includes(g.slug));
  }, [article, allGuides]);

  useSEO({
    title: article?.metaTitle ?? "Guide | CV-piloten",
    description: article?.metaDescription ?? "",
    path: `/guider/${slug}`,
  });

  useJsonLd(
    "ld-article",
    article
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.metaDescription,
          inLanguage: "sv-SE",
          author: { "@type": "Organization", name: "CV-piloten" },
        }
      : null
  );
  useJsonLd(
    "ld-faq",
    faqs.length
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null
  );

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!article) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-center">
          <p className="text-muted-foreground">Guiden kunde inte hittas.</p>
          <Link href="/guider" className="mt-4 inline-block underline">
            Till alla guider
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <article className="container py-12 md:py-16">
        <Link href="/guider" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Alla guider
        </Link>

        <div className="mx-auto mt-8 max-w-3xl">
          <h1 className="font-display text-3xl font-semibold leading-tight md:text-4xl">{article.title}</h1>
          <div className="prose prose-neutral mt-8 max-w-none prose-headings:font-display prose-h2:mt-10 prose-a:text-foreground">
            <Streamdown>{article.body}</Streamdown>
          </div>

          {/* CTA to the relevant service */}
          {service && (
            <div className="mt-10 rounded-2xl border bg-card p-6 shadow-sm">
              <p className="font-display text-lg font-semibold">{service.slug === "cv-granskning" ? "Vill du veta hur ditt CV står sig?" : "Vill du ha hjälp på en gång?"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {service.slug === "cv-granskning"
                  ? "Få ditt CV granskat ur en rekryterares perspektiv med konkreta förbättringar."
                  : "Ladda upp ditt underlag så levererar vi ett genomarbetat resultat på minuter."}
              </p>
              <Link
                href={`/tjanst/${service.slug}`}
                className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white"
                style={{ background: "var(--brand-primary)" }}
              >
                Till tjänsten – {service.priceSek} kr
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {/* FAQ */}
          {faqs.length > 0 && (
            <div className="mt-12">
              <h2 className="font-display text-2xl font-semibold">Vanliga frågor</h2>
              <Accordion type="single" collapsible className="mt-4">
                {faqs.map((f, i) => (
                  <AccordionItem key={i} value={`f-${i}`}>
                    <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}

          {/* Internal links */}
          {related.length > 0 && (
            <div className="mt-12">
              <h2 className="font-display text-2xl font-semibold">Läs vidare</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/guider/${r.slug}`}
                    className="group flex items-center justify-between rounded-xl border bg-card p-4 transition-colors hover:bg-secondary/40"
                  >
                    <span className="font-medium">{r.title}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
      <SiteFooter />
    </div>
  );
}
