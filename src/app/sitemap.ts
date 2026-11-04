import type { MetadataRoute } from "next";
import { getCompetitions, getNews } from "@/lib/cms";
import { LANGS } from "@/lib/langs";
import { SITE_URL } from "@/lib/portal";

const STATIC = ["", "/news", "/calendar", "/results", "/rankings", "/records", "/athletes", "/clubs", "/coaches",
  "/development", "/anti-doping", "/about", "/downloads", "/privacy", "/terms"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [news, competitions] = await Promise.all([getNews(), getCompetitions()]);
  const paths = [
    ...STATIC,
    ...news.map((n) => `/news/${n.slug}`),
    ...competitions.map((c) => `/competitions/${c.id}`),
  ];
  return paths.map((path) => ({
    url: `${SITE_URL}/en${path}`,
    alternates: { languages: Object.fromEntries(LANGS.map((l) => [l, `${SITE_URL}/${l}${path}`])) },
  }));
}
