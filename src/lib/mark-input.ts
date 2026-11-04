import type { Performance, RankingEntry } from "@/content/types";
import { formatMark, formatWind, getEvent } from "./events";

// Marks as editors type them, and result rows pasted from a spreadsheet.
// Stored marks are integers: milliseconds for times, millimetres for
// distances and heights, points for combined events (see events.ts).

/** "10.21" → 10210, "1:52.30" → 112300, "2:14:14" → 8054000, "7.68" → 7680 (for LJ), "8150" → 8150. */
export function parseMarkInput(code: string, text: string): number | null {
  const v = text.trim().replace(",", ".");
  const { measurement } = getEvent(code);
  if (measurement === "POINTS") return /^\d{1,5}$/.test(v) ? Number(v) : null;
  if (measurement !== "TIME") return /^\d{1,3}(\.\d{1,2})?$/.test(v) ? Math.round(Number(v) * 1000) : null;
  const m = v.match(/^(?:(\d{1,2}):)?(?:(\d{1,2}):)?(\d{1,2})(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  // with two colons the first part is hours; with one it is minutes
  const [h, min] = m[2] !== undefined ? [Number(m[1]), Number(m[2])] : [0, Number(m[1] ?? 0)];
  const sec = Number(m[3]);
  if (min > 59 || sec > 59) return null;
  const hundredths = m[4] ? Number(m[4].padEnd(2, "0")) : 0;
  return ((h * 3600 + min * 60 + sec) * 100 + hundredths) * 10;
}

function parseWind(text: string | undefined): number | undefined | null {
  const v = (text ?? "").trim().replace(",", ".");
  if (!v) return undefined;
  return /^[+-]?\d{1,2}(\.\d)?$/.test(v) ? Number(v) : null;
}

const split = (line: string) => (line.includes("\t") ? line.split("\t") : line.split(",")).map((s) => s.trim());

/**
 * One athlete per line: "athlete, club, mark, wind" for results, and
 * "athlete, club, mark, wind, date, competition" for rankings. Tabs work too
 * (pasted from a spreadsheet). Returns the rows and any lines it could not read.
 */
export function parseRows(code: string, text: string, kind: "result"): { rows: Performance[]; errors: string[] };
export function parseRows(code: string, text: string, kind: "ranking"): { rows: RankingEntry[]; errors: string[] };
export function parseRows(code: string, text: string, kind: "result" | "ranking") {
  const rows: (Performance | RankingEntry)[] = [];
  const errors: string[] = [];
  text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((line, i) => {
    const [athlete, club = "", markText = "", windText, date, competition] = split(line);
    const mark = parseMarkInput(code, markText);
    const wind = parseWind(windText);
    const badDate = kind === "ranking" && !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "");
    if (!athlete || mark === null || wind === null || badDate || (kind === "ranking" && !competition)) {
      errors.push(`Line ${i + 1}: ${line}`);
      return;
    }
    const base: Performance = { athlete: athlete.slice(0, 120), club: club.slice(0, 120), mark, ...(wind !== undefined ? { wind } : {}) };
    rows.push(kind === "ranking" ? { ...base, date: date!, competition: competition!.slice(0, 120) } : base);
  });
  return { rows, errors };
}

/** Rows back into the same text, for the edit form. */
export function rowsToText(code: string, rows: (Performance & Partial<RankingEntry>)[], kind: "result" | "ranking") {
  return rows.map((r) => {
    const parts = [r.athlete, r.club, formatMark(code, r.mark), r.wind !== undefined ? formatWind(r.wind) : ""];
    if (kind === "ranking") parts.push(r.date ?? "", r.competition ?? "");
    return parts.join(", ");
  }).join("\n");
}
