import { useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import { Check, Copy, Download, FileText, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Split markdown into sections on level-2 headings (## ) for per-section copy. */
function splitSections(markdown: string): { title: string; body: string }[] {
  const lines = markdown.split(/\r?\n/);
  const sections: { title: string; body: string }[] = [];
  let current: { title: string; body: string } | null = null;
  for (const line of lines) {
    const m = line.match(/^\s{0,3}##\s+(.*)$/);
    if (m) {
      if (current) sections.push(current);
      current = { title: m[1].trim(), body: "" };
    } else if (current) {
      current.body += line + "\n";
    }
  }
  if (current) sections.push(current);
  return sections.filter((s) => s.body.trim().length > 0);
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text.trim());
    toast.success("Kopierat");
  } catch {
    toast.error("Kunde inte kopiera");
  }
}

/** Structured AI result shape (mirrors server ServiceResult). */
export type Gap = {
  label: string;
  why: string;
  suggestion: string;
  scoreImpact?: number;
  needsValidation?: boolean;
  section?: string;
  priority?: string;
};
export type ServiceResult = {
  matchScore: number;
  scoreLabel: string;
  summary: string[];
  gaps: Gap[];
  adaptedCv: string;
  coverLetter: string;
  refusal: string;
  currentScore?: number;
  potentialScore?: number;
  scoreExplanation?: string;
};

/** Parse a stored assistant message into a ServiceResult, tolerating old plain text. */
export function parseResult(content: string): ServiceResult | null {
  try {
    const o = JSON.parse(content);
    if (o && typeof o === "object" && ("adaptedCv" in o || "summary" in o || "refusal" in o || "matchScore" in o)) {
      return {
        matchScore: Number(o.matchScore) || 0,
        scoreLabel: String(o.scoreLabel ?? ""),
        summary: Array.isArray(o.summary) ? o.summary : [],
        gaps: Array.isArray(o.gaps) ? o.gaps : [],
        adaptedCv: String(o.adaptedCv ?? ""),
        coverLetter: String(o.coverLetter ?? ""),
        refusal: String(o.refusal ?? ""),
        currentScore: o.currentScore !== undefined ? Number(o.currentScore) : undefined,
        potentialScore: o.potentialScore !== undefined ? Number(o.potentialScore) : undefined,
        scoreExplanation: o.scoreExplanation ? String(o.scoreExplanation) : undefined,
      };
    }
  } catch {
    /* not JSON */
  }
  // Legacy plain-text result.
  return { matchScore: 0, scoreLabel: "", summary: [], gaps: [], adaptedCv: content, coverLetter: "", refusal: "" };
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;
  const color = score >= 80 ? "#16a34a" : score >= 60 ? "#0d9488" : score >= 40 ? "#d97706" : "#dc2626";
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-secondary" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.23,1,0.32,1)" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="font-display text-3xl font-semibold leading-none">{score}</div>
            <div className="text-[11px] text-muted-foreground">av 100</div>
          </div>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Matchning mot rollen</p>
        <p className="font-display text-2xl font-semibold" style={{ color }}>
          {label || "Bedömd match"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Baserat på ditt befintliga underlag. Vi positionerar om det du redan har, vi hittar aldrig på.
        </p>
      </div>
    </div>
  );
}

function DocCard({
  title,
  markdown,
  filenameBase,
}: {
  title: string;
  markdown: string;
  filenameBase: string;
}) {
  const downloadPdf = () => {
    // Lightweight client-side PDF via the browser print dialog (no extra deps).
    const w = window.open("", "_blank");
    if (!w) return;
    const safe = markdown
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>body{font-family:Georgia,'Times New Roman',serif;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.6;color:#1a1a1a;white-space:pre-wrap}h1,h2,h3{font-family:Arial,Helvetica,sans-serif}</style>
      </head><body>${safe}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const sections = splitSections(markdown);

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
          <FileText className="h-5 w-5 text-muted-foreground" /> {title}
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="bg-background" onClick={() => copyText(markdown)}>
            <Copy className="mr-1.5 h-4 w-4" /> Kopiera allt
          </Button>
          <Button variant="outline" size="sm" className="bg-background" onClick={downloadPdf}>
            <Download className="mr-1.5 h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {sections.length > 1 ? (
        <div className="space-y-4">
          {sections.map((s, i) => (
            <div key={i} className="rounded-xl border bg-background/60 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h4 className="font-display text-base font-semibold">{s.title}</h4>
                <Button variant="ghost" size="sm" onClick={() => copyText(`${s.title}\n\n${s.body}`)}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Kopiera
                </Button>
              </div>
              <article className="prose prose-sm max-w-none prose-headings:font-display">
                <Streamdown>{s.body}</Streamdown>
              </article>
            </div>
          ))}
        </div>
      ) : (
        <article className="prose prose-sm max-w-none prose-headings:font-display">
          <Streamdown>{markdown}</Streamdown>
        </article>
      )}
    </div>
  );
}

/**
 * Conversion-focused result view:
 *  1) Match score + "Så matchade vi"
 *  2) Improvement suggestions with checkboxes (add selected / add all -> re-run)
 *  3) The documents (CV + cover letter) with PDF download, mobile-first
 */
export default function ResultMatchView({
  result,
  onApplyAdditions,
  applying,
  docTitle,
}: {
  result: ServiceResult;
  onApplyAdditions: (additions: string[]) => void;
  applying: boolean;
  docTitle?: string;
}) {
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const selectedList = useMemo(
    () => result.gaps.filter((_, i) => selected[i]).map((g) => `${g.label}: ${g.suggestion}`),
    [selected, result.gaps]
  );

  if (result.refusal) {
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <p className="text-muted-foreground">{result.refusal}</p>
      </div>
    );
  }

  const toggle = (i: number) => setSelected((s) => ({ ...s, [i]: !s[i] }));
  const addAll = () => onApplyAdditions(result.gaps.map((g) => `${g.label}: ${g.suggestion}`));
  const addSelected = () => onApplyAdditions(selectedList);

  return (
    <div className="space-y-6">
      {/* 1. Match summary first */}
      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        {result.currentScore !== undefined && result.potentialScore !== undefined ? (
          <div>
            <div className="flex flex-wrap items-center gap-4">
              <ScoreRing score={result.currentScore} label={result.scoreLabel || "Nuvarande profil"} />
              <div className="flex items-center gap-3 rounded-xl bg-secondary/60 px-4 py-3">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Nu</div>
                  <div className="font-display text-2xl font-semibold">{result.currentScore}</div>
                </div>
                <div className="text-muted-foreground">&rarr;</div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Möjligt</div>
                  <div className="font-display text-2xl font-semibold text-emerald-600">{result.potentialScore}</div>
                </div>
              </div>
            </div>
            {result.scoreExplanation && (
              <p className="mt-3 text-sm text-muted-foreground">{result.scoreExplanation}</p>
            )}
          </div>
        ) : (
          <ScoreRing score={result.matchScore} label={result.scoreLabel} />
        )}
        {result.summary.length > 0 && (
          <div className="mt-5 border-t pt-5">
            <p className="mb-2 text-sm font-semibold">Så matchade vi mot rollen</p>
            <ul className="space-y-2">
              {result.summary.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 2. Improvement suggestions with checkboxes */}
      {result.gaps.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600" />
            <h3 className="font-display text-lg font-semibold">Höj din poäng</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Bocka i <strong>alla</strong> förslag du vill genomföra nu. När du trycker “Lägg till valda” räknas det som <strong>en</strong> justeringsrunda, och de förslag du lämnar kvar finns kvar att lägga till senare. Förslag märkta <em>Behöver valideras</em> läggs bara in om de stämmer för dig.
          </p>
          <div className="mt-4 space-y-3">
            {result.gaps.map((g, i) => (
              <label
                key={i}
                className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-amber-300"
              >
                <input
                  type="checkbox"
                  checked={!!selected[i]}
                  onChange={() => toggle(i)}
                  className="mt-1 h-4 w-4"
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{g.label}</span>
                    {typeof g.scoreImpact === "number" && g.scoreImpact > 0 && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">+{g.scoreImpact} poäng</span>
                    )}
                    {g.section && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">{g.section}</span>
                    )}
                    {g.needsValidation && (
                      <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[11px] font-medium text-amber-900">Behöver valideras</span>
                    )}
                    {g.priority && (
                      <span className="text-[11px] text-muted-foreground">Prio: {g.priority}</span>
                    )}
                  </span>
                  {g.why && <span className="mt-0.5 block text-xs text-muted-foreground">{g.why}</span>}
                  {g.suggestion && <span className="mt-1 block text-xs italic text-foreground/80">”{g.suggestion}”</span>}
                </span>
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button onClick={addSelected} disabled={applying || selectedList.length === 0} className="sm:flex-1">
              {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Lägg till valda ({selectedList.length})
            </Button>
            <Button variant="outline" className="bg-background sm:flex-1" onClick={addAll} disabled={applying}>
              Lägg till alla
            </Button>
          </div>
        </section>
      )}

      {/* 3. Documents */}
      {result.adaptedCv && (
        <DocCard title={docTitle || "Ditt anpassade CV"} markdown={result.adaptedCv} filenameBase="cv" />
      )}
      {result.coverLetter && (
        <DocCard title="Personligt brev" markdown={result.coverLetter} filenameBase="personligt-brev" />
      )}
    </div>
  );
}
