import { Megaphone, Newspaper, ShieldCheck, Sprout } from "lucide-react";
import Link from "next/link";
import type { NewsCategory, NewsItem } from "@/content/types";
import type { Dict } from "@/lib/dict/en";
import { formatDate, type Lang } from "@/lib/i18n";

const ICONS: Record<NewsCategory, React.ElementType> = {
  news: Newspaper, press: Megaphone, development: Sprout, integrity: ShieldCheck,
};

const ART: Record<NewsCategory, string> = {
  news: "from-[#2563eb] via-[#1e3a8a] to-[#0b1437]",
  press: "from-[#fb923c] via-[#c2410c] to-[#3b1206]",
  development: "from-[#34d399] via-[#047857] to-[#022c22]",
  integrity: "from-[#a78bfa] via-[#5b21b6] to-[#1e1033]",
};

/** Sprint lanes running towards the horizon. */
function Lanes() {
  const lines = Array.from({ length: 9 }, (_, i) => i - 4);
  return (
    <g stroke="white" fill="none">
      {lines.map((i) => (
        <line key={i} x1={600 + i * 6} y1={120} x2={430 + i * 130} y2={560} strokeOpacity={0.35} strokeWidth={i === -4 || i === 4 ? 3 : 1.6} />
      ))}
      <line x1={250} y1={430} x2={960} y2={430} strokeOpacity={0.55} strokeWidth={6} strokeDasharray="14 10" />
      {lines.slice(0, 8).map((i, n) => (
        <text key={n} x={430 + i * 130 + 65} y={505} fill="white" fillOpacity={0.55} fontSize={34} fontWeight={800} textAnchor="middle" stroke="none">{n + 1}</text>
      ))}
    </g>
  );
}

