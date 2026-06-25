import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ExternalLink, Loader2, LogIn, Rocket, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export default function AdminPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-semibold">Adminpanel</h1>
          <p className="mt-3 text-muted-foreground">
            {isAuthenticated
              ? "Ditt konto saknar adminbehörighet."
              : "Logga in med ditt adminkonto för att hantera innehållet."}
          </p>
          {!isAuthenticated && (
            <a
              href={getLoginUrl()}
              className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white"
              style={{ background: "var(--brand-primary)" }}
            >
              <LogIn className="h-4 w-4" /> Logga in
            </a>
          )}
          <div className="mt-6">
            <Link href="/" className="text-sm underline">
              Till startsidan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <AdminPanel />;
}

function AdminPanel() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.cms.all.useQuery();
  const saveText = trpc.cms.saveText.useMutation();
  const saveFaq = trpc.cms.saveFaq.useMutation();
  const deleteFaq = trpc.cms.deleteFaq.useMutation();
  const publish = trpc.cms.publish.useMutation();

  const hasDrafts = useMemo(() => {
    if (!data) return false;
    return (
      data.texts.some((t) => t.hasDraft) ||
      data.styles.some((s) => s.hasDraft) ||
      data.faq.some((f) => f.hasDraft)
    );
  }, [data]);

  type TextItem = NonNullable<typeof data>["texts"][number];
  const grouped = useMemo(() => {
    const m = new Map<string, TextItem[]>();
    data?.texts.forEach((t) => {
      const arr = m.get(t.category) ?? [];
      arr.push(t);
      m.set(t.category, arr);
    });
    return m;
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const doPublish = () =>
    publish.mutate(undefined, {
      onSuccess: () => {
        toast.success("Allt innehåll publicerat.");
        utils.cms.all.invalidate();
        utils.content.all.invalidate();
      },
      onError: (e) => toast.error(e.message),
    });

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg font-semibold">CV-piloten · Admin</span>
            {hasDrafts && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                Opublicerade ändringar
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/?preview=draft"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" /> Förhandsgranska utkast
            </a>
            <Button onClick={doPublish} disabled={publish.isPending || !hasDrafts}>
              {publish.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="mr-2 h-4 w-4" />
              )}
              Publicera
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Tabs defaultValue="texts">
          <TabsList>
            <TabsTrigger value="texts">Texter</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
          </TabsList>

          <TabsContent value="texts" className="mt-6 space-y-8">
            {Array.from(grouped.entries()).map(([category, items]) => (
              <section key={category}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {category}
                </h2>
                <div className="space-y-4">
                  {items.map((t) => (
                    <TextRow
                      key={t.textKey}
                      textKey={t.textKey}
                      label={t.label}
                      initial={t.content}
                      isDraft={t.hasDraft}
                      onSave={(content) =>
                        saveText.mutate(
                          { textKey: t.textKey, content },
                          {
                            onSuccess: () => {
                              toast.success("Sparat som utkast.");
                              utils.cms.all.invalidate();
                            },
                            onError: (e) => toast.error(e.message),
                          }
                        )
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
          </TabsContent>

          <TabsContent value="faq" className="mt-6 space-y-4">
            {data.faq.map((f) => (
              <FaqRow
                key={f.id}
                id={f.id}
                question={f.question}
                answer={f.answer}
                sortOrder={f.sortOrder}
                isDraft={f.hasDraft}
                onSave={(payload) =>
                  saveFaq.mutate(payload, {
                    onSuccess: () => {
                      toast.success("Sparat som utkast.");
                      utils.cms.all.invalidate();
                    },
                    onError: (e) => toast.error(e.message),
                  })
                }
                onDelete={() =>
                  deleteFaq.mutate(
                    { id: f.id },
                    {
                      onSuccess: () => {
                        toast.success("Borttagen.");
                        utils.cms.all.invalidate();
                      },
                    }
                  )
                }
              />
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function TextRow(props: {
  textKey: string;
  label: string;
  initial: string;
  isDraft: boolean;
  onSave: (content: string) => void;
}) {
  const [value, setValue] = useState(props.initial);
  const dirty = value !== props.initial;
  const multiline = props.initial.length > 70;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{props.label}</label>
        {props.isDraft && <span className="text-xs text-amber-700">utkast</span>}
      </div>
      {multiline ? (
        <Textarea value={value} onChange={(e) => setValue(e.target.value)} className="mt-2 min-h-24" />
      ) : (
        <Input value={value} onChange={(e) => setValue(e.target.value)} className="mt-2" />
      )}
      <div className="mt-2 flex justify-end">
        <Button size="sm" variant="outline" className="bg-background" disabled={!dirty} onClick={() => props.onSave(value)}>
          <Save className="mr-2 h-3.5 w-3.5" /> Spara
        </Button>
      </div>
    </div>
  );
}

function FaqRow(props: {
  id: number;
  question: string;
  answer: string;
  sortOrder: number;
  isDraft: boolean;
  onSave: (p: { id: number; question: string; answer: string; sortOrder: number }) => void;
  onDelete: () => void;
}) {
  const [q, setQ] = useState(props.question);
  const [a, setA] = useState(props.answer);
  const dirty = q !== props.question || a !== props.answer;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">#{props.sortOrder}</span>
        {props.isDraft && <span className="text-xs text-amber-700">utkast</span>}
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} className="mt-2 font-medium" />
      <Textarea value={a} onChange={(e) => setA(e.target.value)} className="mt-2 min-h-20" />
      <div className="mt-2 flex justify-end gap-2">
        <Button size="sm" variant="ghost" className="text-destructive" onClick={props.onDelete}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Ta bort
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-background"
          disabled={!dirty}
          onClick={() => props.onSave({ id: props.id, question: q, answer: a, sortOrder: props.sortOrder })}
        >
          <Save className="mr-2 h-3.5 w-3.5" /> Spara
        </Button>
      </div>
    </div>
  );
}
