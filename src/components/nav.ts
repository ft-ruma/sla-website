import type { Dict } from "@/lib/dict/en";
import type { Lang } from "@/lib/langs";

export type NavKey =
  | "news" | "calendar" | "results" | "rankings" | "records" | "athletes" | "clubs" | "coaches"
  | "development" | "about" | "antiDoping" | "downloads";
export type NavItem = { key: NavKey; href: string; label: string };
export type NavGroup = { title: string; items: NavItem[] };

const PATHS: Record<NavKey, string> = {
  news: "/news", calendar: "/calendar", results: "/results", rankings: "/rankings", records: "/records",
  athletes: "/athletes", clubs: "/clubs", coaches: "/coaches", development: "/development", about: "/about",
  antiDoping: "/anti-doping", downloads: "/downloads",
};

const LABELS: Record<NavKey, keyof Dict> = {
  news: "navNews", calendar: "navCalendar", results: "navResults", rankings: "navRankings", records: "navRecords",
  athletes: "navAthletes", clubs: "navClubs", coaches: "navCoaches", development: "navDevelopment", about: "navAbout",
  antiDoping: "navAntiDoping", downloads: "navDownloads",
};

const item = (lang: Lang, t: Dict, key: NavKey): NavItem => ({ key, href: `/${lang}${PATHS[key]}`, label: t[LABELS[key]] });

/** The main bar on wide screens. */
export function mainNav(lang: Lang, t: Dict): NavItem[] {
  return (["news", "calendar", "results", "rankings", "athletes", "clubs"] as const).map((k) => item(lang, t, k));
}

/** Everything, grouped, for the menu panel and the footer. */
export function fullNav(lang: Lang, t: Dict): NavGroup[] {
  const group = (title: string, keys: NavKey[]) => ({ title, items: keys.map((k) => item(lang, t, k)) });
  return [
    group(t.navCompete, ["calendar", "results", "rankings", "records"]),
    group(t.navCommunity, ["athletes", "clubs", "coaches", "development"]),
    group(t.navOrganisation, ["news", "about", "antiDoping", "downloads"]),
  ];
}
