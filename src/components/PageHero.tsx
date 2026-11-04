/** Inner-page title: World Athletics style — white, mixed-case, small section label. */
export function PageHero({ title, intro, kicker, children }: {
  title: string;
  intro?: string;
  kicker?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-sand">
      {/* soft colour and running-lane lines behind the title */}
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(40rem_18rem_at_90%_0%,rgb(232_93_4/0.14),transparent_70%),radial-gradient(30rem_16rem_at_10%_120%,rgb(6_7_248/0.08),transparent_70%)]" />
      <div aria-hidden className="absolute inset-y-0 right-0 hidden w-1/3 opacity-[0.06] md:block"
        style={{ backgroundImage: "repeating-linear-gradient(115deg, #111 0 2px, transparent 2px 38px)" }} />
      <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-12 sm:px-6 sm:pt-14 sm:pb-16">
        {kicker && <p className="label mb-4 text-ink">{kicker}</p>}
        <h1 className="max-w-4xl text-[2.05rem] leading-[1.12] font-extrabold tracking-tight text-balance sm:text-6xl">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-[1.08rem] leading-relaxed text-muted text-pretty sm:text-lg">{intro}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
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
        {kicker && <h2 className={`text-2xl font-bold sm:text-3xl ${tone === "dark" ? "text-white" : "text-ink"}`}>{title}</h2>}
        {intro && <p className={`mt-2 max-w-xl text-pretty ${tone === "dark" ? "text-white/70" : "text-muted"}`}>{intro}</p>}
      </div>
      {action}
    </div>
  );
}
