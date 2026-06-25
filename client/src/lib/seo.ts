import { useEffect } from "react";

type SEO = {
  title: string;
  description: string;
  path: string;
};

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.head.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Client-side SEO for SPA navigation. The server injects meta for the initial
 * load (crawlers); this keeps it correct as the user navigates.
 */
export function useSEO({ title, description, path }: SEO) {
  useEffect(() => {
    document.title = title;
    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", "website", "property");
    if (typeof window !== "undefined") {
      setCanonical(`${window.location.origin}${path}`);
    }
  }, [title, description, path]);
}

/** Inject JSON-LD structured data (Article / FAQPage). */
export function useJsonLd(id: string, data: object | null) {
  useEffect(() => {
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    if (!data) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = id;
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, [id, data]);
}
