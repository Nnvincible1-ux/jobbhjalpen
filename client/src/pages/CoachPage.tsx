import { useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, LogIn, Plus, Users, Building2, FileUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useTenant } from "@/contexts/TenantContext";

const STATUS_LABEL: Record<string, string> = {
  active: "Aktiv",
  placed: "Placerad",
  archived: "Arkiverad",
};

export default function CoachPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const { tenant } = useTenant();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="max-w-md text-center">
          <Building2 className="mx-auto h-8 w-8" style={{ color: "var(--brand-accent)" }} />
          <h1 className="mt-4 font-display text-2xl font-semibold">Handledarportal</h1>
          <p className="mt-3 text-muted-foreground">
            Logga in för att hantera dina deltagare och skapa ansökningshandlingar åt dem.
          </p>
          <a
            href={getLoginUrl()}
            className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white"
            style={{ background: "var(--brand-primary)" }}
          >
            <LogIn className="h-4 w-4" /> Logga in
          </a>
          <div className="mt-6">
            <Link href="/" className="text-sm underline">
              Till startsidan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <CoachDashboard userName={user?.name ?? "Handledare"} tenantName={tenant?.name ?? "Din organisation"} />;
}

function CoachDashboard({ userName, tenantName }: { userName: string; tenantName: string }) {
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const { data: orgs, isLoading: orgsLoading } = trpc.coach.myOrgs.useQuery();
  const [tenantId, setTenantId] = useState<number | null>(null);
  const activeTenantId = tenantId ?? orgs?.[0]?.tenantId ?? null;

  const { data: participants, isLoading } = trpc.coach.listParticipants.useQuery(
    { tenantId: activeTenantId as number },
    { enabled: activeTenantId !== null }
  );
  const { data: billing } = trpc.coach.subscription.useQuery(
    { tenantId: activeTenantId as number },
    { enabled: activeTenantId !== null }
  );

  const addParticipant = trpc.coach.addParticipant.useMutation();
  const updateStatus = trpc.coach.updateParticipantStatus.useMutation();

  const services = trpc.services.list.useQuery();
  const jobServices = useMemo(() => (services.data ?? []).filter((s) => s.category === "job"), [services.data]);

  // Add participant dialog
  const [open, setOpen] = useState(false);
  const [fullName, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  // Start service for participant (org-context upload)
  const [startFor, setStartFor] = useState<{ id: number; name: string } | null>(null);
  const [startSlug, setStartSlug] = useState("");
  const [startFile, setStartFile] = useState<File | null>(null);
  const [startAnnons, setStartAnnons] = useState("");
  const [startBusy, setStartBusy] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const startInputRef = useRef<HTMLInputElement>(null);

  const PLAN_LABEL: Record<string, string> = {
    per_coach: "Per handledare",
    per_participant: "Per deltagare",
    platform: "Plattformsavgift",
  };
  const STATUS_BADGE: Record<string, string> = {
    trial: "Provperiod",
    active: "Aktiv",
    past_due: "Förfallen",
    canceled: "Avslutad",
  };

  const fileToBase64 = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

  if (orgsLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!orgs || orgs.length === 0 || activeTenantId === null) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="max-w-md text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Ingen organisation kopplad</h1>
          <p className="mt-3 text-muted-foreground">
            Ditt konto är inte kopplat till någon jobbcoach-organisation ännu. Kontakta
            plattformsadministratören för att bli tillagd som handledare.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm underline">
            Till startsidan
          </Link>
        </div>
      </div>
    );
  }

  const submit = () => {
    if (!fullName.trim()) return;
    addParticipant.mutate(
      { tenantId: activeTenantId, fullName, email: email || undefined, note: note || undefined },
      {
        onSuccess: () => {
          toast.success("Deltagare tillagd.");
          setName("");
          setEmail("");
          setNote("");
          setOpen(false);
          utils.coach.listParticipants.invalidate();
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const runStart = async () => {
    if (!startFor || !startFile || !startSlug) {
      setStartError("Välj tjänst och ladda upp deltagarens dokument.");
      return;
    }
    setStartBusy(true);
    setStartError(null);
    try {
      const base64 = await fileToBase64(startFile);
      const res = await fetch("/api/service/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          serviceSlug: startSlug,
          fileBase64: base64,
          fileName: startFile.name,
          mimeType: startFile.type,
          annonsText: startAnnons,
          tenantId: activeTenantId,
          participantId: startFor.id,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setStartError(data.message || "Filen kunde inte behandlas.");
        setStartBusy(false);
        return;
      }
      navigate(`/resultat/${data.sessionId}`);
    } catch {
      setStartError("Något gick fel. Försök igen.");
      setStartBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="grid h-8 w-8 place-items-center rounded-md text-sm font-bold text-white"
              style={{ background: "var(--brand-primary)" }}
            >
              {tenantName.charAt(0)}
            </span>
            <span className="font-display text-lg font-semibold">{tenantName} · Handledare</span>
          </div>
          <div className="flex items-center gap-4">
            {orgs.length > 1 && (
              <Select value={String(activeTenantId)} onValueChange={(v) => setTenantId(Number(v))}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => (
                    <SelectItem key={o.tenantId} value={String(o.tenantId)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {billing?.subscription && (
              <span className="hidden items-center gap-2 rounded-full border px-3 py-1 text-xs sm:inline-flex">
                {PLAN_LABEL[billing.subscription.plan]} · {STATUS_BADGE[billing.subscription.status]}
              </span>
            )}
            <span className="hidden text-sm text-muted-foreground sm:inline">{userName}</span>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">Dina deltagare</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Skapa vassa ansökningshandlingar åt dina deltagare med plattformens tjänster.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Lägg till deltagare
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ny deltagare</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Namn" value={fullName} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="E-post (valfritt)" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Textarea placeholder="Anteckning (valfritt)" value={note} onChange={(e) => setNote(e.target.value)} />
                <Button onClick={submit} disabled={addParticipant.isPending || !fullName.trim()} className="w-full">
                  {addParticipant.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Spara deltagare
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="grid place-items-center py-16">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !participants || participants.length === 0 ? (
            <div className="rounded-2xl border bg-card p-12 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-muted-foreground">Inga deltagare ännu. Lägg till din första ovan.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="grid h-10 w-10 place-items-center rounded-full text-sm font-semibold text-white"
                      style={{ background: "var(--brand-accent)" }}
                    >
                      {p.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{p.fullName}</p>
                      {p.email && <p className="text-sm text-muted-foreground">{p.email}</p>}
                    </div>
                    <Badge variant="secondary">{STATUS_LABEL[p.status]}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={p.status}
                      onValueChange={(v) =>
                        updateStatus.mutate(
                          { participantId: p.id, status: v as "active" | "placed" | "archived" },
                          { onSuccess: () => utils.coach.listParticipants.invalidate() }
                        )
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Aktiv</SelectItem>
                        <SelectItem value="placed">Placerad</SelectItem>
                        <SelectItem value="archived">Arkiverad</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-background"
                      onClick={() => {
                        setStartFor({ id: p.id, name: p.fullName });
                        setStartSlug(jobServices[0]?.slug ?? "");
                        setStartFile(null);
                        setStartAnnons("");
                        setStartError(null);
                      }}
                    >
                      Skapa ansökan
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Start service for participant (org-context upload) */}
      <Dialog open={!!startFor} onOpenChange={(o) => !o && setStartFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skapa ansökan{startFor ? ` – ${startFor.name}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Tjänst</label>
              <Select value={startSlug} onValueChange={setStartSlug}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Välj tjänst" />
                </SelectTrigger>
                <SelectContent>
                  {jobServices.map((s) => (
                    <SelectItem key={s.slug} value={s.slug}>
                      {s.slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              type="button"
              onClick={() => startInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors hover:bg-secondary/40"
            >
              <FileUp className="h-6 w-6 text-muted-foreground" />
              <span className="mt-2 text-sm font-medium">
                {startFile ? startFile.name : "Ladda upp deltagarens dokument"}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">PDF, DOC, DOCX eller TXT</span>
              <input
                ref={startInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f && !/\.(pdf|doc|docx|txt)$/i.test(f.name)) {
                    setStartError("Endast PDF, DOC, DOCX eller TXT stöds.");
                    return;
                  }
                  setStartError(null);
                  setStartFile(f);
                }}
              />
            </button>
            <Textarea
              placeholder="Jobbannons (valfritt)"
              value={startAnnons}
              onChange={(e) => setStartAnnons(e.target.value)}
              className="min-h-20"
            />
            {startError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{startError}</span>
              </div>
            )}
            <Button onClick={runStart} disabled={startBusy} className="w-full">
              {startBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Skapa och visa resultat
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Ingår i organisationens abonnemang – ingen styckbetalning.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
