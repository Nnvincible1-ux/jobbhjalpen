import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ExternalLink, Loader2, Rocket, Save, Trash2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import AdminLogin from "@/components/AdminLogin";

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const tok = localStorage.getItem("cvp_admin_token");
    // No token at all -> show login immediately, never call /me or any admin query.
    if (!tok) {
      setAuthed(false);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    (async () => {
      try {
        const r = await fetch("/api/admin-auth/me", {
          cache: "no-store",
          signal: ctrl.signal,
          headers: { authorization: `Bearer ${tok}` },
        });
        const d = r.ok ? await r.json().catch(() => ({})) : {};
        const ok = Boolean(d?.authenticated);
        if (!ok) localStorage.removeItem("cvp_admin_token");
        setAuthed(ok);
      } catch {
        setAuthed(false);
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, []);

  if (authed === null) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return <AdminLogin onAuthed={() => setAuthed(true)} />;
  }

  return <AdminPanel onLogout={() => setAuthed(false)} />;
}

async function adminLogout() {
  const tok = localStorage.getItem("cvp_admin_token");
  await fetch("/api/admin-auth/logout", {
    method: "POST",
    credentials: "include",
    headers: tok ? { authorization: `Bearer ${tok}` } : undefined,
  }).catch(() => {});
  localStorage.removeItem("cvp_admin_token");
}

function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const utils = trpc.useUtils();
  // Only query when an admin token exists, so it can never fire unauthenticated.
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("cvp_admin_token");
  const { data, isLoading } = trpc.cms.all.useQuery(undefined, { enabled: hasToken, retry: false });
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
            <Button
              variant="outline"
              onClick={async () => {
                await adminLogout();
                onLogout();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Logga ut
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Tabs defaultValue="texts">
          <TabsList>
            <TabsTrigger value="services">Tjänster</TabsTrigger>
            <TabsTrigger value="texts">Texter</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
            <TabsTrigger value="tracking">Spårning</TabsTrigger>
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

          <TabsContent value="ai" className="mt-6">
            <AiSettingsPanel />
          </TabsContent>

          <TabsContent value="services" className="mt-6">
            <ServicesPanel />
          </TabsContent>

          <TabsContent value="tracking" className="mt-6">
            <TrackingPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

const PROVIDER_PRESETS: Record<string, { label: string; apiBaseUrl: string; gen: string; humanizer: string; help: string }> = {
  gemini: {
    label: "Google Gemini (gratis att börja med)",
    apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    gen: "gemini-2.5-flash",
    humanizer: "gemini-2.5-flash",
    help: "Skaffa en gratis nyckel på aistudio.google.com/apikey",
  },
  openai: {
    label: "OpenAI",
    apiBaseUrl: "https://api.openai.com/v1",
    gen: "gpt-5",
    humanizer: "gpt-5-mini",
    help: "Skaffa nyckel på platform.openai.com (börjar med sk-)",
  },
  anthropic: {
    label: "Anthropic Claude",
    apiBaseUrl: "https://api.anthropic.com/v1",
    gen: "claude-sonnet-4-6",
    humanizer: "claude-haiku-4-5",
    help: "Skaffa nyckel på console.anthropic.com",
  },
  custom: {
    label: "Annan (OpenAI-kompatibel)",
    apiBaseUrl: "",
    gen: "",
    humanizer: "",
    help: "Ange en OpenAI-kompatibel API-bas-URL och modellnamn.",
  },
};

function AiSettingsPanel() {
  const { data, isLoading } = trpc.ai.get.useQuery();
  const utils = trpc.useUtils();
  const save = trpc.ai.save.useMutation();

  const [provider, setProvider] = useState("gemini");
  const [apiBaseUrl, setApiBaseUrl] = useState(PROVIDER_PRESETS.gemini.apiBaseUrl);
  const [genModel, setGenModel] = useState(PROVIDER_PRESETS.gemini.gen);
  const [humanizerModel, setHumanizerModel] = useState(PROVIDER_PRESETS.gemini.humanizer);
  const [apiKey, setApiKey] = useState("");
  const [loaded, setLoaded] = useState(false);

  useMemoInit(() => {
    if (data && !loaded) {
      setProvider(data.provider);
      setApiBaseUrl(data.apiBaseUrl);
      setGenModel(data.genModel);
      setHumanizerModel(data.humanizerModel);
      setLoaded(true);
    }
  }, [data, loaded]);

  const applyPreset = (p: string) => {
    setProvider(p);
    const preset = PROVIDER_PRESETS[p];
    if (preset && p !== "custom") {
      setApiBaseUrl(preset.apiBaseUrl);
      setGenModel(preset.gen);
      setHumanizerModel(preset.humanizer);
    }
  };

  if (isLoading) {
    return (
      <div className="grid place-items-center py-12">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const preset = PROVIDER_PRESETS[provider] ?? PROVIDER_PRESETS.custom;

  return (
    <div className="max-w-2xl space-y-5 rounded-2xl border bg-card p-6">
      <div>
        <h2 className="font-display text-lg font-semibold">AI-inställningar</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Välj leverantör, modeller och API-nyckel. Ändringar gäller direkt, ingen omstart krävs.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">Leverantör</label>
        <select
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={provider}
          onChange={(e) => applyPreset(e.target.value)}
        >
          {Object.entries(PROVIDER_PRESETS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">{preset.help}</p>
      </div>

      <div>
        <label className="text-sm font-medium">API-bas-URL</label>
        <Input className="mt-1" value={apiBaseUrl} onChange={(e) => setApiBaseUrl(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Genereringsmodell</label>
          <Input className="mt-1" value={genModel} onChange={(e) => setGenModel(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Humaniseringsmodell</label>
          <Input className="mt-1" value={humanizerModel} onChange={(e) => setHumanizerModel(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">API-nyckel</label>
        <Input
          className="mt-1"
          type="password"
          placeholder={data?.hasApiKey ? "•••••••• (sparad, lämna tom för att behålla)" : "Klistra in din API-nyckel"}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {data?.hasApiKey ? "En nyckel är redan sparad. Fyll bara i om du vill byta den." : "Ingen nyckel sparad ännu."}
        </p>
      </div>

      <Button
        onClick={() =>
          save.mutate(
            { provider, apiBaseUrl, genModel, humanizerModel, apiKey: apiKey || undefined },
            {
              onSuccess: () => {
                toast.success("AI-inställningar sparade.");
                setApiKey("");
                utils.ai.get.invalidate();
              },
              onError: (e) => toast.error(e.message),
            }
          )
        }
        disabled={save.isPending}
      >
        {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Spara AI-inställningar
      </Button>
    </div>
  );
}

// Tiny helper to run an effect-like init without importing useEffect separately.
function useMemoInit(fn: () => void, deps: unknown[]) {
  useMemo(fn, deps);
}

function ServicesPanel() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.servicesAdmin.list.useQuery();
  const update = trpc.servicesAdmin.update.useMutation();
  const codeQuery = trpc.servicesAdmin.getAccessCode.useQuery();
  const setCode = trpc.servicesAdmin.setAccessCode.useMutation();
  const [code, setCode2] = useState("");
  const [codeLoaded, setCodeLoaded] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>({});

  useMemoInit(() => {
    if (codeQuery.data && !codeLoaded) {
      setCode2(codeQuery.data.accessCode);
      setCodeLoaded(true);
    }
  }, [codeQuery.data, codeLoaded]);

  if (isLoading || !data) {
    return (
      <div className="grid place-items-center py-12">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const labelFor = (slug: string) => slug.replace(/-/g, " ");

  return (
    <div className="space-y-6">
      <div className="max-w-2xl rounded-2xl border bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-medium">Testläge</p>
        <p className="mt-1">
          Sätt en tjänsts pris till <strong>0 kr</strong> för att testa hela flödet gratis (ingen betalning). En tjänst med 0 kr kräver åtkomstkoden nedan för att köras, så allmänheten inte kan använda den. Sätt pris &gt; 0 och tänd tjänsten för skarp försäljning via Stripe. Släckta tjänster döljs helt på sajten.
        </p>
        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs font-medium">Åtkomstkod (för 0 kr-läge)</label>
            <Input className="mt-1 bg-white" value={code} onChange={(e) => setCode2(e.target.value)} placeholder="t.ex. testa123" />
          </div>
          <Button
            onClick={() =>
              setCode.mutate(
                { accessCode: code },
                {
                  onSuccess: () => {
                    toast.success("Åtkomstkod sparad.");
                    utils.servicesAdmin.getAccessCode.invalidate();
                  },
                  onError: (e) => toast.error(e.message),
                }
              )
            }
            disabled={setCode.isPending}
          >
            Spara kod
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {data.map((s) => (
          <div key={s.slug} className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
            <div className="min-w-[180px] flex-1">
              <p className="font-medium capitalize">{labelFor(s.slug)}</p>
              <p className="text-xs text-muted-foreground">{s.slug}</p>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={s.active}
                onChange={(e) =>
                  update.mutate(
                    { slug: s.slug, active: e.target.checked },
                    {
                      onSuccess: () => utils.servicesAdmin.list.invalidate(),
                      onError: (err) => toast.error(err.message),
                    }
                  )
                }
              />
              {s.active ? "Tänd" : "Släckt"}
            </label>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="w-24"
                value={prices[s.slug] ?? String(s.priceSek)}
                onChange={(e) => setPrices((p) => ({ ...p, [s.slug]: e.target.value }))}
              />
              <span className="text-sm text-muted-foreground">kr</span>
              <Button
                variant="outline"
                className="bg-background"
                onClick={() => {
                  const val = Number(prices[s.slug] ?? s.priceSek);
                  if (Number.isNaN(val) || val < 0) return toast.error("Ogiltigt pris.");
                  update.mutate(
                    { slug: s.slug, priceSek: val },
                    {
                      onSuccess: () => {
                        toast.success(`Pris sparat: ${val} kr`);
                        utils.servicesAdmin.list.invalidate();
                      },
                      onError: (err) => toast.error(err.message),
                    }
                  );
                }}
              >
                Spara pris
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrackingPanel() {
  const { data, isLoading } = trpc.tracking.get.useQuery();
  const utils = trpc.useUtils();
  const save = trpc.tracking.save.useMutation();
  const [fbPixelId, setFbPixelId] = useState("");
  const [ga4Id, setGa4Id] = useState("");
  const [loaded, setLoaded] = useState(false);

  useMemoInit(() => {
    if (data && !loaded) {
      setFbPixelId(data.fbPixelId);
      setGa4Id(data.ga4Id);
      setLoaded(true);
    }
  }, [data, loaded]);

  if (isLoading) {
    return (
      <div className="grid place-items-center py-12">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5 rounded-2xl border bg-card p-6">
      <div>
        <h2 className="font-display text-lg font-semibold">Spårning &amp; retargeting</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Lägg in dina ID:n nedan. Spårning laddas först efter att besökaren accepterat cookies (GDPR).
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">Facebook Pixel-ID</label>
        <Input className="mt-1" placeholder="t.ex. 1234567890123456" value={fbPixelId} onChange={(e) => setFbPixelId(e.target.value)} />
        <p className="mt-1 text-xs text-muted-foreground">Hittas i Meta Events Manager → Datakällor.</p>
      </div>

      <div>
        <label className="text-sm font-medium">Google Analytics 4-ID (valfritt)</label>
        <Input className="mt-1" placeholder="t.ex. G-XXXXXXXXXX" value={ga4Id} onChange={(e) => setGa4Id(e.target.value)} />
      </div>

      <Button
        onClick={() =>
          save.mutate(
            { fbPixelId, ga4Id },
            {
              onSuccess: () => {
                toast.success("Spårning sparad. Laddas för besökare efter cookie-samtycke.");
                utils.tracking.get.invalidate();
              },
              onError: (e) => toast.error(e.message),
            }
          )
        }
        disabled={save.isPending}
      >
        {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Spara spårning
      </Button>
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
