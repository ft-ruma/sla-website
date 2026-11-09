import type { Dict } from "@/lib/dict/en";
import { fill } from "@/lib/i18n";
import { fieldGap, lowerIsBetter, standing, type MarkPoint } from "@/lib/marks";

export { fieldGap, improvement, standing, topPercent } from "@/lib/marks";

// Charts for the member dashboard, drawn as plain SVG on the server. Each one
// answers a question: "how high do I rank?" (RankRing) and "am I improving,
// and by how much?" (TrendChart). Marks carry hover titles; the numbers are
// always written out beside the chart too.

export function RankRing({ place, field, size = 76, label }: { place: number; field: number; size?: number; label: string }) {
  const r = 30, c = 2 * Math.PI * r;
  const share = standing(place, field);
  const podium = place <= 3;
  return (
    <svg viewBox="0 0 76 76" width={size} height={size} role="img" aria-label={label} className="shrink-0">
      <title>{label}</title>
      <circle cx={38} cy={38} r={r} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={7} />
      <circle cx={38} cy={38} r={r} fill="none" stroke={podium ? "var(--color-gold)" : "var(--color-accent)"}
        strokeWidth={7} strokeLinecap="round" strokeDasharray={`${share * c} ${c}`} transform="rotate(-90 38 38)" />
      <text x={38} y={43} textAnchor="middle" fontSize={20} fontWeight={800} fill="currentColor">#{place}</text>
    </svg>
  );
}

/** Marks over the years with "better" always drawn upwards, plus a soft area under the line. */
export function TrendChart({ code, points, label, tall = false }: {
  code: string; points: MarkPoint[]; label: string; tall?: boolean;
}) {
  const W = 420, H = tall ? 180 : 110, L = 12, R = 64, T = 18, B = 26;
  const years = points.map((p) => p.year), values = points.map((p) => p.value);
  const y0 = Math.min(...years), y1 = Math.max(...years);
  const v0 = Math.min(...values), v1 = Math.max(...values);
  const span = v1 - v0 || 1;
  const x = (year: number) => L + ((year - y0) / (y1 - y0 || 1)) * (W - L - R);
  const y = (v: number) => T + (lowerIsBetter(code) ? (v - v0) / span : (v1 - v) / span) * (H - T - B);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.year).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const base = H - B;
  const area = `${line} L${x(y1).toFixed(1)},${base} L${x(y0).toFixed(1)},${base} Z`;
  const last = points[points.length - 1];
  const gid = `g-${code.replace(/\W/g, "")}-${tall ? "t" : "s"}`;
  const midY = [0.25, 0.5, 0.75].map((f) => T + f * (H - T - B));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.32} />
          <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
        </linearGradient>
      </defs>
      {midY.map((yy) => (
        <line key={yy} x1={L} x2={W - R} y1={yy} y2={yy} stroke="var(--color-line)" strokeDasharray="3 5" />
      ))}
      <line x1={L} x2={W - R} y1={base} y2={base} stroke="var(--color-line)" strokeWidth={1} />
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke="var(--color-brand)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p) => (
        <g key={p.year}>
          <circle cx={x(p.year)} cy={y(p.value)} r={14} fill="transparent">
            <title>{`${p.year}: ${p.mark}`}</title>
          </circle>
          <circle cx={x(p.year)} cy={y(p.value)} r={p === last ? 6 : 4.5} fill="var(--color-brand)" stroke="#fff" strokeWidth={2.5} pointerEvents="none" />
          <text x={x(p.year)} y={H - 6} fontSize={11} fill="var(--color-muted)"
            textAnchor={p.year === y0 ? "start" : p.year === y1 ? "end" : "middle"}>{p.year}</text>
        </g>
      ))}
      {tall && (
        <g>
          <rect x={Math.min(x(last.year) - 36, W - R - 78)} y={y(last.value) - 36} width={78} height={28} rx={8} fill="#111827" />
          <text x={Math.min(x(last.year) - 36, W - R - 78) + 39} y={y(last.value) - 17} textAnchor="middle"
            fontSize={11} fontWeight={800} fill="#fff" fontFamily="var(--font-mono, monospace)">{last.mark}</text>
        </g>
      )}
      {!tall && (
        <text x={x(last.year) + 10} y={y(last.value) + 4} fontSize={13} fontWeight={800} fill="var(--color-ink)"
          fontFamily="var(--font-mono, monospace)">{last.mark}</text>
      )}
    </svg>
  );
}

