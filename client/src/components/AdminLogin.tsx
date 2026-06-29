import { useState } from "react";
import QRCode from "qrcode";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

/**
 * Standalone admin login for the VPS deployment.
 * Flow:
 *  - Enter email + password (+ remember me)
 *  - First time without password: set a password
 *  - 2FA: enroll (scan QR) or verify code
 * On success, an httpOnly session cookie is set and onAuthed() is called.
 */
type Step = "login" | "setPassword" | "enroll" | "totp";

async function api(path: string, body: unknown) {
  const res = await fetch(`/api/admin-auth/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export default function AdminLogin({ onAuthed }: { onAuthed: () => void }) {
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function showQr(otpauthUrl: string) {
    try {
      const url = await QRCode.toDataURL(otpauthUrl, { width: 220, margin: 1 });
      setQrDataUrl(url);
    } catch {
      setQrDataUrl(null);
    }
  }

  async function handleLogin() {
    setBusy(true);
    try {
      // Decide whether this is first-time setup (no password yet).
      const status = await api("status", { email });
      if (status.data?.exists && !status.data?.hasPassword) {
        setStep("setPassword");
        return;
      }
      const r = await api("login", { email, password, remember });
      if (!r.ok) {
        toast.error(r.data?.error || "Inloggning misslyckades.");
        return;
      }
      if (r.data?.needsTotp) {
        setUserId(r.data.userId);
        setStep("totp");
      } else if (r.data?.needsEnrollment) {
        setUserId(r.data.userId);
        setSecret(r.data.secret);
        await showQr(r.data.otpauthUrl);
        setStep("enroll");
      } else {
        onAuthed();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSetPassword() {
    if (password.length < 10) return toast.error("Minst 10 tecken.");
    if (password !== password2) return toast.error("Lösenorden matchar inte.");
    setBusy(true);
    try {
      const r = await api("setup-password", { email, password });
      if (!r.ok) return toast.error(r.data?.error || "Kunde inte spara lösenord.");
      toast.success("Lösenord sparat. Loggar in...");
      const login = await api("login", { email, password, remember });
      if (login.data?.needsEnrollment) {
        setUserId(login.data.userId);
        setSecret(login.data.secret);
        await showQr(login.data.otpauthUrl);
        setStep("enroll");
      } else if (login.data?.needsTotp) {
        setUserId(login.data.userId);
        setStep("totp");
      } else {
        onAuthed();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleEnrollVerify() {
    setBusy(true);
    try {
      const r = await api("enroll-verify", { email, code, remember });
      if (!r.ok) return toast.error(r.data?.error || "Fel kod.");
      toast.success("Tvåfaktor aktiverad.");
      onAuthed();
    } finally {
      setBusy(false);
    }
  }

  async function handleTotp() {
    setBusy(true);
    try {
      const r = await api("totp", { userId, code, remember });
      if (!r.ok) return toast.error(r.data?.error || "Fel kod.");
      onAuthed();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="font-display text-xl font-semibold">Admin · CV-piloten</h1>
        </div>

        {step === "login" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">E-post</label>
              <Input className="mt-1" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Lösenord</label>
              <Input className="mt-1" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Kom ihåg mig i 30 dagar
            </label>
            <Button className="w-full" onClick={handleLogin} disabled={busy || !email || !password}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Logga in
            </Button>
          </div>
        )}

        {step === "setPassword" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Första inloggningen. Välj ett lösenord (minst 10 tecken).</p>
            <Input type="password" placeholder="Nytt lösenord" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Input type="password" placeholder="Upprepa lösenord" value={password2} onChange={(e) => setPassword2(e.target.value)} />
            <Button className="w-full" onClick={handleSetPassword} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Spara och fortsätt
            </Button>
          </div>
        )}

        {step === "enroll" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Aktivera tvåfaktor: skanna QR-koden i Google Authenticator, Authy eller liknande, och ange koden.</p>
            {qrDataUrl ? <img src={qrDataUrl} alt="QR-kod för 2FA" className="mx-auto rounded-md border" /> : null}
            {secret ? <p className="text-center text-xs text-muted-foreground break-all">Nyckel: {secret}</p> : null}
            <Input inputMode="numeric" placeholder="6-siffrig kod" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleEnrollVerify()} />
            <Button className="w-full" onClick={handleEnrollVerify} disabled={busy || code.length < 6}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Aktivera och logga in
            </Button>
          </div>
        )}

        {step === "totp" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Ange koden från din authenticator-app.</p>
            <Input inputMode="numeric" placeholder="6-siffrig kod" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleTotp()} />
            <Button className="w-full" onClick={handleTotp} disabled={busy || code.length < 6}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verifiera
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
