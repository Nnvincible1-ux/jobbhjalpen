import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type TenantInfo = {
  slug: string;
  name: string;
  type: "consumer" | "coach";
  logoText?: string | null;
  colorPrimary?: string | null;
  colorAccent?: string | null;
  tagline?: string | null;
};

const TenantContext = createContext<{ tenant: TenantInfo | null; loading: boolean }>({
  tenant: null,
  loading: true,
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dev: allow ?tenant=slug to preview a white-label skin.
    const qp = new URLSearchParams(window.location.search).get("tenant");
    const url = qp ? `/api/service/tenant?tenant=${encodeURIComponent(qp)}` : "/api/service/tenant";
    fetch(url)
      .then((r) => r.json())
      .then((t: TenantInfo) => {
        setTenant(t);
        // Apply white-label brand colors as CSS variables.
        if (t.colorPrimary) document.documentElement.style.setProperty("--brand-primary", t.colorPrimary);
        if (t.colorAccent) document.documentElement.style.setProperty("--brand-accent", t.colorAccent);
      })
      .catch(() => setTenant({ slug: "default", name: "Jobbhjälpen", type: "consumer" }))
      .finally(() => setLoading(false));
  }, []);

  return <TenantContext.Provider value={{ tenant, loading }}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}
