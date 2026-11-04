import "server-only";
import { unstable_cache } from "next/cache";
import { COMPETITIONS, NEWS, PAGES, RANKINGS, RECORDS, SAMPLE_CONTENT, type PageKey } from "@/content";
import type { InfoPage } from "@/content/pages";
import type { Competition, Download, NationalRecord, NewsItem, RankingList, SiteSettings } from "@/content/types";
import { sql } from "./db";

// The website's content. With a database, it comes from the CMS edited in
// /admin (db/cms.sql); without one, or if the CMS is not set up, from the
// built-in files in src/content. Cached for five minutes, and refreshed at
// once when an editor saves (revalidateTag("cms")).

export type CmsKind = "news" | "competition" | "ranking" | "record" | "page" | "download" | "setting";
export type CmsItem<T> = { key: string; doc: T; published: boolean; updated_at: string; updated_by: string | null };

/** Published items of one kind. Throws when the CMS cannot be read, so the failure is not cached. */
async function readKind<T>(kind: CmsKind): Promise<CmsItem<T>[]> {
  const [row] = await sql!<{ items: CmsItem<T>[] }[]>`SELECT web.cms_items(${kind}, NULL) AS items`;
  return row?.items ?? [];
}

/** Cached items, or null when there is no database or the CMS cannot be read. */
const cached = <T>(kind: CmsKind) => async (): Promise<CmsItem<T>[] | null> => {
  if (!sql) return null;
  try {
    return await unstable_cache(() => readKind<T>(kind), ["cms", kind], { tags: ["cms"], revalidate: 300 })();
  } catch (e) {
    console.error(`cms: could not read ${kind}`, (e as Error).message);
    return null;
  }
};

const docs = async <T>(kind: CmsKind, fallback: T[]) => {
  const items = await cached<T>(kind)();
  return items === null ? fallback : items.map((i) => i.doc);
};

export async function getNews(): Promise<NewsItem[]> {
  return (await docs<NewsItem>("news", NEWS)).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getCompetitions(): Promise<Competition[]> {
  return docs<Competition>("competition", COMPETITIONS);
}

export async function getRankings(): Promise<RankingList[]> {
  return docs<RankingList>("ranking", RANKINGS);
}

export async function getRecords(): Promise<NationalRecord[]> {
  return docs<NationalRecord>("record", RECORDS);
}

export async function getDownloads(): Promise<Download[]> {
  return (await docs<Download>("download", [])).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPage(key: PageKey): Promise<InfoPage> {
  const items = await cached<InfoPage & { key: PageKey }>("page")();
  return items?.find((i) => i.doc.key === key)?.doc ?? PAGES[key];
}

export async function getSettings(): Promise<SiteSettings> {
  const items = await cached<SiteSettings>("setting")();
  return items?.find((i) => i.key === "site")?.doc ?? { sampleNotice: SAMPLE_CONTENT };
}

/** Address of an uploaded photo or PDF. */
export const fileUrl = (id: string) => `/api/cms/file/${id}`;
