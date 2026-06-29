import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { trackPurchase } from "@/lib/tracking";
import { ArrowLeft, Loader2, Lock, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import ResultMatchView, { parseResult } from "@/components/ResultMatchView";

const MAX_ROUNDS = 3;

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();

  const sessionQuery = trpc.session.get.useQuery({ id }, { refetchInterval: false });
  const session = sessionQuery.data;

  const runMutation = trpc.session.run.useMutation();
  const adjustMutation = trpc.session.adjust.useMutation();

  const [feedback, setFeedback] = useState("");
  const [confirming, setConfirming] = useState(true);
  const ranRef = useRef(false);

  // Confirm payment (webhook may already have done it) then run.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await fetch("/api/service/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId: id }),
        });
      } catch {
        /* ignore */
      }
      if (active) {
        await utils.session.get.invalidate({ id });
        setConfirming(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Once the server reports the session is paid, run the service exactly once.
  const purchaseTrackedRef = useRef(false);
  useEffect(() => {
    if (!session || ranRef.current) return;
    const isPaid = session.paymentStatus === "paid";
    const hasResult = session.messages.length > 0;
    if (isPaid && !purchaseTrackedRef.current) {
      purchaseTrackedRef.current = true;
      trackPurchase(session.serviceSlug ?? "tjanst", 49);
    }
    if (isPaid && !hasResult && !runMutation.isPending) {
      ranRef.current = true;
      runMutation.mutate(
        { id },
        {
          onSuccess: () => utils.session.get.invalidate({ id }),
          onError: (e) => {
            ranRef.current = false;
            toast.error(e.message);
          },
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // The latest assistant message is the current result.
  const assistantMsgs = useMemo(
    () => session?.messages.filter((m) => m.role === "assistant") ?? [],
    [session]
  );
  const latest = assistantMsgs[assistantMsgs.length - 1];
  const result = useMemo(() => (latest ? parseResult(latest.content) : null), [latest]);

  const isPaid = session?.paymentStatus === "paid";
  const loading = confirming || sessionQuery.isLoading;
  const working = runMutation.isPending || (isPaid && assistantMsgs.length === 0);
  const adjusting = adjustMutation.isPending;
  const usedRounds = session ? MAX_ROUNDS - session.remainingRounds : 0;

  // "Add suggestions" goes through the adjustment channel so it re-generates the
  // documents (run() is idempotent once a result exists).
  const applyViaAdjust = (additions: string[]) => {
    if (additions.length === 0) return;
    if (session && session.remainingRounds <= 0) {
      toast.info("Dina justeringsrundor är slut, men förslagen finns kvar att lägga till manuellt.");
      return;
    }
    const text =
      "Lägg in följande som jag bekräftar stämmer, och uppdatera CV och brev därefter: " +
      additions.join("; ");
    adjustMutation.mutate(
      { id, feedback: text },
      {
        onSuccess: (r) => {
          utils.session.get.invalidate({ id });
          if (r.locked) toast.info("Dina justeringsförsök är nu förbrukade.");
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const sendAdjust = () => {
    const t = feedback.trim();
    if (t.length < 10 || t.split(/\s+/).filter((w) => w.length > 1).length < 3) {
      toast.error("Skriv en konkret mening om vad du vill ändra, annars kan vi inte göra en vettig justering.");
      return;
    }
    adjustMutation.mutate(
      { id, feedback: t },
      {
        onSuccess: (r) => {
          setFeedback("");
          utils.session.get.invalidate({ id });
          if (r.locked) toast.info("Dina justeringsförsök är nu förbrukade.");
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container py-10 md:py-14">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Till startsidan
        </Link>

        {loading ? (
          <div className="mt-16 grid place-items-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="mt-3 text-sm text-muted-foreground">Bekräftar din session...</p>
          </div>
        ) : !session ? (
          <p className="mt-16 text-center text-muted-foreground">Sessionen kunde inte hittas.</p>
        ) : !isPaid ? (
          <div className="mt-16 grid place-items-center text-center">
            <Lock className="h-8 w-8 text-muted-foreground" />
            <p className="mt-4 max-w-md text-muted-foreground">
              Den här tjänsten låses upp först efter bekräftad betalning. Har du redan betalat? Ladda om sidan om en stund.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* Main result column */}
            <div className="space-y-6">
              <h1 className="font-display text-2xl font-semibold sm:text-3xl">Ditt resultat</h1>
              {working || adjusting ? (
                <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Vi arbetar med ditt underlag. Det tar oftast under en minut.
                  </p>
                </div>
              ) : result ? (
                <ResultMatchView result={result} onApplyAdditions={applyViaAdjust} applying={adjusting} />
              ) : (
                <p className="text-muted-foreground">Inget resultat ännu.</p>
              )}
            </div>

            {/* Adjustment panel */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold">Justeringar</h2>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                    {usedRounds}/{MAX_ROUNDS} använda
                  </span>
                </div>

                {/* Round dots */}
                <div className="mt-3 flex gap-1.5">
                  {Array.from({ length: MAX_ROUNDS }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${i < usedRounds ? "bg-foreground/70" : "bg-secondary"}`}
                    />
                  ))}
                </div>

                {session.remainingRounds > 0 ? (
                  <>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Du har {session.remainingRounds} justeringsrunda
                      {session.remainingRounds === 1 ? "" : "r"} kvar. Beskriv konkret vad du vill ändra.
                    </p>
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="T.ex. 'Lyft fram min erfarenhet av förändringsledning tydligare och gör tonen lite mer formell.'"
                      className="mt-3 min-h-28"
                      disabled={adjusting || working}
                    />
                    <Button onClick={sendAdjust} disabled={adjusting || working || !feedback.trim()} className="mt-3 w-full">
                      {adjusting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Justerar...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" /> Skicka justering
                        </>
                      )}
                    </Button>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Tomma eller otydliga kommentarer förbrukar ingen runda.
                    </p>
                  </>
                ) : (
                  <div className="mt-4 flex items-start gap-2 rounded-lg bg-secondary/60 p-3 text-sm">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Dina {MAX_ROUNDS} justeringsrundor är förbrukade. För fler justeringar, starta en ny beställning.
                    </span>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
