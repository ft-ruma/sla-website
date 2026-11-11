import { ArrowRight, ArrowUpRight, ClipboardCheck, LogIn, MapPin, Trophy, UserRound } from "lucide-react";
import Link from "next/link";
import { ArrowLink } from "@/components/bits";
import { CompetitionCard } from "@/components/CompetitionCard";
import { CountUp } from "@/components/CountUp";
import { ScrollRail } from "@/components/ScrollFx";
import { NavIcon } from "@/components/NavIcon";
import { NewsCard } from "@/components/NewsCard";
import { Container } from "@/components/PageHero";
import { TrackArt } from "@/components/TrackArt";
import { VerifyIdForm } from "@/components/VerifyIdForm";
import type { NavKey } from "@/components/nav";
import { getCompetitions, getNews, getRankings, getRecords, getSettings } from "@/lib/cms";
import { calendar, daysUntil } from "@/lib/competitions";
import { districtName } from "@/lib/districts";
import { formatMark, getEvent } from "@/lib/events";
import { formatDate, formatDateRange } from "@/lib/i18n";
import { pageLang, pageMeta, type LangParams } from "@/lib/page";
import { portal } from "@/lib/portal";

export const revalidate = 300;

export async function generateMetadata({ params }: LangParams) {
  const { lang, t } = await pageLang(params);
  return pageMeta(lang, "", t.siteName);
}

const QUICK: [NavKey, string][] = [
  ["calendar", "/calendar"], ["results", "/results"], ["rankings", "/rankings"],
  ["records", "/records"], ["athletes", "/athletes"], ["clubs", "/clubs"],
];
const NAV_LABEL: Record<string, string> = {
  calendar: "navCalendar", results: "navResults", rankings: "navRankings", records: "navRecords",
  athletes: "navAthletes", clubs: "navClubs",
};

/** "01 / EXPLORE": a thin bar that pins under the header while its section is on screen. */
function SectionBar({ n, title, side, dark = false }: { n: string; title: string; side?: string; dark?: boolean }) {
  return (
    <div aria-hidden className={`section-bar ${dark ? "is-dark" : ""}`}>
      <div className="section-bar-inner">
        <span><span className="section-bar-n">{n}</span><span className="section-bar-sep">/</span>{title}</span>
        {side && <span className="section-bar-side">{side}</span>}
      </div>
    </div>
  );
}

/** Oversized section title with a running number, e.g. "01  LATEST NEWS". */
function BigTitle({ n, title, action, tone = "light", compact = false }: { n: string; title: string; action?: React.ReactNode; tone?: "light" | "dark"; compact?: boolean }) {
  return (
    <div className="reveal mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-8">
      <h2 className="flex items-start gap-3 sm:gap-4">
        <span className="num mt-1 text-base text-accent sm:text-lg">{n}</span>
        <span className={`display ${compact ? "text-3xl sm:text-4xl" : "text-[2rem] sm:text-5xl"} ${tone === "dark" ? "text-white" : "text-ink"}`}>{title}</span>
      </h2>
      {action}
    </div>
  );
}

