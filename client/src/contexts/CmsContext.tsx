import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";

type CmsText = { textKey: string; content: string };
type CmsStyle = { styleKey: string; value: string; cssVar: string | null };
type CmsFaq = { id: number; question: string; answer: string; sortOrder: number };

type CmsValue = {
  getText: (key: string, fallback?: string) => string;
  faq: CmsFaq[];
  isLoading: boolean;
};

const CmsContext = createContext<CmsValue>({
  getText: (_k, f) => f ?? "",
  faq: [],
  isLoading: true,
});

const usePreview = () =>
  typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "draft";

export function CmsProvider({ children }: { children: ReactNode }) {
  const preview = usePreview();
  const { data, isLoading } = trpc.content.all.useQuery(
    preview ? { preview: true } : undefined,
    { staleTime: 60_000 }
  );

  const textMap = useMemo(() => {
    const m = new Map<string, string>();
    (data?.texts as CmsText[] | undefined)?.forEach((t) => m.set(t.textKey, t.content));
    return m;
  }, [data]);

  // Apply CMS styles as CSS variables on :root
  useEffect(() => {
    const styles = data?.styles as CmsStyle[] | undefined;
    if (!styles) return;
    for (const s of styles) {
      if (s.cssVar) document.documentElement.style.setProperty(s.cssVar, s.value);
    }
  }, [data]);

  const value: CmsValue = useMemo(
    () => ({
      getText: (key, fallback) => textMap.get(key) ?? fallback ?? "",
      faq: (data?.faq as CmsFaq[] | undefined) ?? [],
      isLoading,
    }),
    [textMap, data, isLoading]
  );

  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
}

export function useCms() {
  return useContext(CmsContext);
}
