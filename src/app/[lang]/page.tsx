import { ArrowRight, ClipboardCheck, LogIn, MapPin, Medal, Trophy, UserRound } from "lucide-react";
import Link from "next/link";
import { ArrowLink } from "@/components/bits";
import { CompetitionCard } from "@/components/CompetitionCard";
import { NavIcon } from "@/components/NavIcon";
import { NewsCard } from "@/components/NewsCard";
import { Container, SectionHeading } from "@/components/PageHero";
import { TrackArt } from "@/components/TrackArt";
import { VerifyIdForm } from "@/components/VerifyIdForm";
import type { NavKey } from "@/components/nav";
import { getCompetitions, getNews, getRankings, getRecords, getSettings } from "@/lib/cms";
import { calendar } from "@/lib/competitions";
import { districtName } from "@/lib/districts";
import { formatMark, getEvent } from "@/lib/events";
import { formatDateRange } from "@/lib/i18n";
import { pageLang, pageMeta, type LangParams } from "@/lib/page";
import { portal } from "@/lib/portal";

export const revalidate = 3600;

export async function generateMetadata({ params }: LangParams) {
  const { lang, t } = await pageLang(params);
  return pageMeta(lang, "", t.siteName);
}

const QUICK: [NavKey, string, keyof typeof TILE_TONE][] = [
  ["calendar", "/calendar", "orange"],
  ["results", "/results", "blue"],
  ["rankings", "/rankings", "green"],
  ["records", "/records", "gold"],
  ["athletes", "/athletes", "violet"],
  ["clubs", "/clubs", "slate"],
];
const TILE_TONE = {
  orange: "bg-accent/10 text-accent",
  blue: "bg-brand/10 text-brand",
  green: "bg-emerald-600/10 text-emerald-700",
  gold: "bg-amber-400/20 text-amber-700",
  violet: "bg-violet-600/10 text-violet-700",
  slate: "bg-slate-600/10 text-slate-700",
};
const NAV_LABEL: Record<string, string> = {
  calendar: "navCalendar", results: "navResults", rankings: "navRankings", records: "navRecords",
  athletes: "navAthletes", clubs: "navClubs",
};

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

      {/* Hero: who we are, the three things people come to do, and the next meet */}
      <section className="relative overflow-hidden bg-night text-white">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60rem_30rem_at_85%_10%,rgb(232_93_4/0.35),transparent_60%),radial-gradient(40rem_30rem_at_0%_100%,rgb(6_7_248/0.35),transparent_60%)]" />
        {/* Clip to the section: a fixed rem width would force phones to zoom the whole page out. */}
        <TrackArt numbers={false} className="pointer-events-none absolute inset-y-0 -right-8 w-[min(42rem,92%)] opacity-50 sm:-right-6 sm:opacity-80 lg:right-0 lg:w-[44rem] lg:opacity-90" />
        <div aria-hidden className="absolute inset-0 bg-linear-to-r from-night via-night/80 to-transparent lg:via-night/55" />
        <Container className="relative grid gap-10 py-16 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:py-28">
          <div className="rise flex flex-col items-start">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold tracking-[0.14em] uppercase ring-1 ring-white/20">
              <span className="size-1.5 rounded-full bg-accent" /> {hero.kicker}
            </p>
            <h1 className="mt-6 max-w-2xl text-[2.35rem] leading-[1.05] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              {hero.title}
            </h1>
            <p className="mt-5 max-w-xl text-[1.1rem] leading-relaxed text-white/75 text-pretty sm:text-lg">{hero.text}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={portal.home(lang)} className="btn btn-primary">{t.register} <ArrowRight className="size-4" aria-hidden /></a>
              <Link href={`/${lang}/sign-in`} className="btn btn-glass"><LogIn className="size-4" aria-hidden /> {t.signIn}</Link>
            </div>
            <div className="mt-10 w-full max-w-md">
              <p className="mb-2 text-sm font-semibold text-white/70">{t.verifyTitle}</p>
              <VerifyIdForm lang={lang} label={t.verifyLabel} button={t.verifyButton} invalid={t.verifyInvalid} />
            </div>
          </div>

          {next && (
            <div className="rise flex items-end justify-start lg:justify-end" style={{ animationDelay: "0.15s" }}>
              <Link href={`/${lang}/competitions/${next.id}`}
                className="group flex w-full max-w-sm flex-col items-start rounded-3xl bg-night/70 p-6 ring-1 ring-white/20 backdrop-blur-md transition hover:bg-night/80">
                <p className="text-xs font-bold tracking-[0.14em] text-accent uppercase">{t.nextMeets}</p>
                <p className="mt-3 text-2xl leading-tight font-extrabold text-balance">{next.name[lang]}</p>
                <p className="mt-3 text-sm text-white/75">{formatDateRange(lang, next.start, next.end)}</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-white/75">
                  <MapPin className="size-3.5" aria-hidden /> {next.venue}, {districtName(lang, next.district)}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold group-hover:gap-2.5">
                  {t.fullCalendar} <ArrowRight className="size-4 transition-all" aria-hidden />
                </span>
              </Link>
            </div>
          )}
        </Container>
      </section>

      {/* Quick access */}
      <section className="relative z-10 -mt-8">
        <Container>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {QUICK.map(([key, path, tone]) => (
              <li key={key}>
                <Link href={`/${lang}${path}`} className="group card card-hover tap flex h-full flex-col gap-3 p-4 sm:p-4">
                  <span className={`grid size-12 place-items-center rounded-2xl sm:size-11 ${TILE_TONE[tone]}`}>
                    <NavIcon name={key} className="size-6 sm:size-5" />
                  </span>
                  <span className="flex items-center justify-between gap-2 text-[1.02rem] font-bold sm:text-base">
                    {t[NAV_LABEL[key] as keyof typeof t]}
                    <ArrowRight className="size-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* News: one lead story and three more */}
      <Container className="py-16 sm:py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.latestNews}</h2>
          <ArrowLink href={`/${lang}/news`}>{t.allNews}</ArrowLink>
        </div>
        {lead && <NewsCard item={lead} lang={lang} t={t} variant="feature" />}
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.slice(0, 3).map((n, i) => (
            // two columns on tablets show two cards, so the third would sit alone: show it on phones and desktops only
            <div key={n.slug} className={i === 2 ? "sm:max-lg:hidden" : undefined}>
              <NewsCard item={n} lang={lang} t={t} variant="card" />
            </div>
          ))}
        </div>
      </Container>

      {/* Get involved */}
      <section className="bg-sand py-16 sm:py-20">
        <Container>
          <div className="max-w-2xl">
            <p className="label text-ink">{t.getInvolved}</p>
            <p className="mt-3 text-lg text-muted text-pretty">{t.getInvolvedText}</p>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card flex flex-col gap-4 p-6">
              <span className="grid size-12 place-items-center rounded-2xl bg-accent text-white"><UserRound className="size-6" aria-hidden /></span>
              <h3 className="text-xl font-extrabold">{t.athleteCard}</h3>
              <p className="flex-1 text-muted">{t.athleteCardText}</p>
              <a href={portal.athlete(lang)} className="btn btn-primary self-start">{t.registerAthlete}</a>
            </div>
            <div className="card flex flex-col gap-4 p-6">
              <span className="grid size-12 place-items-center rounded-2xl bg-brand text-white"><ClipboardCheck className="size-6" aria-hidden /></span>
              <h3 className="text-xl font-extrabold">{t.coachCard}</h3>
              <p className="flex-1 text-muted">{t.coachCardText}</p>
              <a href={portal.coach(lang)} className="btn btn-dark self-start">{t.registerCoach}</a>
            </div>
            <div className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-night p-6 text-white sm:col-span-2 lg:col-span-1">
              <span className="grid size-12 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20"><LogIn className="size-6" aria-hidden /></span>
              <h3 className="text-xl font-extrabold">{t.signInTitle}</h3>
              <p className="flex-1 text-white/70">{t.signInFirstTime}</p>
              <Link href={`/${lang}/sign-in`} className="btn btn-glass self-start">{t.signIn}</Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Competitions, season leaders and records */}
      <Container className="grid gap-14 py-16 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <SectionHeading title={t.nextMeets} action={<ArrowLink href={`/${lang}/calendar`}>{t.fullCalendar}</ArrowLink>} />
          {upcoming.length ? upcoming.slice(0, 4).map((c) => (
            <CompetitionCard key={c.id} c={c} lang={lang} t={t} />
          )) : <p className="text-muted">{t.noUpcoming}</p>}
        </div>
        <div>
          <SectionHeading title={t.seasonLeaders} intro={t.leadersIntro} action={<ArrowLink href={`/${lang}/rankings`}>{t.allRankings}</ArrowLink>} />
          <ul className="grid gap-3 sm:grid-cols-2">
            {leaders.map((r) => {
              const top = r.rows[0];
              return (
                <li key={`${r.event}-${r.gender}`}>
                  <Link href={`/${lang}/rankings?event=${r.event}&gender=${r.gender}`}
                    className="group card card-hover flex h-full flex-col gap-2 p-4">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold tracking-[0.12em] text-muted uppercase">
                        {getEvent(r.event).name[lang]} · {r.gender === "M" ? t.men : t.women}
                      </span>
                      <Medal className="size-4 text-amber-500" aria-hidden />
                    </span>
                    <span className="text-3xl font-extrabold tracking-tight tabular">{formatMark(r.event, top.mark)}</span>
                    <span className="truncate text-sm font-semibold">{top.athlete}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="card mt-6 p-5">
            <p className="flex items-center gap-2 font-extrabold"><Trophy className="size-5 text-accent" aria-hidden /> {t.nationalRecords}</p>
            <ul className="mt-3 divide-y divide-line">
              {records.map((r) => (
                <li key={`${r.event}-${r.gender}`} className="flex items-baseline justify-between gap-4 py-3">
                  <span className="min-w-0">
                    <span className="block text-xs font-bold tracking-wider text-muted uppercase">{getEvent(r.event).name[lang]} · {r.gender === "M" ? t.men : t.women}</span>
                    <span className="block truncate font-semibold">{r.athlete}</span>
                  </span>
                  <span className="font-extrabold tabular">{formatMark(r.event, r.mark)}</span>
                </li>
              ))}
            </ul>
            <ArrowLink href={`/${lang}/records`} className="mt-3">{t.allRecords}</ArrowLink>
          </div>
        </div>
      </Container>
    </>
  );
}
