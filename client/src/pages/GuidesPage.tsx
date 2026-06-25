import { Link } from "wouter";
import { ArrowRight, BookOpen, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { useSEO } from "@/lib/seo";

export default function GuidesPage() {
  const { data: guides, isLoading } = trpc.guides.list.useQuery();
  useSEO({
    title: "Guider om CV, personligt brev och intervju | Jobbhjälpen",
    description:
      "Expertguider om att skriva CV, personligt brev och förbereda intervju. Konkreta råd som hjälper dig vidare till nästa jobb.",
    path: "/guider",
  });

  const pillars = (guides ?? []).filter((g) => g.kind === "pillar");
  const clusters = (guides ?? []).filter((g) => g.kind === "cluster");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container py-12 md:py-16">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" style={{ color: "var(--brand-accent)" }} /> Guider
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold md:text-4xl">
            Guider som tar dig vidare i jobbsöket
          </h1>
          <p className="mt-3 text-muted-foreground">
            Konkreta råd om CV, personligt brev och intervju, byggda på erfarenhet av vad som faktiskt
            fungerar i rekrytering.
          </p>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {pillars.map((g) => (
                <Link
                  key={g.slug}
                  href={`/guider/${g.slug}`}
                  className="group flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--brand-accent)" }}>
                    Huvudguide
                  </span>
                  <h2 className="mt-2 font-display text-xl font-semibold">{g.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{g.excerpt}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
                    Läs guiden
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>

            <h3 className="mt-12 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Fler guider
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clusters.map((g) => (
                <Link
                  key={g.slug}
                  href={`/guider/${g.slug}`}
                  className="group rounded-xl border bg-card p-5 transition-colors hover:bg-secondary/40"
                >
                  <h4 className="font-medium">{g.title}</h4>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{g.excerpt}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
