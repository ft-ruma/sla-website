/** Lane lines curving in from the right edge: decoration behind inner-page titles. */
function LaneLines() {
  const radii = Array.from({ length: 8 }, (_, i) => 180 + i * 34);
  return (
    <svg viewBox="0 0 520 420" aria-hidden focusable="false" preserveAspectRatio="xMaxYMid slice"
      className="pointer-events-none absolute inset-y-0 right-0 h-full w-[70%] max-w-[36rem] opacity-70 sm:w-[55%]">
      <defs>
        <linearGradient id="lane-fade" x1="0" x2="1">
          <stop offset="0" stopColor="white" stopOpacity="0" />
          <stop offset="0.6" stopColor="white" stopOpacity="0.16" />
          <stop offset="1" stopColor="white" stopOpacity="0.28" />
        </linearGradient>
      </defs>
      {radii.map((r) => (
        <circle key={r} cx="560" cy="470" r={r} fill="none" stroke="url(#lane-fade)" strokeWidth="1.5" />
      ))}
      <circle cx="560" cy="470" r={radii[3] + 17} fill="none" stroke="#e85d04" strokeOpacity="0.55"
        strokeWidth="3" strokeDasharray="2 14" strokeLinecap="round" />
    </svg>
  );
}

/** Inner-page title: the same dark, warm-lit stage as the home page, so every
    section feels part of one site. Children (search, badges) sit under the intro. */
export function PageHero({ title, intro, kicker, children }: {
  title: string;
  intro?: string;
  kicker?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="grain relative overflow-hidden bg-night text-white">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(42rem_22rem_at_88%_0%,rgb(232_93_4/0.38),transparent_65%),radial-gradient(34rem_22rem_at_0%_110%,rgb(6_7_248/0.4),transparent_65%)]" />
      <LaneLines />
      <div className="rise relative mx-auto max-w-6xl px-4 pt-9 pb-10 sm:px-6 sm:pt-12 sm:pb-14">
        {kicker && (
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold tracking-[0.14em] uppercase ring-1 ring-white/20 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden /> {kicker}
          </p>
        )}
        <h1 className="display max-w-4xl text-[2.25rem] text-balance sm:text-5xl lg:text-6xl">{title}</h1>
        {intro && <p className="mt-3 max-w-2xl leading-relaxed text-white/75 text-pretty sm:text-lg">{intro}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-linear-to-r from-accent via-accent/60 to-brand" />
    </section>
  );
}

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function SectionHeading({ title, kicker, intro, action, tone = "light" }: {
  title: string;
  kicker?: string;
  intro?: string;
  action?: React.ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="max-w-2xl">
        <p className={`label mb-3 ${tone === "dark" ? "text-white" : "text-ink"}`}>{kicker ?? title}</p>
        {kicker && <h2 className={`display text-3xl sm:text-4xl ${tone === "dark" ? "text-white" : "text-ink"}`}>{title}</h2>}
        {intro && <p className={`mt-2 max-w-xl text-pretty ${tone === "dark" ? "text-white/70" : "text-muted"}`}>{intro}</p>}
      </div>
      {action}
    </div>
  );
}
