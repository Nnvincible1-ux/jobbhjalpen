import { Streamdown } from "streamdown";
import { useCms } from "@/contexts/CmsContext";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { useSEO } from "@/lib/seo";

export default function About() {
  const { getText } = useCms();
  const title = getText("about.title", "Om CV-piloten");
  const body = getText("about.body", "");

  useSEO({
    title: `${title} | CV-piloten`,
    description:
      "Varför vi byggde CV-piloten: att sänka tröskeln in på arbetsmarknaden och hjälpa fler vidare till jobb. Om vår idé och vad vi vill åstadkomma.",
    path: "/om-oss",
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container py-12 md:py-20">
        <div className="mx-auto max-w-3xl">
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--brand-accent)" }}
          >
            Om oss
          </span>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight md:text-5xl">
            {title}
          </h1>
          <div className="prose prose-neutral mt-8 max-w-none prose-headings:font-display prose-h2:mt-10 prose-p:leading-relaxed">
            <Streamdown>{body}</Streamdown>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
