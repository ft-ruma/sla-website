import type { L10n } from "@/lib/i18n";

export type NewsCategory = "news" | "press" | "development" | "integrity";

export type NewsItem = {
  slug: string;
  date: string;
  category: NewsCategory;
  title: L10n;
  summary: L10n;
  /** Paragraphs, in each language. */
  body: Record<keyof L10n, string[]>;
  /** Uploaded cover photo (file id), shown instead of the illustration. */
  image?: string;
};

export type CompetitionCategory = "national" | "provincial" | "schools" | "university" | "forces" | "club" | "road";

export type Competition = {
  id: string;
  name: L10n;
  category: CompetitionCategory;
  venue: string;
  district: string;
  start: string;
  end: string;
  /** Last day entries are accepted, if entries are taken online. */
  entryDeadline?: string;
  results?: EventResults[];
  /** Uploaded PDF circular (file id). */
  circular?: string;
};

export type Performance = {
  athlete: string;
  club: string;
  /** Milliseconds, millimetres or points; see lib/events.ts. */
  mark: number;
  wind?: number;
};

export type EventResults = {
  event: string;
  gender: "M" | "F";
  stage: "provisional" | "official";
  rows: Performance[];
};

export type RankingEntry = Performance & { date: string; competition: string };

export type RankingList = { event: string; gender: "M" | "F"; season: number; rows: RankingEntry[] };

export type NationalRecord = Performance & {
  event: string;
  gender: "M" | "F";
  year: number;
  venue: string;
  category: "senior" | "junior";
};

/** A PDF on the Downloads page. */
export type Download = { id: string; title: L10n; file: string; name: string; date: string };

/** Site-wide settings editable in /admin. Missing values fall back to the built-in text. */
export type SiteSettings = {
  sampleNotice: boolean;
  heroKicker?: L10n;
  heroTitle?: L10n;
  heroText?: L10n;
};
