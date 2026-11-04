import type { Performance } from "@/content/types";
import type { Dict } from "@/lib/dict/en";
import { formatMark, formatWind, getEvent } from "@/lib/events";

/** Places, names and marks for one event, as a readable table on any screen size. */
export function ResultTable({ event, rows, t, extra }: {
  event: string;
  rows: (Performance & { note?: string })[];
  t: Dict;
  /** Extra column, e.g. date and competition in ranking lists. */
  extra?: { heading: string; cell: (i: number) => React.ReactNode };
}) {
  const showWind = getEvent(event).windAffected && rows.some((r) => r.wind !== undefined);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
            <th scope="col" className="w-12 py-2.5 pr-2 font-semibold">{t.place}</th>
            <th scope="col" className="py-2.5 pr-3 font-semibold">{t.athlete}</th>
            <th scope="col" className="hidden py-2.5 pr-3 font-semibold sm:table-cell">{t.club}</th>
            <th scope="col" className="py-2.5 pr-3 text-right font-semibold">{t.mark}</th>
            {showWind && <th scope="col" className="py-2.5 pr-3 text-right font-semibold">{t.wind}</th>}
            {extra && <th scope="col" className="hidden py-2.5 font-semibold md:table-cell">{extra.heading}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.athlete}-${i}`} className="border-b border-line/70 last:border-0 hover:bg-paper/60">
              <td className="py-3 pr-2">
                <span className={`grid size-7 place-items-center rounded-full text-xs font-bold tabular ${
                  i === 0 ? "bg-gold text-night" : i < 3 ? "bg-black/8 text-ink" : "text-muted"}`}>{i + 1}</span>
              </td>
              <td className="py-3 pr-3">
                <span className="font-semibold">{r.athlete}</span>
                <span className="block text-xs text-muted sm:hidden">{r.club}</span>
              </td>
              <td className="hidden py-3 pr-3 text-muted sm:table-cell">{r.club}</td>
              <td className="py-3 pr-3 text-right font-mono font-bold tabular">{formatMark(event, r.mark)}</td>
              {showWind && <td className="py-3 pr-3 text-right font-mono text-xs text-muted tabular">{formatWind(r.wind)}</td>}
              {extra && <td className="hidden py-3 text-xs text-muted md:table-cell">{extra.cell(i)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