/** A javelin's flight: dashed arc, the javelin, and distance arcs on the ground. */
function Throw() {
  return (
    <g fill="none" stroke="white">
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M ${120 + i * 40} 470 Q 520 ${430 - i * 8} ${920 - i * 30} 470`} strokeOpacity={0.18} strokeWidth={2} />
      ))}
      <path d="M 140 420 Q 420 40 760 360" strokeOpacity={0.6} strokeWidth={3} strokeDasharray="4 12" strokeLinecap="round" />
      <line x1={700} y1={300} x2={800} y2={400} strokeOpacity={0.95} strokeWidth={6} strokeLinecap="round" />
      <circle cx={140} cy={420} r={10} fill="white" fillOpacity={0.6} stroke="none" />
    </g>
  );
}

/** Three hurdles in perspective. */
function Hurdles() {
  const h = (x: number, y: number, w: number, k: number) => (
    <g key={x} strokeOpacity={0.55 + k * 0.15}>
      <line x1={x} y1={y} x2={x} y2={y + w * 0.55} strokeWidth={3 + k} />
      <line x1={x + w} y1={y} x2={x + w} y2={y + w * 0.55} strokeWidth={3 + k} />
      <rect x={x - 4} y={y - 14 - k * 4} width={w + 8} height={14 + k * 4} fill="white" fillOpacity={0.35 + k * 0.2} stroke="none" rx={3} />
    </g>
  );
  return (
    <g stroke="white" fill="none">
      <line x1={0} y1={470} x2={1000} y2={470} strokeOpacity={0.25} strokeWidth={2} />
      {h(560, 250, 110, 0)}
      {h(400, 300, 170, 1)}
      {h(180, 360, 250, 2)}
    </g>
  );
}

/** A podium with the three places. */
function Podium() {
  const block = (x: number, h: number, n: number, o: number) => (
    <g key={n}>
      <rect x={x} y={470 - h} width={150} height={h} rx={10} fill="white" fillOpacity={o} />
      <text x={x + 75} y={470 - h + 70} fill="white" fontSize={56} fontWeight={900} textAnchor="middle" fillOpacity={0.9}>{n}</text>
    </g>
  );
  return (
    <g>
      {block(470, 170, 2, 0.18)}
      {block(630, 240, 1, 0.28)}
      {block(790, 120, 3, 0.14)}
      <circle cx={705} cy={150} r={44} fill="none" stroke="white" strokeOpacity={0.7} strokeWidth={6} />
      <path d="M 680 108 L 705 60 L 730 108" fill="none" stroke="white" strokeOpacity={0.5} strokeWidth={6} />
    </g>
  );
}

const SCENE: Record<NewsCategory, () => React.ReactElement> = { news: Lanes, press: Throw, development: Hurdles, integrity: Podium };

/** Stand-in artwork until SLA has event photography: a bright athletics scene per category. */
export function NewsArt({ category, size = "lg" }: { category: NewsCategory; size?: "lg" | "md" | "sm" }) {
  const Icon = ICONS[category];
  const Scene = SCENE[category];
  return (
    <div aria-hidden className={`absolute inset-0 overflow-hidden bg-linear-to-br ${ART[category]}`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_78%_18%,rgba(255,255,255,0.35),transparent_55%)]" />
      <svg viewBox="0 0 1000 520" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <Scene />
      </svg>
      <span className={`absolute grid place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-sm ${
        size === "lg" ? "top-6 left-6 size-14" : size === "md" ? "top-4 left-4 size-10" : "top-3 left-3 size-7"
      }`}>
        <Icon strokeWidth={1.75} className={size === "lg" ? "size-7" : size === "md" ? "size-5" : "size-3.5"} />
      </span>
    </div>
  );
}

/** Uploaded cover photo: crop to the frame on cards; full file on article pages. */
export function NewsPhoto({ id, className = "" }: { id: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- served from the CMS
    <img
      src={`/api/cms/file/${id}`}
      alt=""
      className={className}
      loading="lazy"
    />
  );
}

/** Cropped cover for list cards, or category art when there is no photo. */
export function NewsVisual({ item, size = "lg" }: { item: NewsItem; size?: "lg" | "md" | "sm" }) {
  if (!item.image) return <NewsArt category={item.category} size={size} />;
  return (
    <NewsPhoto
      id={item.image}
      className="absolute inset-0 h-full w-full object-cover object-center"
    />
  );
}

export function NewsMeta({ item, lang, t }: { item: NewsItem; lang: Lang; t: Dict }) {
  return (
    <p className="text-xs text-muted">
      <time dateTime={item.date}>{formatDate(lang, item.date, { day: "numeric", month: "short", year: "numeric" })}</time>
      <span className="mx-1.5 text-ink/30">|</span>
      <span className="cat">{t[`newsCat_${item.category}` as keyof Dict]}</span>
    </p>
  );
}

export function NewsCard({ item, lang, t, variant = "card" }: {
  item: NewsItem;
  lang: Lang;
  t: Dict;
  variant?: "feature" | "card" | "row";
}) {
  const href = `/${lang}/news/${item.slug}`;

  if (variant === "feature") {
    return (
      <Link href={href} className="group relative flex min-h-[20rem] flex-col justify-end overflow-hidden rounded-3xl text-white sm:min-h-[24rem] lg:min-h-[26rem]">
        <span className="absolute inset-0 transition duration-700 ease-out group-hover:scale-[1.03]">
          <NewsVisual item={item} size="lg" />
        </span>
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/45 to-black/10" aria-hidden />
        <div className="relative flex flex-col gap-3 p-6 sm:p-10 lg:p-12">
          <p className="text-xs font-bold tracking-[0.16em] text-white/85 uppercase">{t[`newsCat_${item.category}` as keyof Dict]}</p>
          <span aria-hidden className="h-px w-16 bg-white/70" />
          <h3 className="max-w-3xl text-[1.75rem] leading-tight font-extrabold tracking-tight text-balance sm:text-4xl lg:text-5xl">{item.title[lang]}</h3>
          <p className="max-w-xl text-base text-white/75 text-pretty">{item.summary[lang]}</p>
          <span className="mt-1 text-sm font-medium underline decoration-white/50 underline-offset-4 group-hover:decoration-white">{t.readMore}</span>
        </div>
      </Link>
    );
  }

  if (variant === "row") {
    return (
      <Link href={href} className="group block py-1">
        <NewsMeta item={item} lang={lang} t={t} />
        <h3 className="mt-2 text-lg leading-snug font-bold tracking-tight text-ink text-pretty decoration-accent decoration-2 underline-offset-4 group-hover:underline">{item.title[lang]}</h3>
      </Link>
    );
  }

  return (
    <Link href={href} className="group card card-hover flex h-full flex-col p-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-night">
        <span className="absolute inset-0 transition duration-700 ease-out group-hover:scale-[1.04]">
          <NewsVisual item={item} size="md" />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-2 pt-4 pb-2">
        <NewsMeta item={item} lang={lang} t={t} />
        <h3 className="text-xl leading-snug font-bold tracking-tight text-ink text-pretty decoration-accent decoration-2 underline-offset-4 group-hover:underline">{item.title[lang]}</h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted">{item.summary[lang]}</p>
      </div>
    </Link>
  );
}
