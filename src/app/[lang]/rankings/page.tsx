import { BadgeCheck, ClipboardCheck, Info, Medal, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, EmptyState, Notice } from "@/components/bits";
import { Container, PageHero } from "@/components/PageHero";
import { ResultTable } from "@/components/ResultTable";
import { getRankings } from "@/lib/cms";
import type { Dict } from "@/lib/dict/en";
import { districtName } from "@/lib/districts";
import { EVENTS, getEvent } from "@/lib/events";
import { fill, formatDate, getDict, isLang, type Lang } from "@/lib/i18n";
import { pageMeta } from "@/lib/page";
import { athleteRanking, coachRanking, rankingEvents, type RankingEvent } from "@/lib/rankings";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ event?: string; gender?: string; view?: string }>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = getDict(lang);
  return pageMeta(lang, "/rankings", t.rankingsTitle, t.rankingsIntro);
}

const CATEGORY_ORDER = ["sprints", "hurdles", "middle_distance", "long_distance", "marathon", "race_walk", "jumps", "throws", "combined", "relays"];
const known = new Set(EVENTS.map((e) => e.code));

/** The website's translated event name, or the register's English one. */
const eventName = (lang: Lang, code: string, fallback: string) =>
  EVENTS.find((e) => e.code === code)?.name[lang] ?? fallback;

const MEDAL = ["bg-gold text-night", "bg-black/15 text-night", "bg-accent text-white"];

function Place({ n }: { n: number }) {
  return (
    <span className={`inline-grid size-8 place-items-center rounded-full text-sm font-extrabold tabular ${n <= 3 ? MEDAL[n - 1] : "text-muted"}`}>
      {n}
    </span>
  );
}