export default async function Home({ params }: LangParams) {
  const { lang, t } = await pageLang(params);
  const [competitions, news, rankings, allRecords, settings] = await Promise.all([
    getCompetitions(), getNews(), getRankings(), getRecords(), getSettings(),
  ]);
  const { live, upcoming } = calendar(competitions);
  const [lead, ...rest] = news;
  const leaders = rankings.filter((r) => r.rows.length).slice(0, 6);
  const records = allRecords.filter((r) => r.category === "senior").slice(0, 4);
  // editors can override the hero text in /admin/settings
  const hero = {
    kicker: settings.heroKicker?.[lang] || t.heroKicker,
    title: settings.heroTitle?.[lang] || t.heroTitle,
    text: settings.heroText?.[lang] || t.heroText,
  };
  const next = upcoming[0];
  const days = next ? daysUntil(next) : 0;
  const year = new Date().getFullYear();
  const stats = [
    { value: competitions.filter((c) => c.start.startsWith(String(year))).length, label: t.statMeets },
    { value: new Set(rankings.map((r) => r.event)).size, label: t.statEvents },
    { value: allRecords.length, label: t.statRecords },
    { value: 25, label: t.statDistricts },
  ];
  // the ticker: upcoming meets and season-leading marks, shown twice for a seamless loop
  const ticker = [
    ...upcoming.slice(0, 4).map((c) => ({ key: c.id, a: formatDate(lang, c.start, { day: "numeric", month: "short" }), b: c.name[lang] })),
    ...leaders.map((r) => ({ key: `${r.event}-${r.gender}`, a: `${getEvent(r.event).name[lang]} · ${r.gender === "M" ? t.men : t.women}`, b: `${formatMark(r.event, r.rows[0].mark)}  ${r.rows[0].athlete}` })),
  ];
  // the last two words of the headline glow (e.g. "Sri Lanka")
  const words = hero.title.split(" ");
  const cut = words.length >= 4 ? words.length - 2 : words.length;

  return (
    <>
      {live.map((c) => (
        <Link key={c.id} href={`/${lang}/competitions/${c.id}`}
          className="no-print flex items-center justify-center gap-x-3 gap-y-1 bg-clay px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#a10f1a]">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold tracking-[0.14em] uppercase">
            <span className="live-dot size-1.5 rounded-full bg-white" /> {t.liveNow}
          </span>
          <span className="truncate">{c.name[lang]}</span>
          <span className="underline decoration-white/50 underline-offset-4">{t.followLive}</span>
        </Link>
      ))}

      {/* Hero: a full-height stage with giant type, racing streaks and a countdown */}
      <section className="grain relative overflow-hidden bg-night text-white">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60rem_34rem_at_85%_0%,rgb(232_93_4/0.42),transparent_60%),radial-gradient(46rem_34rem_at_0%_100%,rgb(6_7_248/0.45),transparent_60%)]" />
        <TrackArt numbers={false} className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46rem] opacity-60 lg:block" />
        <div aria-hidden className="absolute inset-0 bg-linear-to-r from-night via-night/85 to-night/10" />
        <div aria-hidden className="streaks"><span /><span /><span /><span /></div>
        <p aria-hidden className="display text-outline pointer-events-none absolute -right-4 -bottom-4 text-[6rem] leading-none select-none sm:text-[10rem] lg:-bottom-8 lg:text-[15rem]">SLA</p>

        <Container className="relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.35fr_1fr] lg:py-20">
          <div className="rise flex flex-col items-start">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold tracking-[0.14em] uppercase ring-1 ring-white/20 backdrop-blur-sm">
              <span className="live-dot size-1.5 rounded-full bg-accent" /> {hero.kicker}
            </p>
            <h1 className="display mt-5 max-w-3xl text-[2.4rem] sm:text-6xl lg:text-[4.6rem]">
              {words.slice(0, cut).join(" ")}{" "}
              {cut < words.length && <span className="text-fire inline-block pr-[0.12em] whitespace-nowrap">{words.slice(cut).join(" ")}</span>}
            </h1>
            <p className="mt-5 max-w-xl leading-relaxed text-white/75 text-pretty sm:text-lg">{hero.text}</p>
            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
              <a href={portal.home(lang)} className="btn btn-primary w-full sm:w-auto">{t.register} <ArrowRight className="size-4" aria-hidden /></a>
              <Link href={`/${lang}/sign-in`} className="btn btn-glass w-full sm:w-auto"><LogIn className="size-4" aria-hidden /> {t.signIn}</Link>
            </div>
            <div className="mt-10 w-full max-w-md">
              <p className="mb-2 text-sm font-semibold text-white/70">{t.verifyTitle}</p>
              <VerifyIdForm lang={lang} label={t.verifyLabel} button={t.verifyButton} invalid={t.verifyInvalid} />
            </div>
          </div>

          {next && (
            <div className="rise flex lg:justify-end" style={{ animationDelay: "0.2s" }}>
              <Link href={`/${lang}/competitions/${next.id}`}
                className="group glow relative w-full max-w-sm overflow-hidden rounded-[1.75rem] bg-white/[0.06] p-6 ring-1 ring-white/15 backdrop-blur-xl">
                <div aria-hidden className="absolute -top-16 -right-16 size-48 rounded-full bg-accent/40 blur-3xl" />
                <p className="relative text-xs font-bold tracking-[0.16em] text-accent uppercase">{t.nextUp}</p>
                <div className="relative mt-4 flex items-end gap-3">
                  {days > 0 ? (
                    <>
                      <span className="num text-7xl text-white">{days}</span>
                      <span className="mb-2 text-sm font-bold tracking-wide text-white/70 uppercase">{t.daysToGo}</span>
                    </>
                  ) : <span className="display text-4xl text-fire">{t.startsToday}</span>}
                </div>
                <p className="relative mt-4 text-xl leading-tight font-extrabold text-balance">{next.name[lang]}</p>
                <p className="relative mt-3 text-sm text-white/70">{formatDateRange(lang, next.start, next.end)}</p>
                <p className="relative mt-1 inline-flex items-center gap-1.5 text-sm text-white/70">
                  <MapPin className="size-3.5" aria-hidden /> {next.venue}, {districtName(lang, next.district)}
                </p>
                <span className="relative mt-6 flex items-center justify-between border-t border-white/15 pt-5 text-sm font-bold">
                  {t.fullCalendar}
                  <span className="grid size-10 place-items-center rounded-full bg-accent transition group-hover:rotate-45"><ArrowUpRight className="size-5" aria-hidden /></span>
                </span>
              </Link>
            </div>
          )}
        </Container>
      </section>

      {/* Ticker: meets and season leads sliding past on a slanted orange band */}
      {ticker.length > 0 && (
        <div className="relative z-10 -mt-5 overflow-hidden py-5">
          <div className="band-skew bg-accent py-2.5 text-white shadow-[0_20px_40px_-20px_rgb(232_93_4/0.8)]">
            <div className="marquee">
              <div className="marquee-track">
                {[0, 1].map((copy) => (
                  <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center">
                    {ticker.map((i) => (
                      <li key={`${copy}-${i.key}`} className="flex items-center gap-3 px-6 whitespace-nowrap">
                        <span className="text-xs font-bold tracking-[0.14em] text-white/75 uppercase">{i.a}</span>
                        <span className="display text-lg sm:text-xl">{i.b}</span>
                        <span aria-hidden className="ml-6 text-white/60">✦</span>
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Numbers that count up */}
      <Container className="py-10 sm:py-14">
        <dl className="reveal grid grid-cols-2 gap-px overflow-hidden rounded-[2rem] bg-line ring-1 ring-line lg:grid-cols-4">
          {stats.map((st) => (
            <div key={st.label} className="flex flex-col gap-1.5 bg-white p-5 sm:p-6">
              <dd className="num text-4xl text-ink sm:text-5xl"><CountUp value={st.value} /><span className="text-accent">.</span></dd>
              <dt className="text-sm font-semibold text-muted">{st.label}</dt>
            </div>
          ))}
        </dl>
      </Container>

      {/* Explore: numbered tiles that flip to black on hover */}
      <section id="explore" className="scroll-mt-[var(--header-h)]">
      <SectionBar n="01" title={t.exploreSite} side={t.siteName} />
      <Container className="pt-8 pb-14 sm:pb-20 lg:pt-12">
        <BigTitle n="01" title={t.exploreSite} />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {QUICK.map(([key, path], i) => (
            <li key={key} className="reveal">
              <Link href={`/${lang}${path}`}
                className="group relative flex h-full min-h-28 flex-col justify-between overflow-hidden rounded-[1.5rem] bg-sand p-4 transition duration-300 hover:bg-night hover:text-white sm:min-h-36 sm:p-6">
                <span className="flex items-start justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-white text-ink shadow-sm transition group-hover:bg-accent group-hover:text-white sm:size-11">
                    <NavIcon name={key} className="size-5" />
                  </span>
                  <span className="num text-lg text-ink/25 transition group-hover:text-white/40 sm:text-xl">0{i + 1}</span>
                </span>
                <span className="mt-4 flex items-end justify-between gap-2">
                  <span className="display min-w-0 text-[1.15rem] sm:text-2xl lg:text-3xl">{t[NAV_LABEL[key] as keyof typeof t]}</span>
                  <ArrowUpRight className="mb-0.5 size-5 shrink-0 transition duration-300 group-hover:rotate-45 group-hover:text-accent" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      </section>

      {/* News: one lead story and three more */}
      <section id="news" className="scroll-mt-[var(--header-h)]">
      <SectionBar n="02" title={t.latestNews} side={t.siteName} />
      <Container className="pt-8 pb-14 sm:pb-20 lg:pt-12">
        <BigTitle n="02" title={t.latestNews} action={<ArrowLink href={`/${lang}/news`}>{t.allNews}</ArrowLink>} />
        {lead && <div className="reveal"><NewsCard item={lead} lang={lang} t={t} variant="feature" /></div>}
        {/* Phones: a swipeable row of cards (with the next one peeking in) instead of a long stack. */}
        <div className="no-scrollbar -mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
          {rest.slice(0, 3).map((n, i) => (
            // two columns on tablets show two cards, so the third would sit alone: show it on phones and desktops only
            <div key={n.slug} className={`reveal glow w-[82%] shrink-0 snap-start rounded-[var(--radius-card)] sm:w-auto ${i === 2 ? "sm:max-lg:hidden" : ""}`}>
              <NewsCard item={n} lang={lang} t={t} variant="card" />
            </div>
          ))}
        </div>
      </Container>

      </section>

      {/* Get involved: a dark stage with three bold doors */}
      <section id="involved" className="scroll-mt-[var(--header-h)] bg-night">
      <SectionBar n="03" title={t.getInvolved} side={t.siteName} dark />
      <div className="grain relative overflow-hidden bg-night py-14 text-white sm:py-20">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(40rem_24rem_at_100%_0%,rgb(232_93_4/0.25),transparent_60%),radial-gradient(40rem_24rem_at_0%_100%,rgb(6_7_248/0.3),transparent_60%)]" />
        <p aria-hidden className="display text-outline pointer-events-none absolute -top-4 left-0 text-[5rem] leading-none whitespace-nowrap select-none sm:text-[8rem]">{t.getInvolved}</p>
        <Container className="relative">
          <BigTitle n="03" title={t.getInvolved} tone="dark" />
          <p className="reveal -mt-2 mb-8 max-w-2xl text-white/70 text-pretty">{t.getInvolvedText}</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <a href={portal.athlete(lang)} className="reveal glow group relative flex min-h-64 flex-col gap-3 overflow-hidden rounded-[1.75rem] bg-linear-to-br from-[#ff7a1a] to-[#c2410c] p-7">
              <UserRound aria-hidden className="absolute -right-6 -bottom-6 size-36 text-white/10 transition duration-500 group-hover:scale-110" />
              <span className="grid size-12 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30"><UserRound className="size-6" aria-hidden /></span>
              <h3 className="display text-3xl">{t.athleteCard}</h3>
              <p className="flex-1 text-white/85">{t.athleteCardText}</p>
              <span className="inline-flex items-center gap-2 self-start rounded-full bg-white px-5 py-3 text-sm font-bold text-[#c2410c]">{t.registerAthlete} <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden /></span>
            </a>
            <a href={portal.coach(lang)} className="reveal glow group relative flex min-h-64 flex-col gap-3 overflow-hidden rounded-[1.75rem] bg-linear-to-br from-[#3b3dff] to-[#0405b8] p-7">
              <ClipboardCheck aria-hidden className="absolute -right-6 -bottom-6 size-36 text-white/10 transition duration-500 group-hover:scale-110" />
              <span className="grid size-12 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30"><ClipboardCheck className="size-6" aria-hidden /></span>
              <h3 className="display text-3xl">{t.coachCard}</h3>
              <p className="flex-1 text-white/85">{t.coachCardText}</p>
              <span className="inline-flex items-center gap-2 self-start rounded-full bg-white px-5 py-3 text-sm font-bold text-brand">{t.registerCoach} <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden /></span>
            </a>
            <Link href={`/${lang}/sign-in`} className="reveal glow group relative flex min-h-64 flex-col gap-3 overflow-hidden rounded-[1.75rem] bg-white/[0.06] p-7 ring-1 ring-white/15 backdrop-blur-xl sm:col-span-2 lg:col-span-1">
              <LogIn aria-hidden className="absolute -right-6 -bottom-6 size-36 text-white/[0.06] transition duration-500 group-hover:scale-110" />
              <span className="grid size-12 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20"><LogIn className="size-6" aria-hidden /></span>
              <h3 className="display text-3xl">{t.signInTitle}</h3>
              <p className="flex-1 text-white/70">{t.signInFirstTime}</p>
              <span className="inline-flex items-center gap-2 self-start rounded-full bg-accent px-5 py-3 text-sm font-bold text-white">{t.signIn} <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden /></span>
            </Link>
          </div>
        </Container>
      </div>

      </section>

      {/* Season leaders: big marks, the best one on black */}
      <section id="leaders" className="scroll-mt-[var(--header-h)]">
      <SectionBar n="04" title={t.seasonLeaders} side={t.siteName} />
      <Container className="pt-8 pb-14 sm:pb-20 lg:pt-12">
        <BigTitle n="04" title={t.seasonLeaders} action={<ArrowLink href={`/${lang}/rankings`}>{t.allRankings}</ArrowLink>} />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {leaders.map((r, i) => {
            const top = r.rows[0];
            const star = i === 0;
            return (
              <li key={`${r.event}-${r.gender}`} className="reveal">
                <Link href={`/${lang}/rankings?event=${r.event}&gender=${r.gender}`}
                  className={`glow group relative flex h-full flex-col gap-3 overflow-hidden rounded-[1.5rem] p-4 sm:p-5 ${star ? "grain bg-night text-white" : "bg-sand"}`}>
                  {star && <div aria-hidden className="absolute -top-20 -right-20 size-56 rounded-full bg-accent/40 blur-3xl" />}
                  <span className="relative flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold tracking-[0.14em] uppercase ${star ? "text-white/70" : "text-muted"}`}>
                      {getEvent(r.event).name[lang]} · {r.gender === "M" ? t.men : t.women}
                    </span>
                    <span className={`num grid size-9 place-items-center rounded-full text-base ${star ? "bg-gold text-ink" : "bg-white text-ink"}`}>1</span>
                  </span>
                  <span className="num relative text-[2rem] sm:text-5xl">{formatMark(r.event, top.mark)}</span>
                  <span className={`relative flex items-center justify-between gap-2 border-t pt-3 ${star ? "border-white/15" : "border-ink/10"}`}>
                    <span className="truncate text-sm font-bold sm:text-base">{top.athlete}</span>
                    <ArrowUpRight className="size-5 shrink-0 transition group-hover:rotate-45 group-hover:text-accent" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>

      </section>

      {/* Next competitions beside the national records board */}
      <section id="meets" className="scroll-mt-[var(--header-h)]">
      <SectionBar n="05" title={t.nextMeets} side={t.siteName} />
      <Container className="grid gap-12 pt-8 pb-14 sm:pb-20 lg:grid-cols-[1.25fr_1fr] lg:pt-12">
        <div>
          <BigTitle n="05" compact title={t.nextMeets} action={<ArrowLink href={`/${lang}/calendar`}>{t.fullCalendar}</ArrowLink>} />
          {upcoming.length ? upcoming.slice(0, 4).map((c) => (
            <div key={c.id} className="reveal"><CompetitionCard c={c} lang={lang} t={t} /></div>
          )) : <p className="text-muted">{t.noUpcoming}</p>}
        </div>
        <div className="reveal grain relative self-start overflow-hidden rounded-[1.75rem] bg-night p-6 text-white">
          <div aria-hidden className="absolute -bottom-24 -left-24 size-64 rounded-full bg-brand/50 blur-3xl" />
          <p className="relative flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-accent uppercase"><Trophy className="size-4" aria-hidden /> {t.nationalRecords}</p>
          <ul className="relative mt-4 divide-y divide-white/10">
            {records.map((r) => (
              <li key={`${r.event}-${r.gender}`} className="flex items-center justify-between gap-4 py-4">
                <span className="min-w-0">
                  <span className="block text-xs font-bold tracking-wider text-white/55 uppercase">{getEvent(r.event).name[lang]} · {r.gender === "M" ? t.men : t.women}</span>
                  <span className="block truncate font-semibold">{r.athlete}</span>
                </span>
                <span className="num shrink-0 text-2xl text-fire sm:text-3xl">{formatMark(r.event, r.mark)}</span>
              </li>
            ))}
          </ul>
          <ArrowLink href={`/${lang}/records`} tone="dark" className="relative mt-4">{t.allRecords}</ArrowLink>
        </div>
      </Container>
      </section>

      <ScrollRail label={t.quickLinks} sections={[
        { id: "explore", n: "01", label: t.exploreSite },
        { id: "news", n: "02", label: t.latestNews },
        { id: "involved", n: "03", label: t.getInvolved },
        { id: "leaders", n: "04", label: t.seasonLeaders },
        { id: "meets", n: "05", label: t.nextMeets },
      ]} />
    </>
  );
}
