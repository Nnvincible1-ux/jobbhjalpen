/**
 * GDPR-aware tracking loader. Loads Facebook Pixel and GA4 only after the user
 * has accepted cookies. IDs come from the server (/api/public/tracking), set in
 * the admin panel — nothing is hardcoded.
 *
 * Usage:
 *  - Call initTracking() once at app start. It waits for consent (stored or the
 *    "cookie-consent-accepted" event) before injecting any scripts.
 *  - Call track*() helpers to send standard events (no-op until loaded).
 */

const CONSENT_KEY = "jh_cookie_consent";

type Settings = { fbPixelId: string | null; ga4Id: string | null };

let loaded = false;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function hasConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

async function fetchSettings(): Promise<Settings> {
  try {
    const res = await fetch("/api/public/tracking", { credentials: "omit" });
    if (!res.ok) return { fbPixelId: null, ga4Id: null };
    return (await res.json()) as Settings;
  } catch {
    return { fbPixelId: null, ga4Id: null };
  }
}

function loadFacebookPixel(pixelId: string) {
  if (window.fbq) return;
  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  const fbq = window.fbq as ((...args: unknown[]) => void) | undefined;
  fbq?.("init", pixelId);
  fbq?.("track", "PageView");
}

function loadGa4(measurementId: string) {
  if (window.gtag) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  const gtag = function (...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag = gtag as Window["gtag"];
  gtag("js", new Date());
  gtag("config", measurementId);
}

async function loadIfConsented() {
  if (loaded || !hasConsent()) return;
  const { fbPixelId, ga4Id } = await fetchSettings();
  if (fbPixelId) loadFacebookPixel(fbPixelId);
  if (ga4Id) loadGa4(ga4Id);
  loaded = Boolean(fbPixelId || ga4Id);
}

/** Initialise tracking: load now if consented, otherwise wait for the consent event. */
export function initTracking() {
  if (typeof window === "undefined") return;
  loadIfConsented();
  window.addEventListener("cookie-consent-accepted", () => loadIfConsented(), { once: false });
}

/** Standard events (safe no-ops until pixel/ga4 are loaded). */
export function trackPageView() {
  window.fbq?.("track", "PageView");
  window.gtag?.("event", "page_view");
}

export function trackViewContent(name: string) {
  window.fbq?.("track", "ViewContent", { content_name: name });
  window.gtag?.("event", "view_item", { item_name: name });
}

export function trackInitiateCheckout(name: string, value = 49) {
  window.fbq?.("track", "InitiateCheckout", { content_name: name, value, currency: "SEK" });
  window.gtag?.("event", "begin_checkout", { value, currency: "SEK", item_name: name });
}

export function trackPurchase(name: string, value = 49) {
  window.fbq?.("track", "Purchase", { content_name: name, value, currency: "SEK" });
  window.gtag?.("event", "purchase", { value, currency: "SEK", item_name: name });
}
