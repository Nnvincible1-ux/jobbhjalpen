import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { Streamdown } from "streamdown";
import { ArrowLeft, Loader2, Lock, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

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
  useEffect(() => {
    if (!session || ranRef.current) return;
    const isPaid = session.paymentStatus === "paid";
    const hasResult = session.messages.length > 0;
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

  const sendAdjust = () => {
    if (!feedback.trim()) return;
    adjustMutation.mutate(
      { id, feedback },
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

  const loading = confirming || sessionQuery.isLoading;
  const isPaid = session?.paymentStatus === "paid";
  const demo = isPaid && sessionQuery.data?.paymentStatus === "paid" && new URLSearchParams(window.location.search).get("demo") === "1";
  const assistantMsgs = session?.messages.filter((m) => m.role === "assistant") ?? [];
  const working = runMutation.isPending || (isPaid && assistantMsgs.length === 0);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Till startsidan
        </Link>

        {demo && (
          <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            Demoläge: betalningen är simulerad. I skarp drift låses resultatet upp först efter bekräftad Stripe-betalning.
          </div>
        )}

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
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.85fr]">
            <div className="space-y-6">
              <h1 className="font-display text-3xl font-semibold">Ditt resultat</h1>
              {working ? (
                <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Vi arbetar med ditt underlag. Detta tar oftast under en minut.
                  </p>
                </div>
              ) : (
                assistantMsgs.map((m, i) => (
                  <div key={i} className="rounded-2xl border bg-card p-6 shadow-sm">
                    {i > 0 && (
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Justering {i}
                      </p>
                    )}
                    <article className="prose prose-sm max-w-none prose-headings:font-display">
                      <Streamdown>{m.content}</Streamdown>
                    </article>
                  </div>
                ))
              )}
            </div>

            {/* Adjustment panel */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border bg-card p-6 shadow-sm">
                <h2 className="font-display text-lg font-semibold">Justeringar</h2>
                {session.remainingRounds > 0 ? (
                  <>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Du har {session.remainingRounds} justeringsrunda
                      {session.remainingRounds === 1 ? "" : "r"} kvar.
                    </p>
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Vad vill du ändra? T.ex. 'Gör tonen mer formell.'"
                      className="mt-4 min-h-28"
                      disabled={adjustMutation.isPending || working}
                    />
                    <Button
                      onClick={sendAdjust}
                      disabled={adjustMutation.isPending || working || !feedback.trim()}
                      className="mt-3 w-full"
                    >
                      {adjustMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Justerar...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" /> Skicka justering
                        </>
                      )}
                    </Button>
                  </>
                ) : session.status === "locked" ? (
                  <div className="mt-4 flex items-start gap-2 rounded-lg bg-secondary/60 p-3 text-sm">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Dina justeringsförsök är förbrukade. Hoppas du är nöjd med resultatet! För en ny
                      omgång, starta en ny beställning.
                    </span>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Den här tjänsten levereras som ett färdigt resultat utan justeringsrundor.
                  </p>
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
