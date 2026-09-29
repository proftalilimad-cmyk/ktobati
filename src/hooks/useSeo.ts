import { useEffect } from 'react';

interface SeoOptions {
  title: string;
  description?: string;
  canonicalPath?: string;
  jsonLd?: Record<string, unknown> | null;
}

const SITE = 'المكتبة الإلكترونية العربية';
const ORIGIN = 'https://maktaba.example';

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Per-page SEO: title, description, canonical, OG tags and JSON-LD. */
export function useSeo({ title, description, canonicalPath, jsonLd }: SeoOptions) {
  useEffect(() => {
    const full = title.includes(SITE) ? title : `${title} | ${SITE}`;
    document.title = full;
    if (description) {
      setMeta('name', 'description', description);
      setMeta('property', 'og:description', description);
    }
    setMeta('property', 'og:title', full);

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    const path = canonicalPath ?? window.location.pathname;
    link.href = `${ORIGIN}${path}`;

    const scriptId = 'page-jsonld';
    document.getElementById(scriptId)?.remove();
    if (jsonLd) {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.id = scriptId;
      s.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(s);
    }
    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [title, description, canonicalPath, jsonLd]);
}
