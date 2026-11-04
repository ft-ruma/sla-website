import type { Dict } from "./dict/en";
import { EVENTS } from "./events";
import { fill } from "./i18n";

// Marks as numbers, for charts: seconds for times ("10.85", "1:52.30",
// "2:15:30"; "2.15.30" is read as 2:15.30), metres for distances and
// heights, points for combined events. Same rule as slaa.mark_value().

export function markValue(mark: string | null | undefined): number | null {
  const t = String(mark ?? "").trim();
  if (!/^[0-9]{1,5}([:.][0-9]{1,2}){0,2}$/.test(t)) return null;
  const norm = (t.match(/\./g)?.length ?? 0) >= 2 ? t.replace(/\.(?=.*\.)/g, ":") : t;
  return norm.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
}

/** Faster is better for runs and walks; further, higher or more points otherwise. */
export function lowerIsBetter(code: string) {
  const m = EVENTS.find((e) => e.code === code)?.measurement;
  return m === undefined || m === "TIME";
}

export type MarkPoint = { year: number; mark: string; value: number };

/** The best mark per year from a list of (year, mark) pairs, oldest first. */
export function bestPerYear(code: string, marks: { year: number | null; mark: string | null }[]): MarkPoint[] {
  const better = (a: number, b: number) => (lowerIsBetter(code) ? a < b : a > b);
  const byYear = new Map<number, MarkPoint>();
  for (const m of marks) {
    const value = markValue(m.mark);
    if (!m.year || value === null) continue;
    const held = byYear.get(m.year);
    if (!held || better(value, held.value)) byYear.set(m.year, { year: m.year, mark: m.mark!, value });
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year);
}

/** Share of the field at or below this place: first place = 1. */
export const standing = (place: number, field: number) => (field - place + 1) / field;
/** "Top 17%": the place as a share of the field, rounded up. */
export const topPercent = (place: number, field: number) => Math.max(1, Math.ceil((place / field) * 100));

/** How a series of marks changed from the first year to the last, as text. */
export function improvement(code: string, points: MarkPoint[], t: Dict) {
  if (points.length < 2) return null;
  const first = points[0], last = points[points.length - 1];
  const lower = lowerIsBetter(code);
  const diff = last.value - first.value;
  const better = lower ? diff < 0 : diff > 0;
  const abs = Math.abs(diff);
  const unit = lower ? "s" : abs >= 100 ? "pts" : "m";
  const amount = unit === "pts" ? Math.round(abs).toLocaleString("en") : abs.toFixed(2);
  const pct = first.value ? Math.abs((diff / first.value) * 100).toFixed(1) : "0";
  return {
    better,
    text: fill(better ? t.dashImproved : t.dashNotImproved, { delta: `${amount} ${unit}`, pct, year: String(first.year) }),
  };
}

/** Gap to the next better mark, or the lead over the next one when first. */
export function fieldGap(code: string, dist: number[], mine: number, place: number) {
  const lower = lowerIsBetter(code);
  const sorted = [...dist].sort((a, b) => (lower ? a - b : b - a)); // best first
  const fmt = (v: number) => (lower ? `${v.toFixed(2)} s` : v >= 100 ? `${Math.round(v)} pts` : `${v.toFixed(2)} m`);
  if (place <= 1) {
    const next = sorted.find((v) => v !== mine);
    return next === undefined ? null : { leading: true, gap: fmt(Math.abs(next - mine)), target: 2 };
  }
  const better = sorted.filter((v) => (lower ? v < mine : v > mine));
  const target = better[better.length - 1];
  return target === undefined ? null : { leading: false, gap: fmt(Math.abs(mine - target)), target: place - 1 };
}
