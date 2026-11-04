import { en, type Dict } from "./dict/en";
import { si } from "./dict/si";
import { ta } from "./dict/ta";
import type { Lang } from "./langs";

export * from "./langs";

/** Intl locale for dates and numbers. */
export const LOCALES: Record<Lang, string> = { si: "si-LK", ta: "ta-LK", en: "en-GB" };

/** Text in all three languages, as stored in the content files. */
export type L10n = Record<Lang, string>;

const DICTS: Record<Lang, Dict> = { en, si, ta };

export function getDict(lang: Lang): Dict {
  return DICTS[lang];
}

/** Fill {name} placeholders. */
export function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

const LONG_DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
const colomboDay = (iso: string) => new Date(`${iso}T00:00:00+05:30`);

export function formatDate(lang: Lang, iso: string, opts: Intl.DateTimeFormatOptions = LONG_DATE) {
  return new Intl.DateTimeFormat(LOCALES[lang], { timeZone: "Asia/Colombo", ...opts }).format(colomboDay(iso));
}

/** "18–20 September 2026", or a single day. */
export function formatDateRange(lang: Lang, start: string, end: string) {
  return new Intl.DateTimeFormat(LOCALES[lang], { timeZone: "Asia/Colombo", ...LONG_DATE }).formatRange(colomboDay(start), colomboDay(end));
}

/** Today's date in Sri Lanka as YYYY-MM-DD. */
export function todayInColombo() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(new Date());
}

/** Whole days from today in Colombo to a calendar date. Negative if the date has passed. */
export function daysUntil(iso: string) {
  const t0 = Date.parse(`${todayInColombo()}T00:00:00+05:30`);
  const t1 = Date.parse(`${iso}T00:00:00+05:30`);
  return Math.round((t1 - t0) / 86_400_000);
}