/** Radar of relative standings across events (full = #1). */
export function RadarChart({ rows }: { rows: { label: string; value: number }[] }) {
  const n = rows.length;
  if (n < 3) return null;
  const cx = 110, cy = 110, R = 78;
  const ang = (i: number) => -Math.PI / 2 + (i / n) * Math.PI * 2;
  const pt = (i: number, v: number) => {
    const a = ang(i);
    return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v] as const;
  };
  const poly = rows.map((r, i) => pt(i, Math.max(0.08, Math.min(1, r.value))).join(",")).join(" ");
  const rings = [0.33, 0.66, 1];
  return (
    <svg viewBox="0 0 220 220" className="mx-auto h-auto w-full max-w-[240px]" role="img"
      aria-label={rows.map((r) => `${r.label} ${Math.round(r.value * 100)}%`).join(", ")}>
      {rings.map((v) => (
        <polygon key={v}
          points={rows.map((_, i) => pt(i, v).join(",")).join(" ")}
          fill="none" stroke="rgba(6,7,248,0.12)" strokeWidth={1} />
      ))}
      {rows.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(6,7,248,0.12)" />;
      })}
      <polygon points={poly} fill="rgba(6,7,248,0.18)" stroke="var(--color-brand)" strokeWidth={2.5} />
      {rows.map((r, i) => {
        const [x, y] = pt(i, Math.max(0.08, Math.min(1, r.value)));
        const [lx, ly] = pt(i, 1.18);
        return (
          <g key={r.label}>
            <circle cx={x} cy={y} r={4} fill="var(--color-brand)" stroke="#fff" strokeWidth={2} />
            <text x={lx} y={ly + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--color-ink)">{r.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------
// Athlete: where I sit in the field (histogram of everyone's marks)
// ---------------------------------------------------------------------


export function FieldHistogram({ code, dist, mine, place, t }: {
  code: string; dist: number[]; mine: number; place: number; t: Dict;
}) {
  if (dist.length < 3) return null;
  const lower = lowerIsBetter(code);
  const min = Math.min(...dist), max = Math.max(...dist);
  const bins = Math.min(12, Math.max(5, Math.round(Math.sqrt(dist.length) * 2)));
  const width = (max - min) / bins || 1;
  // bin 0 holds the worst marks, the last bin the best, so better is always to the right
  const binOf = (v: number) => {
    const raw = Math.min(bins - 1, Math.floor((v - min) / width));
    return lower ? bins - 1 - raw : raw;
  };
  const counts = Array.from({ length: bins }, () => 0);
  for (const v of dist) counts[binOf(v)]++;
  const mineBin = binOf(mine);
  const top = Math.max(...counts);
  const W = 300, H = 84, B = 16, gap = 3;
  const bw = W / bins;
  const ahead = dist.filter((v) => (lower ? v > mine : v < mine)).length;
  const gapInfo = fieldGap(code, dist, mine, place);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
        aria-label={fill(t.dashAheadOf, { n: String(ahead), total: String(dist.length - 1) })}>
        {counts.map((n, i) => {
          const h = n ? Math.max(3, (n / top) * (H - B - 14)) : 0;
          const x = i * bw + gap / 2, yTop = H - B - h;
          const isMine = i === mineBin;
          return (
            <g key={i}>
              <rect x={x} y={H - B - (H - B - 14)} width={bw - gap} height={H - B - 14} fill="transparent">
                <title>{`${n}`}</title>
              </rect>
              {n > 0 && (
                <path d={`M${x},${H - B} V${yTop + 3} q0,-3 3,-3 h${bw - gap - 6} q3,0 3,3 V${H - B} Z`}
                  fill={isMine ? "var(--color-accent)" : "rgba(17,17,17,0.14)"} pointerEvents="none" />
              )}
              {isMine && (
                <text x={x + (bw - gap) / 2} y={yTop - 4} textAnchor="middle" fontSize={10} fontWeight={800} fill="var(--color-ink)">
                  {t.dashYou}
                </text>
              )}
            </g>
          );
        })}
        <line x1={0} x2={W} y1={H - B} y2={H - B} stroke="var(--color-line)" />
        <text x={W} y={H - 3} textAnchor="end" fontSize={10} fill="var(--color-muted)">{t.dashFieldBetter}</text>
      </svg>
      <p className="mt-1 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs">
        <span className="text-muted">{fill(t.dashAheadOf, { n: String(ahead), total: String(dist.length - 1) })}</span>
        {gapInfo && (
          <span className="font-bold">
            {gapInfo.leading ? fill(t.dashLeading, { gap: gapInfo.gap }) : fill(t.dashGapNext, { gap: gapInfo.gap, place: String(gapInfo.target) })}
          </span>
        )}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------
// Athlete: strength profile across events, and profile strength ring
// ---------------------------------------------------------------------

const BAR_TONES = ["#0607f8", "#16a34a", "#e85d04", "#7c3aed", "#0891b2", "#db2777"];

export function StrengthBars({ rows }: { rows: { label: string; place: number; field: number; top: string }[] }) {
  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((r, i) => (
        <li key={r.label} title={`${r.label}: #${r.place} / ${r.field}`}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">{r.label}</span>
            <span className="text-xs font-bold tabular-nums text-brand">{r.top} · #{r.place}</span>
          </div>
          <div className="mt-1.5 h-3.5 overflow-hidden rounded-full bg-black/[0.06]">
            <div className="h-full rounded-full transition-[width]"
              style={{ width: `${Math.max(6, standing(r.place, r.field) * 100)}%`, background: BAR_TONES[i % BAR_TONES.length] }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ScoreRing({ value, label, size = 112, tone = "dark" }: {
  value: number; label: string; size?: number; tone?: "dark" | "light";
}) {
  const r = 44, c = 2 * Math.PI * r;
  const light = tone === "light";
  return (
    <svg viewBox="0 0 112 112" width={size} height={size} role="img" aria-label={label} className="shrink-0">
      <title>{label}</title>
      <circle cx={56} cy={56} r={r} fill="none" stroke={light ? "rgba(6,7,248,0.12)" : "rgba(255,255,255,0.14)"} strokeWidth={10} />
      <circle cx={56} cy={56} r={r} fill="none" stroke={light ? "var(--color-brand)" : "var(--color-gold)"} strokeWidth={10} strokeLinecap="butt"
        strokeDasharray={`${value * c} ${c}`} transform="rotate(-90 56 56)" />
      <text x={56} y={54} textAnchor="middle" fontSize={24} fontWeight={900} fill={light ? "var(--color-ink)" : "#fff"}>
        {Math.round(value * 100)}
      </text>
      <text x={56} y={72} textAnchor="middle" fontSize={11} fontWeight={700} fill={light ? "var(--color-muted)" : "rgba(255,255,255,0.7)"}>
        {light ? "OVR" : "%"}
      </text>
    </svg>
  );
}

/** Tiny KPI sparkline — values rise visually; used only for shape, not scale. */
export function Sparkline({ values, rising = true }: { values: number[]; rising?: boolean }) {
  if (values.length < 2) return null;
  const W = 120, H = 34, P = 2;
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const coords = values.map((v, i) => {
    const x = P + (i / (values.length - 1)) * (W - P * 2);
    const y = P + (1 - (v - lo) / span) * (H - P * 2);
    return [x, y] as const;
  });
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `M${coords[0][0].toFixed(1)},${(H - P).toFixed(1)} L${line.replace(/ /g, " L")} L${coords[coords.length - 1][0].toFixed(1)},${(H - P).toFixed(1)} Z`;
  const color = rising ? "#16a34a" : "#c1121f";
  const gid = `sp-${rising ? "up" : "dn"}-${values.length}-${Math.round(values[0] * 100)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-8 w-full" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <polyline fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" points={line} />
    </svg>
  );
}

// ---------------------------------------------------------------------
// Coach: squad by event group (donut), PB verification, squad mix
// ---------------------------------------------------------------------

/** Validated categorical palette, in fixed order (one hue per group, never cycled). */
export const GROUP_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#6250d6"];

export function Donut({ slices, total, centerLabel }: {
  slices: { label: string; value: number; color: string }[]; total: number; centerLabel: string;
}) {
  const r = 46, c = 2 * Math.PI * r;
  const sum = slices.reduce((n, s) => n + s.value, 0) || 1;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 120 120" width={140} height={140} role="img"
        aria-label={slices.map((s) => `${s.label} ${s.value}`).join(", ")} className="shrink-0">
        <circle cx={60} cy={60} r={r} fill="none" stroke="rgba(17,17,17,0.06)" strokeWidth={16} />
        {slices.filter((s) => s.value > 0).map((s) => {
          const len = (s.value / sum) * c;
          const el = (
            <circle key={s.label} cx={60} cy={60} r={r} fill="none" stroke={s.color} strokeWidth={16}
              strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-offset} transform="rotate(-90 60 60)">
              <title>{`${s.label}: ${s.value}`}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
        <text x={60} y={60} textAnchor="middle" fontSize={26} fontWeight={900} fill="var(--color-ink)">{total}</text>
        <text x={60} y={76} textAnchor="middle" fontSize={9} fill="var(--color-muted)">{centerLabel}</text>
      </svg>
      <ul className="flex min-w-36 flex-col gap-1.5 text-sm">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="size-3 shrink-0" style={{ background: s.color }} aria-hidden />
            <span className="flex-1">{s.label}</span>
            <span className="font-bold tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One whole split into parts, with a 2px gap between parts and a legend below. */
export function SplitBar({ parts }: { parts: { label: string; value: number; className: string }[] }) {
  const sum = parts.reduce((n, p) => n + p.value, 0) || 1;
  return (
    <div>
      <div className="flex h-4 gap-[2px]">
        {parts.filter((p) => p.value > 0).map((p) => (
          <div key={p.label} className={p.className} style={{ width: `${(p.value / sum) * 100}%` }} title={`${p.label}: ${p.value}`} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span className={`size-2.5 ${p.className}`} aria-hidden />
            {p.label} <strong className="tabular-nums">{p.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Small columns, one per category, value on the cap. */
export function Columns({ items }: { items: { label: string; value: number }[] }) {
  const top = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex h-28 items-end gap-3">
      {items.map((i) => (
        <div key={i.label} className="flex flex-1 flex-col items-center gap-1" title={`${i.label}: ${i.value}`}>
          <span className="text-xs font-bold tabular-nums">{i.value}</span>
          <div className="w-full max-w-10 rounded-t-[4px] bg-brand" style={{ height: `${Math.max(i.value ? 6 : 0, (i.value / top) * 64)}px` }} />
          <span className="text-xs text-muted">{i.label}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------
// Coach: coaching timeline, one bar per athlete from start to end (or now)
// ---------------------------------------------------------------------

export type Stint = { key: string; label: string; start: number; end: number | null; current: boolean; pending?: boolean };

export function CoachingTimeline({ stints, now, labels }: {
  stints: Stint[]; now: number; labels: { current: string; past: string; pending: string };
}) {
  if (!stints.length) return null;
  const first = Math.min(...stints.map((s) => s.start));
  const last = Math.max(now, ...stints.map((s) => s.end ?? now));
  const span = last - first + 1;
  const pos = (year: number) => ((year - first) / span) * 100;
  const step = span > 12 ? 4 : span > 6 ? 2 : 1;
  const ticks = Array.from({ length: Math.floor((span - 1) / step) + 1 }, (_, i) => first + i * step);
  const ordered = [...stints].sort((a, b) => Number(b.current) - Number(a.current) || a.start - b.start);
  return (
    <div>
      <ul className="flex flex-col gap-2">
        {ordered.map((s) => {
          const end = s.end ?? (s.current ? last : s.start);
          const tip = `${s.label}: ${s.start}–${s.current ? labels.current : s.end ?? "?"}`;
          return (
            <li key={s.key} className="grid grid-cols-[minmax(6rem,9rem)_1fr] items-center gap-3 text-sm" title={tip}>
              <span className="truncate">{s.label}</span>
              <span className="relative h-5 bg-black/[0.04]">
                {ticks.map((y) => (
                  <span key={y} className="absolute inset-y-0 w-px bg-white" style={{ left: `${pos(y)}%` }} aria-hidden />
                ))}
                <span
                  className={`absolute inset-y-0.5 ${s.current ? "bg-accent" : s.pending ? "border border-dashed border-black/40 bg-transparent" : "bg-black/30"}`}
                  style={{ left: `${pos(s.start)}%`, width: `${Math.max(2, ((end - s.start + 1) / span) * 100)}%` }}
                  role="img" aria-label={tip}
                />
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-1 grid grid-cols-[minmax(6rem,9rem)_1fr] gap-3">
        <span />
        <span className="relative h-4 text-xs text-muted">
          {ticks.map((y) => (
            <span key={y} className="absolute -translate-x-1/2" style={{ left: `${pos(y) + 50 / span}%` }}>{y}</span>
          ))}
        </span>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-4 bg-accent" aria-hidden />{labels.current}</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-4 bg-black/30" aria-hidden />{labels.past}</li>
        {stints.some((s) => s.pending) && (
          <li className="flex items-center gap-1.5"><span className="h-2.5 w-4 border border-dashed border-black/40" aria-hidden />{labels.pending}</li>
        )}
      </ul>
    </div>
  );
}