export default async function RankingsPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = getDict(lang);
  const q = await searchParams;
  const view = q.view === "coaches" ? "coaches" : "athletes";
  const gender = q.gender === "F" ? "F" : "M";
  const [events, seasonLists] = await Promise.all([rankingEvents(), getRankings()]);

  // Without the register, only the season lists edited in /admin are available.
  if (!events) return <SeasonOnly lang={lang} t={t} q={q} />;

  const event = events.find((e) => e.code === q.event) ?? events.find((e) => e.ranked > 0) ?? events[0];
  const label = eventName(lang, event.code, event.name);
  const href = (patch: Record<string, string>) =>
    `/${lang}/rankings?${new URLSearchParams({ view, event: event.code, gender, ...patch })}`;
  const groups = CATEGORY_ORDER.map((c) => ({ c, items: events.filter((e) => e.category === c) })).filter((g) => g.items.length);
  const others = events.filter((e) => !CATEGORY_ORDER.includes(e.category));
  if (others.length) groups.push({ c: "other", items: others });

  return (
    <>
      <PageHero kicker={t.navCompete} title={t.rankingsTitle} intro={t.rankingsIntro} />
      <Container className="flex flex-col gap-6 py-12">
        {/* athletes or coaches */}
        <nav aria-label={t.rankingsTitle} className="flex w-fit gap-1 rounded-full bg-black/[0.05] p-1">
          {([["athletes", t.rankTabAthletes, UserRound], ["coaches", t.rankTabCoaches, ClipboardCheck]] as const).map(([v, text, Icon]) => (
            <Link key={v} href={href({ view: v })} aria-current={view === v ? "page" : undefined}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-ink/70 transition hover:text-ink aria-[current=page]:bg-night aria-[current=page]:text-white">
              <Icon className="size-4" aria-hidden /> {text}
            </Link>
          ))}
        </nav>

        {/* every event on the registration form, grouped */}
        <Card className="flex flex-col gap-3 overflow-hidden p-5 sm:gap-4">
          {groups.map((g) => (
            // phones: one row per group that scrolls sideways; larger screens: label column and wrapping chips
            <div key={g.c} className="-mx-5 flex items-center gap-2 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:items-baseline sm:gap-4 sm:overflow-visible sm:px-0">
              <p className="shrink-0 text-xs font-bold tracking-[0.1em] text-muted uppercase sm:w-36">
                {t[`rankCat_${g.c}` as keyof Dict] ?? g.c}
              </p>
              <div className="flex shrink-0 gap-1.5 sm:shrink sm:flex-wrap">
                {g.items.map((e) => (
                  <Link key={e.code} href={href({ event: e.code })} aria-current={e.code === event.code ? "page" : undefined}
                    className={`inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-sm font-semibold whitespace-nowrap transition ring-1 ring-line hover:ring-ink aria-[current=page]:bg-night aria-[current=page]:text-white aria-[current=page]:ring-night ${e.ranked ? "" : "text-muted"}`}>
                    {eventName(lang, e.code, e.name)}
                    {e.ranked > 0 && <span className="ml-1.5 text-xs opacity-60 tabular">{e.ranked}</span>}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </Card>

        {view === "athletes"
          ? <AthleteTable lang={lang} t={t} event={event} label={label} gender={gender} href={href} />
          : <CoachTable lang={lang} t={t} event={event} label={label} />}

        {view === "athletes" && known.has(event.code) && (() => {
          const list = seasonLists.find((r) => r.event === event.code && r.gender === gender);
          if (!list?.rows.length) return null;
          const rows = list.rows.filter((r) => r.wind === undefined || r.wind <= 2.0)
            .sort((a, b) => (getEvent(event.code).measurement === "TIME" ? a.mark - b.mark : b.mark - a.mark));
          return (
            <Card className="p-5 sm:p-7">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-bold">{t.rankOfficial}</h2>
                <span className="text-sm font-semibold text-muted">{fill(t.season, { year: list.season })}</span>
              </div>
              <ResultTable event={event.code} rows={rows} t={t}
                extra={{ heading: `${t.competition} · ${t.date}`, cell: (i) => `${rows[i].competition} · ${formatDate(lang, rows[i].date, { day: "numeric", month: "short" })}` }} />
              <p className="mt-4 text-xs text-muted">{t.rankingsRule}</p>
            </Card>
          );
        })()}
      </Container>
    </>
  );
}

async function AthleteTable({ lang, t, event, label, gender, href }: {
  lang: Lang; t: Dict; event: RankingEvent; label: string; gender: "M" | "F"; href: (p: Record<string, string>) => string;
}) {
  const rows = (await athleteRanking(event.code, gender)) ?? [];
  return (
    <Card className="p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{label} · {gender === "M" ? t.men : t.women}</h2>
        <nav aria-label={t.gender} className="flex gap-1 rounded-full bg-black/[0.05] p-1">
          {(["M", "F"] as const).map((g) => (
            <Link key={g} href={href({ gender: g })} aria-current={g === gender ? "page" : undefined}
              className="rounded-full px-4 py-1.5 text-sm font-semibold text-ink/70 aria-[current=page]:bg-white aria-[current=page]:text-ink aria-[current=page]:shadow">
              {g === "M" ? t.men : t.women}
            </Link>
          ))}
        </nav>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                <th scope="col" className="w-12 py-2.5 pr-2 font-semibold">{t.place}</th>
                <th scope="col" className="py-2.5 pr-3 font-semibold">{t.athlete}</th>
                <th scope="col" className="hidden py-2.5 pr-3 font-semibold md:table-cell">{t.club}</th>
                <th scope="col" className="py-2.5 pr-3 text-right font-semibold">{t.mark}</th>
                <th scope="col" className="hidden py-2.5 font-semibold sm:table-cell">{t.rankYear}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.slaa_id} className="border-b border-line/70 last:border-0">
                  <td className="py-2.5 pr-2"><Place n={r.place} /></td>
                  <td className="py-2.5 pr-3">
                    <Link href={`/${lang}/athlete/${r.slaa_id}`} className="font-bold hover:underline">{r.name}</Link>
                    <span className="block text-xs text-muted">{districtName(lang, r.district)}</span>
                  </td>
                  <td className="hidden py-2.5 pr-3 text-muted md:table-cell">{r.club ?? "—"}</td>
                  <td className="py-2.5 pr-3 text-right whitespace-nowrap">
                    <span className="font-mono text-base font-bold tabular">{r.mark}</span>
                    {r.verified && <BadgeCheck className="ml-1 inline size-4 text-emerald-600" aria-label={t.rankVerifiedPb} />}
                  </td>
                  <td className="hidden py-2.5 text-muted sm:table-cell">{r.pb_year ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState icon={Medal}>{t.rankNone}</EmptyState>}
      <p className="mt-5 flex gap-2 text-xs text-muted"><Info className="size-4 shrink-0" aria-hidden /> {t.rankRegisterNote}</p>
    </Card>
  );
}

async function CoachTable({ lang, t, event, label }: { lang: Lang; t: Dict; event: RankingEvent; label: string }) {
  const rows = (await coachRanking(event.code)) ?? [];
  return (
    <Card className="p-5 sm:p-7">
      <h2 className="mb-5 text-2xl font-bold">{fill(t.rankCoachesIn, { event: label })}</h2>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                <th scope="col" className="w-12 py-2.5 pr-2 font-semibold">{t.place}</th>
                <th scope="col" className="py-2.5 pr-3 font-semibold">{t.rankCoach}</th>
                <th scope="col" className="hidden py-2.5 pr-3 text-center font-semibold sm:table-cell">{t.rankAthletesCol}</th>
                <th scope="col" className="hidden py-2.5 pr-3 font-semibold md:table-cell">{t.rankBest}</th>
                <th scope="col" className="py-2.5 font-semibold">{t.rankScore}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.slaa_id} className="border-b border-line/70 last:border-0">
                  <td className="py-3 pr-2"><Place n={r.place} /></td>
                  <td className="py-3 pr-3">
                    <Link href={`/${lang}/athlete/${r.slaa_id}`} className="font-bold hover:underline">{r.name}</Link>
                    <span className="block text-xs text-muted">{districtName(lang, r.district)}</span>
                  </td>
                  <td className="hidden py-3 pr-3 text-center font-bold tabular sm:table-cell">{r.athletes}</td>
                  <td className="hidden py-3 pr-3 md:table-cell">
                    <span className="font-semibold">{r.best_name}</span>
                    <span className="block text-xs text-muted">
                      <span className="font-mono font-bold text-ink">{r.best_mark}</span>
                      {" · "}{fill(t.rankNatPlace, { place: String(r.best_place), field: String(r.best_field) })}
                      {" · "}{r.best_gender === "M" ? t.men : t.women}
                    </span>
                  </td>
                  <td className="py-3 whitespace-nowrap">
                    <span className="flex items-center gap-2">
                      <span className="text-lg font-extrabold tabular">{r.score}</span>
                      <span className="hidden h-2 w-20 overflow-hidden rounded-full bg-black/10 sm:block">
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${r.score}%` }} />
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState icon={Medal}>{t.rankCoachNone}</EmptyState>}
      <p className="mt-5 flex gap-2 text-xs text-muted"><Info className="size-4 shrink-0" aria-hidden /> {t.rankCoachNote}</p>
    </Card>
  );
}

/** Without a register connection: the season lists from /admin, as before. */
async function SeasonOnly({ lang, t, q }: { lang: Lang; t: Dict; q: { event?: string; gender?: string } }) {
  const RANKINGS = await getRankings();
  const events = [...new Set(RANKINGS.map((r) => r.event))];
  const event = events.includes(q.event ?? "") ? q.event! : events[0];
  const gender = q.gender === "F" ? "F" : q.gender === "M" ? "M" : RANKINGS.find((r) => r.event === event)?.gender ?? "M";
  const list = RANKINGS.find((r) => r.event === event && r.gender === gender);
  const rows = (list?.rows ?? []).filter((r) => r.wind === undefined || r.wind <= 2.0).sort((a, b) =>
    getEvent(event).measurement === "TIME" ? a.mark - b.mark : b.mark - a.mark);
  const chip = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold transition ${active ? "bg-night text-white" : "text-ink ring-1 ring-line hover:bg-black/5"}`;
  const href = (e: string, g: string) => `/${lang}/rankings?event=${encodeURIComponent(e)}&gender=${g}`;
  return (
    <>
      <PageHero kicker={t.navCompete} title={t.rankingsTitle} intro={t.rankingsIntro} />
      <Container className="flex flex-col gap-6 py-12">
        <Notice>{t.rankNeedsRegister}</Notice>
        {event && (
          <>
            <nav aria-label={t.event} className="flex flex-wrap gap-2">
              {events.map((e) => <Link key={e} href={href(e, gender)} aria-current={e === event ? "page" : undefined} className={chip(e === event)}>{getEvent(e).name[lang]}</Link>)}
            </nav>
            <nav aria-label={t.gender} className="flex gap-2">
              {(["M", "F"] as const).map((g) => <Link key={g} href={href(event, g)} aria-current={g === gender ? "page" : undefined} className={chip(g === gender)}>{g === "M" ? t.men : t.women}</Link>)}
            </nav>
            <Card className="p-5 sm:p-7">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-2xl font-bold">{getEvent(event).name[lang]} · {gender === "M" ? t.men : t.women}</h2>
                {list && <span className="text-sm font-semibold text-muted">{fill(t.season, { year: list.season })}</span>}
              </div>
              {rows.length ? (
                <ResultTable event={event} rows={rows} t={t}
                  extra={{ heading: `${t.competition} · ${t.date}`, cell: (i) => `${rows[i].competition} · ${formatDate(lang, rows[i].date, { day: "numeric", month: "short" })}` }} />
              ) : <EmptyState icon={Medal}>{t.noRanking}</EmptyState>}
            </Card>
            <Notice>{t.rankingsRule}</Notice>
          </>
        )}
      </Container>
    </>
  );
}
