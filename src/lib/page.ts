import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLang, LANGS, type Lang } from "./i18n";
import { SITE_URL } from "./portal";

export type LangParams = { params: Promise<{ lang: string }> };

/** Resolve the language segment of a page, or 404 for an unknown one. */
export async function pageLang(params: LangParams["params"]) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return { lang, t: getDict(lang) };
}

export const langParams = () => LANGS.map((lang) => ({ lang }));

/** Title, description and hreflang alternates for a page at /{lang}{path}. */
export function pageMeta(lang: Lang, path: string, title: string, description?: string): Metadata {
  const t = getDict(lang);
  return {
    title: path === "" ? `${t.siteName} · ${t.siteTagline}` : `${title} · ${t.siteName}`,
    description: description ?? t.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/${lang}${path}`,
      languages: Object.fromEntries(LANGS.map((l) => [l, `${SITE_URL}/${l}${path}`])),
    },
    openGraph: { title, description: description ?? t.metaDescription, siteName: t.siteName, locale: lang, type: "website" },
  };
}
