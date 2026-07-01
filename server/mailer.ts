/**
 * Transactional email via Resend. If RESEND_API_KEY is not set, sending is a
 * no-op (the result link still works). Never throws to the caller.
 */

const RESEND_URL = "https://api.resend.com/emails";

function fromAddress(): string {
  return process.env.MAIL_FROM || "CV-piloten <onboarding@resend.dev>";
}

export function isMailerConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Send the order confirmation with the 90-day result link. Returns success. */
export async function sendResultEmail(params: {
  to: string;
  serviceName: string;
  resultUrl: string;
  expiresAt: Date;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  if (!params.to || !/.+@.+\..+/.test(params.to)) return false;

  const expires = params.expiresAt.toLocaleDateString("sv-SE");
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
    <h2 style="font-family:Georgia,serif">Tack för din beställning</h2>
    <p>Ditt resultat för <strong>${escapeHtml(params.serviceName)}</strong> är klart och sparat.</p>
    <p>
      <a href="${params.resultUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px">
        Öppna ditt resultat
      </a>
    </p>
    <p style="color:#555;font-size:14px">Länken fungerar utan inloggning och är sparad till och med <strong>${expires}</strong>. Spara gärna mejlet.</p>
    <p style="color:#555;font-size:14px">Vänliga hälsningar,<br/>CV-piloten</p>
  </div>`;

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: fromAddress(),
        to: [params.to],
        subject: "Ditt resultat hos CV-piloten",
        html,
      }),
    });
    if (!res.ok) {
      console.warn("[mailer] Resend error", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[mailer] send failed", e);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
