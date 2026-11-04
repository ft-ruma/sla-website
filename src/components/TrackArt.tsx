/** The bend of an eight-lane track seen from above, drawn in SVG so it needs no photos. */
export function TrackArt({ className = "", numbers = true, animate = true }: { className?: string; numbers?: boolean; animate?: boolean }) {
  const cx = 430, cy = 640, inner = 250, lane = 32, lanes = 8;
  const outer = inner + lane * lanes;
  const arc = (r: number, sweep: 0 | 1 = 1) =>
    sweep ? `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}` : `L ${cx + r} ${cy} A ${r} ${r} 0 0 0 ${cx - r} ${cy}`;
  const radii = Array.from({ length: lanes + 1 }, (_, i) => inner + i * lane);
  const runY = 530;

  return (
    <svg viewBox="0 0 680 600" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id="clay" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ef6a3f" />
          <stop offset="1" stopColor="#b8391a" />
        </linearGradient>
        <radialGradient id="infield" cx="0.5" cy="1" r="0.8">
          <stop offset="0" stopColor="#0f6b3a" />
          <stop offset="1" stopColor="#0a3a24" />
        </radialGradient>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.7" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="fade-mask">
          <rect width="680" height="600" fill="url(#fade)" />
        </mask>
      </defs>
      <g mask="url(#fade-mask)">
        <path d={`${arc(inner)} Z`} fill="url(#infield)" opacity="0.9" />
        <path d={`${arc(outer)} ${arc(inner, 0)} Z`} fill="url(#clay)" />
        {radii.map((r) => (
          <path key={r} d={arc(r)} fill="none" stroke="white" strokeOpacity={0.85} strokeWidth={r === inner || r === outer ? 3 : 1.6} />
        ))}
        {/* finish line */}
        <line x1={cx} y1={cy - outer} x2={cx} y2={cy - inner} stroke="white" strokeWidth="6" strokeDasharray="6 6" />
        {/* one athlete's line through lane 4, in lion gold */}
        <path d={arc(inner + lane * 3.5)} pathLength={1} fill="none" stroke="#f8e800" strokeWidth="5" strokeLinecap="round"
          className={animate ? "draw" : undefined} style={{ filter: "drop-shadow(0 0 8px rgb(248 232 0 / 0.7))" }} />
      </g>
      {numbers && radii.slice(0, lanes).map((r, i) => {
        const mid = r + lane / 2;
        return (
          <text key={r} x={cx - Math.sqrt(mid * mid - (cy - runY) ** 2)} y={runY} textAnchor="middle" dominantBaseline="middle"
            fill="white" fontSize="18" fontWeight="800" fontFamily="ui-sans-serif, system-ui, sans-serif" opacity="0.9">{i + 1}</text>
        );
      })}
    </svg>
  );
}
