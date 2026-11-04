import {
  BadgeCheck, Check, CircleCheck, Clock, EyeOff, Search, Send, TrendingDown, TrendingUp, Trophy, UserCheck,
  Users, X,
} from "lucide-react";
import { Badge, Card, Notice } from "@/components/bits";
import * as act from "@/lib/dashboard-actions";
import type { Dict } from "@/lib/dict/en";
import { districtName } from "@/lib/districts";
import { EVENTS } from "@/lib/events";
import { fill, formatDate, type Lang } from "@/lib/i18n";
import { bestPerYear } from "@/lib/marks";
import type { MemberRecord } from "@/lib/member-auth";
import type { CoachHit, CoachView, Dashboard, EventRow, MarkRow, PrivacyKey } from "@/lib/member-dashboard";
import {
  CoachingTimeline, Columns, Donut, FieldHistogram, GROUP_COLORS, improvement, RankRing, ScoreRing, SplitBar, standing, StrengthBars,
  topPercent, TrendChart,
} from "./DashboardCharts";
import { markValue } from "@/lib/marks";
import { Container } from "./PageHero";

// The member dashboard: a dark header with the numbers that matter, then
// performance, coach, squad and privacy sections. Server-rendered; the forms
// post to the actions in lib/dashboard-actions.ts.

const INPUT = "h-11 w-full border border-line bg-white px-3 text-sm outline-none focus:border-ink";
const BUTTON = "inline-flex h-11 items-center justify-center gap-2 bg-night px-4 text-sm font-bold text-white hover:bg-accent";
const SMALL = "inline-flex h-9 items-center justify-center gap-1.5 px-3 text-xs font-bold";
const GHOST = `${SMALL} border border-line hover:border-ink`;
const DARK = `${SMALL} bg-night text-white hover:bg-accent`;
const KICKER = "text-[0.7rem] font-bold tracking-[0.18em] text-accent uppercase";

const EXTRA_EVENTS: Record<string, string> = {
  "3000m": "3000m", RW: "Race walk", HM: "Half marathon", XC: "Cross country", "4x400mX": "4×400m mixed relay",
};
export function eventLabel(lang: Lang, code: string) {
  return EVENTS.find((e) => e.code === code)?.name[lang] ?? EXTRA_EVENTS[code] ?? code;
}

/** First and last initial: "K. T. Perera" → "KP". */
const initials = (name: string) => {
  const words = name.replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
};

function Hidden({ lang, slaaId }: { lang: Lang; slaaId: string }) {
  return (
    <>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="slaaId" value={slaaId} />
    </>
  );
}

function SectionHead({ id, kicker, title, intro, icon }: {
  id: string; kicker: string; title: string; intro?: string; icon: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-28">
      <p className={KICKER}>{kicker}</p>
      <h2 className="mt-1 flex items-center gap-2.5 text-2xl font-bold sm:text-3xl">{icon}{title}</h2>
      {intro && <p className="mt-1.5 max-w-2xl text-sm text-muted">{intro}</p>}
    </div>
  );
}

/** The best place among an athlete's events, by share of the field. */
function bestEvent(events: EventRow[]) {
  return events
    .filter((e) => e.place && e.field)
    .sort((a, b) => a.place! / a.field! - b.place! / b.field! || a.place! - b.place!)[0];
}

// ---------------------------------------------------------------------
// Header band: who, status, and the headline numbers
// ---------------------------------------------------------------------

export function RecordHero({ lang, t, r, d, email }: {
  lang: Lang; t: Dict; r: MemberRecord; d: Dashboard | undefined; email: string | null;
}) {
  const tiles: { label: string; value: React.ReactNode; sub?: string }[] = [];
  if (d?.is_athlete) {
    const best = bestEvent(d.events);
    const withPb = d.events.filter((e) => e.pb);
    const coach = d.coaches.find((c) => c.state === "active" && c.primary) ?? d.coaches.find((c) => c.state === "active");
    tiles.push(
      best
        ? { label: t.dashKpiBestRank, value: `#${best.place}`, sub: `${eventLabel(lang, best.code)} · ${fill(t.dashTopPct, { pct: String(topPercent(best.place!, best.field!)) })}` }
        : { label: t.dashKpiBestRank, value: "—", sub: t.dashKpiNone },
      { label: t.dashKpiVerified, value: `${withPb.filter((e) => e.verified).length}/${withPb.length}` },
      { label: t.dashKpiWaiting, value: d.marks.filter((m) => m.status === "pending").length },
      { label: t.dashKpiCoach, value: <span className="text-xl leading-tight">{coach?.name ?? t.dashKpiNone}</span> },
    );
  }
  if (d?.is_coach && d.coach) {
    tiles.push(
      { label: t.dashSumRequests, value: d.coach.requests.length },
      { label: t.dashSumMarks, value: d.coach.marks.length },
      { label: t.dashSumAthletes, value: d.coach.athletes.length },
      { label: t.dashKpiPast, value: d.coach.past?.length ?? d.coach.past_count },
    );
  }
  const checks: [string, boolean][] = d?.is_athlete ? [
    [t.dashChkVerified, r.status === "verified"],
    [t.dashChkCoach, d.coaches.some((c) => c.state === "active")],
    [t.dashChkEvents, d.events.length > 0],
    [t.dashChkPb, d.events.some((e) => e.pb)],
    [t.dashChkPbVerified, d.events.some((e) => e.pb) && d.events.every((e) => !e.pb || e.verified)],
  ] : [];
  const score = checks.length ? checks.filter(([, ok]) => ok).length / checks.length : 0;
  const nav: [string, string][] = [];
  if (d?.is_athlete) nav.push([`perf-${r.slaa_id}`, t.dashNavPerformance], [`coach-${r.slaa_id}`, t.dashNavCoach]);
  if (d?.is_coach) nav.push([`squad-${r.slaa_id}`, t.dashNavSquad]);
  if (d) nav.push([`privacy-${r.slaa_id}`, t.dashNavPrivacy]);
  nav.push([`details-${r.slaa_id}`, t.dashNavDetails]);

  return (
    <section className="relative overflow-hidden bg-night text-white">
      {/* running-track lanes as a quiet texture */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-[0.07] md:block"
        style={{ backgroundImage: "repeating-linear-gradient(115deg, #fff 0 2px, transparent 2px 46px)" }} />
      <Container className="relative flex flex-col gap-8 py-10 sm:py-14">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
        <div className="flex items-center gap-5">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-accent text-xl font-black sm:size-20 sm:text-2xl">
            {initials(r.display_name)}
          </span>
          <div className="min-w-0">
            <p className={KICKER}>{t.accountTitle}</p>
            <h1 className="mt-1 text-3xl font-bold sm:text-5xl">{r.display_name}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono font-bold tracking-wider text-gold">{r.slaa_id}</span>
              {r.status === "verified"
                ? <Badge tone="gold"><BadgeCheck className="size-3.5" aria-hidden /> {t.accountVerifiedBadge}</Badge>
                : <span className="border border-white/30 px-2 py-0.5 text-[0.72rem] font-bold tracking-wider uppercase">{t.accountPendingBadge}</span>}
              {d?.is_athlete && <Badge tone="blue">{t.roleAthlete}</Badge>}
              {d?.is_coach && <Badge tone="blue">{t.roleCoach}</Badge>}
            </p>
            {email && <p className="mt-2 text-xs text-white/60">{fill(t.accountSignedInAs, { email })}</p>}
          </div>
        </div>
        {checks.length > 0 && (
          <div className="flex items-center gap-5 border border-white/15 bg-white/[0.04] p-4">
            <ScoreRing value={score} label={`${t.dashProfileTitle}: ${Math.round(score * 100)}%`} />
            <div>
              <p className="text-[0.72rem] font-bold tracking-[0.14em] text-white/55 uppercase">{t.dashProfileTitle}</p>
              <ul className="mt-2 flex flex-col gap-1 text-xs">
                {checks.map(([label, ok]) => (
                  <li key={label} className={`flex items-center gap-1.5 ${ok ? "text-white" : "text-white/45"}`}>
                    {ok ? <Check className="size-3.5 text-gold" aria-hidden /> : <span className="inline-block size-3.5 border border-white/40" aria-hidden />}
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        </div>

        {tiles.length > 0 && (
          <dl className="grid grid-cols-2 gap-px bg-white/10 lg:grid-cols-4">
            {tiles.map((k) => (
              <div key={k.label} className="bg-night p-4 sm:p-5">
                <dt className="text-[0.72rem] font-bold tracking-[0.14em] text-white/55 uppercase">{k.label}</dt>
                <dd className="mt-2 text-3xl font-black tabular-nums sm:text-4xl">{k.value}</dd>
                {k.sub && <dd className="mt-1 text-xs text-white/60">{k.sub}</dd>}
              </div>
            ))}
          </dl>
        )}

        <nav aria-label={r.display_name} className="-mx-1 flex gap-2 overflow-x-auto px-1">
          {nav.map(([id, label]) => (
            <a key={id} href={`#${id}`}
              className="shrink-0 border border-white/25 px-3.5 py-1.5 text-xs font-bold tracking-wider uppercase hover:border-accent hover:text-accent">
              {label}
            </a>
          ))}
        </nav>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------
// Athlete: one card per event, then the coach section
// ---------------------------------------------------------------------

function EventCard({ lang, t, e, marks, slaaId }: { lang: Lang; t: Dict; e: EventRow; marks: MarkRow[]; slaaId: string }) {
  const name = eventLabel(lang, e.code);
  const points = bestPerYear(e.code, [
    ...marks.filter((m) => m.event === e.code && m.status === "approved"),
    { year: e.pb_year, mark: e.pb },
  ]);
  const change = improvement(e.code, points, t);
  const waiting = marks.find((m) => m.event === e.code && m.status === "pending");
  const ranked = !!(e.place && e.field);
  const rankText = ranked ? fill(t.dashChartRankTip, { event: name, place: String(e.place), field: String(e.field) }) : "";

  return (
    <Card className="flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.16em] text-muted uppercase">{name}</p>
          {e.pb ? (
            <>
              <p className="mt-1 font-mono text-4xl font-black tracking-tight sm:text-5xl">{e.pb}</p>
              <p className="mt-1 text-xs text-muted">{[e.pb_year, e.competition].filter(Boolean).join(" · ")}</p>
              <div className="mt-2">
                {e.verified
                  ? <Badge tone="gold"><BadgeCheck className="size-3.5" aria-hidden /> {t.dashPbVerified}</Badge>
                  : <Badge tone="grey"><Clock className="size-3.5" aria-hidden /> {t.dashPbUnverified}</Badge>}
              </div>
            </>
          ) : <p className="mt-2 text-lg font-bold text-muted">{t.dashNoPb}</p>}
        </div>
        {ranked && (
          <div className="flex flex-col items-center text-center">
            <RankRing place={e.place!} field={e.field!} label={rankText} />
            <p className="mt-1 text-xs text-muted">{fill(t.dashFieldOf, { field: String(e.field) })}</p>
            <p className="text-xs font-bold">{fill(t.dashTopPct, { pct: String(topPercent(e.place!, e.field!)) })}</p>
          </div>
        )}
      </div>

      {e.pb && e.dist && e.place && e.dist.length >= 3 && markValue(e.pb) !== null && (
        <div className="border-t border-line pt-4">
          <p className="mb-2 text-xs font-bold tracking-[0.12em] text-muted uppercase">{t.dashFieldTitle}</p>
          <FieldHistogram code={e.code} dist={e.dist} mine={markValue(e.pb)!} place={e.place} t={t} />
        </div>
      )}

      {points.length >= 2 ? (
        <div className="border-t border-line pt-4">
          <p className="mb-1 text-xs font-bold tracking-[0.12em] text-muted uppercase">{t.dashProgressTitle}</p>
          <TrendChart code={e.code} points={points} label={`${name}: ${points.map((p) => `${p.year} ${p.mark}`).join(", ")}`} />
          {change && (
            <p className={`mt-1 flex items-center gap-1.5 text-sm font-bold ${change.better ? "text-emerald-700" : "text-clay"}`}>
              {change.better ? <TrendingUp className="size-4" aria-hidden /> : <TrendingDown className="size-4" aria-hidden />}
              {change.text}
            </p>
          )}
        </div>
      ) : e.pb && <p className="border-t border-line pt-4 text-xs text-muted">{t.dashTrendEmpty}</p>}

      {waiting && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-gold/25 px-3 py-2 text-sm">
          <span className="flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden />
            {fill(t.dashWaitingFor, { mark: waiting.mark, year: String(waiting.year) })}
          </span>
          <form action={act.withdrawMark}>
            <Hidden lang={lang} slaaId={slaaId} />
            <input type="hidden" name="markId" value={waiting.id} />
            <button className={`${SMALL} underline underline-offset-2 hover:text-accent`}>{t.dashWithdraw}</button>
          </form>
        </div>
      )}
    </Card>
  );
}

export function AthleteDashboard({ lang, t, d, coachQuery, hits }: {
  lang: Lang; t: Dict; d: Dashboard; coachQuery: string; hits: CoachHit[] | null;
}) {
  const active = d.coaches.filter((c) => c.state === "active");
  const awaiting = d.coaches.filter((c) => c.state === "awaiting");
  const past = d.coaches.filter((c) => c.state === "past");
  const recent = Date.now() - 30 * 86_400_000;
  const activity = d.marks
    .filter((m) => m.status === "pending" || Date.parse(m.at) > recent || m.status === "approved")
    .slice(0, 6);
  const strength = d.events
    .filter((e) => e.place && e.field)
    .map((e) => ({ label: eventLabel(lang, e.code), place: e.place!, field: e.field!, top: fill(t.dashTopPct, { pct: String(topPercent(e.place!, e.field!)) }) }))
    .sort((a, b) => a.place / a.field - b.place / b.field);
  const eventCodes = [...new Set([...d.events.map((e) => e.code), ...EVENTS.map((e) => e.code)])];
  const year = new Date().getFullYear();

  return (
    <>
      <section className="flex flex-col gap-5">
        <SectionHead id={`perf-${d.slaa_id}`} kicker={t.dashNavPerformance} title={t.dashEventsTitle}
          intro={t.dashEventsIntro} icon={<Trophy className="size-6 text-accent" aria-hidden />} />
        {(strength.length > 0 || activity.length > 0) && (
          <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
            <Card className="p-5 sm:p-6">
              <h3 className="text-xs font-bold tracking-[0.14em] text-muted uppercase">{t.dashStrengthTitle}</h3>
              <p className="mt-1 mb-4 text-sm text-muted">{t.dashStrengthHint}</p>
              {strength.length ? <StrengthBars rows={strength} /> : <p className="text-sm text-muted">{t.dashNoPb}</p>}
            </Card>
            <Card className="p-5 sm:p-6">
              <h3 className="text-xs font-bold tracking-[0.14em] text-muted uppercase">{t.dashActivityTitle}</h3>
              {activity.length ? (
                <ol className="mt-4 flex flex-col">
                  {activity.map((m) => (
                    <li key={m.id} className="relative flex gap-3 pb-4 pl-1 last:pb-0">
                      <span className="absolute top-3 bottom-0 left-[0.6rem] w-px bg-line last:hidden" aria-hidden />
                      <span className={`relative mt-1 size-3 shrink-0 ring-4 ring-white ${
                        { pending: "bg-gold", approved: "bg-emerald-600", rejected: "bg-clay", withdrawn: "bg-black/25" }[m.status]}`} aria-hidden />
                      <span className="text-sm">
                        <strong>{eventLabel(lang, m.event)}</strong> <span className="font-mono font-bold">{m.mark}</span>
                        <span className="block text-xs text-muted">
                          {t[`dashStatus_${m.status}` as keyof Dict]} · {m.year}{m.competition ? ` · ${m.competition}` : ""}
                          {m.note ? ` · “${m.note}”` : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : <p className="mt-3 text-sm text-muted">{t.dashActivityEmpty}</p>}
            </Card>
          </div>
        )}
        {d.events.length ? (
          <div className="grid gap-5 md:grid-cols-2">
            {d.events.map((e) => <EventCard key={e.code} lang={lang} t={t} e={e} marks={d.marks} slaaId={d.slaa_id} />)}
          </div>
        ) : <Notice>{t.dashNoEvents}</Notice>}
        <p className="text-xs text-muted">{t.dashRankNote}</p>

        <details className="card border-l-4 border-accent p-5 sm:p-6">
          <summary className="flex cursor-pointer items-center gap-2 font-bold select-none">
            <Send className="size-4 text-accent" aria-hidden /> {t.dashSendMark}
          </summary>
          <p className="mt-2 text-sm text-muted">{active.length ? t.dashSendMarkIntro : t.dashSendMarkNoCoach}</p>
          <form action={act.sendMark} className="mt-4 grid gap-3 sm:grid-cols-4">
            <Hidden lang={lang} slaaId={d.slaa_id} />
            <label className="flex flex-col gap-1 text-xs font-bold tracking-wider uppercase">
              {t.dashEvent}
              <select name="event" required className={INPUT} defaultValue={d.events[0]?.code}>
                {eventCodes.map((c) => <option key={c} value={c}>{eventLabel(lang, c)}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold tracking-wider uppercase">
              {t.dashMark}
              <input name="mark" required inputMode="decimal" maxLength={12} placeholder="10.85" className={`${INPUT} font-mono`} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold tracking-wider uppercase">
              {t.dashYear}
              <input name="year" type="number" required min={1950} max={year} defaultValue={year} className={INPUT} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold tracking-wider uppercase">
              {t.dashCompetition}
              <input name="competition" maxLength={120} className={INPUT} />
            </label>
            <button className={`${BUTTON} sm:col-span-4 sm:justify-self-start`}>
              <Send className="size-4" aria-hidden /> {t.dashSendMarkButton}
            </button>
          </form>
        </details>
      </section>

      <section className="flex flex-col gap-5">
        <SectionHead id={`coach-${d.slaa_id}`} kicker={t.dashNavCoach} title={t.dashCoachTitle}
          icon={<UserCheck className="size-6 text-accent" aria-hidden />} />
        {!active.length && <Notice>{t.dashNeedCoach}</Notice>}
        {(active.length > 0 || awaiting.length > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            {[...active, ...awaiting].map((c) => (
              <Card key={c.link} className="flex items-center gap-4 p-5">
                <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-sm font-black ${c.state === "active" ? "bg-night text-white" : "bg-line text-muted"}`}>
                  {initials(c.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{c.name}</p>
                  <p className="text-xs text-muted"><span className="font-mono">{c.coach_id}</span> · {districtName(lang, c.district)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {c.state === "active"
                      ? <Badge tone="gold"><Check className="size-3.5" aria-hidden /> {c.primary ? t.dashCoachMain : t.dashCoachActive}</Badge>
                      : <Badge tone="grey"><Clock className="size-3.5" aria-hidden /> {c.replaces ? t.dashCoachAwaitingChange : t.dashCoachAwaiting}</Badge>}
                    {c.state === "awaiting" && (
                      <form action={act.cancelCoachRequest}>
                        <Hidden lang={lang} slaaId={d.slaa_id} />
                        <input type="hidden" name="link" value={c.link} />
                        <button className={`${SMALL} h-7 px-0 underline underline-offset-2 hover:text-accent`}>{t.dashCancelRequest}</button>
                      </form>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        {past.length > 0 && (
          <p className="text-xs text-muted">
            {t.dashPastCoaches}: {past.map((c) => `${c.name}${c.end_year ? ` (${c.end_year})` : ""}`).join(", ")}
          </p>
        )}

        <Card className="p-5 sm:p-6">
          <h3 className="font-bold">{active.length ? t.dashChangeCoach : t.dashChooseCoach}</h3>
          <p className="mt-1 text-sm text-muted">{active.length ? t.dashChangeCoachIntro : t.dashChooseCoachIntro}</p>
          <form method="get" action={`/${lang}/account#coach-${d.slaa_id}`} className="mt-4 flex gap-2">
            <input type="hidden" name="for" value={d.slaa_id} />
            <input name="coachq" defaultValue={coachQuery} minLength={2} maxLength={80} required
              placeholder={t.dashCoachSearchHint} aria-label={t.dashCoachSearchHint} className={INPUT} />
            <button className={BUTTON}><Search className="size-4" aria-hidden /> {t.dashSearch}</button>
          </form>
          {hits && (hits.length ? (
            <ul className="mt-4 divide-y divide-line border border-line">
              {hits.map((h) => (
                <li key={h.slaa_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-line text-xs font-black">{initials(h.name)}</span>
                    <span>
                      <strong>{h.name}</strong> <span className="font-mono text-xs text-muted">{h.slaa_id}</span>
                      <span className="block text-xs text-muted">
                        {districtName(lang, h.district)}
                        {h.disciplines?.length ? ` · ${h.disciplines.map((c) => eventLabel(lang, c)).join(", ")}` : ""}
                        {!h.verified && ` · ${t.dashCoachNotVerified}`}
                      </span>
                    </span>
                  </span>
                  <span className="flex gap-2">
                    {active.length > 0 && (
                      <form action={act.requestCoach}>
                        <Hidden lang={lang} slaaId={d.slaa_id} />
                        <input type="hidden" name="coachId" value={h.slaa_id} />
                        <input type="hidden" name="mode" value="replace" />
                        <button className={DARK}>{t.dashSwitchTo}</button>
                      </form>
                    )}
                    <form action={act.requestCoach}>
                      <Hidden lang={lang} slaaId={d.slaa_id} />
                      <input type="hidden" name="coachId" value={h.slaa_id} />
                      <input type="hidden" name="mode" value="add" />
                      <button className={active.length ? GHOST : DARK}>{active.length ? t.dashAddCoach : t.dashRequestCoach}</button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-muted">{t.dashNoCoachFound}</p>)}
        </Card>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------
// Coach: what needs me today, then the squad
// ---------------------------------------------------------------------

function AllClear({ t }: { t: Dict }) {
  return (
    <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
      <CircleCheck className="size-4" aria-hidden /> {t.dashAllClear}
    </p>
  );
}

function Leaderboard({ lang, t, c }: { lang: Lang; t: Dict; c: CoachView }) {
  const rows = c.athletes
    .map((a) => ({ a, e: bestEvent(a.events) ?? a.events.find((x) => x.pb) }))
    .sort((x, y) => {
      // same measure as the "Top %" shown: place as a share of the field, smaller is better
      const sx = x.e?.place && x.e.field ? x.e.place / x.e.field : 2;
      const sy = y.e?.place && y.e.field ? y.e.place / y.e.field : 2;
      return sx - sy || x.a.full_name.localeCompare(y.a.full_name);
    });
  const podium = ["bg-gold text-night", "bg-black/15 text-night", "bg-accent text-white"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-[0.72rem] tracking-[0.14em] text-muted uppercase">
          <tr className="border-b border-ink">
            <th className="py-2 pr-3">#</th><th className="py-2 pr-3">{t.dashAthlete}</th><th className="py-2 pr-3">{t.dashBestEvent}</th>
            <th className="py-2 pr-3">{t.dashPb}</th><th className="py-2">{t.dashNational}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(({ a, e }, i) => (
            <tr key={a.link}>
              <td className="py-3 pr-3 font-black tabular-nums">
                {i < 3
                  ? <span className={`inline-flex size-7 items-center justify-center ${podium[i]}`}>{i + 1}</span>
                  : <span className="inline-flex size-7 items-center justify-center">{i + 1}</span>}
              </td>
              <td className="py-3 pr-3">
                <span className="font-bold">{a.name}</span>
                <span className="block font-mono text-xs text-muted">{a.athlete_id}</span>
              </td>
              <td className="py-3 pr-3">{e ? eventLabel(lang, e.code) : "—"}</td>
              <td className="py-3 pr-3 font-mono font-bold">{e?.pb ?? "—"}</td>
              <td className="py-3 whitespace-nowrap">
                {e?.place && e.field ? (
                  <span className="flex items-center gap-2" title={fill(t.dashChartRankTip, { event: eventLabel(lang, e.code), place: String(e.place), field: String(e.field) })}>
                    <span className="font-bold">#{e.place}</span>
                    <span className="h-1.5 w-16 bg-line"><span className="block h-full bg-accent" style={{ width: `${standing(e.place, e.field) * 100}%` }} /></span>
                    <span className="text-xs text-muted">{fill(t.dashTopPct, { pct: String(topPercent(e.place, e.field)) })}</span>
                  </span>
                ) : <span className="text-muted">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const GROUPS: [keyof Dict, string[]][] = [
  ["dashGroupSprints", ["100m", "200m", "400m"]],
  ["dashGroupHurdles", ["100mH", "110mH", "400mH", "3000mSC"]],
  ["dashGroupDistance", ["800m", "1500m", "3000m", "5000m", "10000m", "MAR", "HM", "XC", "RW"]],
  ["dashGroupJumps", ["HJ", "PV", "LJ", "TJ"]],
  ["dashGroupThrows", ["SP", "DT", "HT", "JT"]],
  ["dashGroupOther", []],
];

function SquadInsights({ t, c }: { t: Dict; c: CoachView }) {
  const groupOf = (code: string) => GROUPS.findIndex(([, codes]) => codes.includes(code));
  const perGroup = GROUPS.map(() => 0);
  for (const a of c.athletes) {
    const groups = new Set(a.events.map((e) => { const g = groupOf(e.code); return g < 0 ? GROUPS.length - 1 : g; }));
    for (const g of groups) perGroup[g]++;
  }
  const slices = GROUPS.map(([key], i) => ({ label: t[key] as string, value: perGroup[i], color: GROUP_COLORS[i] }))
    .filter((s) => s.value > 0);
  const pbs = c.athletes.flatMap((a) => a.events.filter((e) => e.pb));
  const verified = pbs.filter((e) => e.verified).length;
  const year = new Date().getFullYear();
  const ages = [["U16", 0, 15], ["U18", 16, 17], ["U20", 18, 19], ["20+", 20, 200]] as const;
  const ageCounts = ages.map(([label, lo, hi]) => ({
    label,
    value: c.athletes.filter((a) => { const age = year - Number(a.date_of_birth.slice(0, 4)); return age >= lo && age <= hi; }).length,
  }));
  const women = c.athletes.filter((a) => a.gender === "F").length;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <Card className="p-5 sm:p-6">
        <h3 className="text-xs font-bold tracking-[0.14em] text-muted uppercase">{t.dashGroupTitle}</h3>
        <div className="mt-4">
          <Donut slices={slices} total={c.athletes.length} centerLabel={t.dashAthletesShort} />
        </div>
      </Card>
      <Card className="flex flex-col gap-6 p-5 sm:p-6">
        <div>
          <h3 className="mb-3 text-xs font-bold tracking-[0.14em] text-muted uppercase">{t.dashVerifyTitle}</h3>
          <SplitBar parts={[
            { label: t.dashPbVerified, value: verified, className: "bg-emerald-600" },
            { label: t.dashPbUnverified, value: pbs.length - verified, className: "bg-black/20" },
          ]} />
        </div>
        <div className="grid grid-cols-[1fr_auto] items-end gap-6">
          <div>
            <h3 className="mb-2 text-xs font-bold tracking-[0.14em] text-muted uppercase">{t.dashAgeTitle}</h3>
            <Columns items={ageCounts} />
          </div>
          <div className="text-right">
            <h3 className="mb-2 text-xs font-bold tracking-[0.14em] text-muted uppercase">{t.gender}</h3>
            <p className="text-sm"><span className="text-2xl font-black tabular-nums">{c.athletes.length - women}</span> {t.genderM}</p>
            <p className="text-sm"><span className="text-2xl font-black tabular-nums">{women}</span> {t.genderF}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function PastAndTimeline({ lang, t, d, c }: { lang: Lang; t: Dict; d: Dashboard; c: CoachView }) {
  const past = c.past ?? [];
  const now = new Date().getFullYear();
  const stints = [
    ...c.athletes.filter((a) => a.start_year).map((a) => ({
      key: `c${a.link}`, label: a.name, start: a.start_year!, end: null, current: true,
    })),
    ...past.filter((p) => p.start_year).map((p) => ({
      key: `p${p.link}`, label: p.name, start: p.start_year!, end: p.end_year, current: false, pending: !p.confirmed,
    })),
  ];
  const undated = c.athletes.length + past.length - stints.length;
  const waiting = past.filter((p) => !p.confirmed).length;
  if (!stints.length && !past.length) return null;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-5 sm:p-6">
        <h3 className="text-xs font-bold tracking-[0.14em] text-muted uppercase">{t.dashTimelineTitle}</h3>
        <p className="mt-1 mb-4 text-sm text-muted">{t.dashTimelineHint}</p>
        {stints.length ? (
          <CoachingTimeline stints={stints} now={now}
            labels={{ current: t.dashTimelineCurrent, past: t.dashTimelinePast, pending: t.dashTimelinePending }} />
        ) : <p className="text-sm text-muted">{t.dashTimelineEmpty}</p>}
        {undated > 0 && stints.length > 0 && (
          <p className="mt-3 text-xs text-muted">{fill(t.dashTimelineNoYear, { count: String(undated) })}</p>
        )}
      </Card>

      <Card className="flex flex-col p-5 sm:p-6">
        <h3 className="flex items-center justify-between gap-3 text-xs font-bold tracking-[0.14em] text-muted uppercase">
          {t.dashPastTitle}
          {waiting > 0 && <span className="bg-gold px-2 py-0.5 text-[0.7rem] text-night tabular-nums">{fill(t.dashPastWaiting, { count: String(waiting) })}</span>}
        </h3>
        <p className="mt-1 mb-3 text-sm text-muted">{t.dashPastHint}</p>
        {past.length ? (
          <ul className="flex flex-col divide-y divide-line">
            {past.map((p) => (
              <li key={p.link} className="flex flex-col gap-2 py-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-black/10 text-xs font-black">{initials(p.name)}</span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p>
                      <strong>{p.name}</strong> <span className="font-mono text-xs text-muted">{p.athlete_id}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {districtName(lang, p.district)}
                      {(p.start_year || p.end_year) && ` · ${p.start_year ?? "?"}–${p.end_year ?? "?"}`}
                    </p>
                    {p.events.length > 0 && (
                      <p className="mt-1 flex flex-wrap gap-x-3 text-xs">
                        {p.events.map((e) => (
                          <span key={e.code}>
                            {eventLabel(lang, e.code)} {e.pb && <strong className="font-mono">{e.pb}</strong>}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                  {p.confirmed && <Badge tone="grey"><Check className="size-3.5" aria-hidden /> {t.dashPastConfirmed}</Badge>}
                </div>
                {!p.confirmed && (
                  <div className="flex flex-wrap items-center gap-2 pl-12">
                    <span className="text-xs text-muted">{t.dashPastClaim}</span>
                    {(["accept", "decline"] as const).map((decision) => (
                      <form key={decision} action={act.decideLink}>
                        <Hidden lang={lang} slaaId={d.slaa_id} />
                        <input type="hidden" name="link" value={p.link} />
                        <input type="hidden" name="decision" value={decision} />
                        <input type="hidden" name="past" value="1" />
                        <button className={decision === "accept" ? DARK : GHOST}>
                          {decision === "accept" ? t.dashConfirmPast : t.dashDeclinePast}
                        </button>
                      </form>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">{t.dashPastEmpty}</p>}
      </Card>
    </div>
  );
}

export function CoachDashboard({ lang, t, d }: { lang: Lang; t: Dict; d: Dashboard }) {
  const c = d.coach!;
  return (
    <section className="flex flex-col gap-5">
      <SectionHead id={`squad-${d.slaa_id}`} kicker={t.dashNavSquad} title={t.dashNeedsYou}
        icon={<Users className="size-6 text-accent" aria-hidden />} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 border-t-4 border-t-accent p-5 sm:p-6">
          <h3 className="flex items-center justify-between gap-3 font-bold">
            {t.dashRequestsTitle}
            <span className="bg-night px-2 py-0.5 text-xs text-white tabular-nums">{c.requests.length}</span>
          </h3>
          {c.requests.length ? (
            <ul className="flex flex-col divide-y divide-line">
              {c.requests.map((r) => (
                <li key={r.link} className="flex flex-col gap-3 py-3 first:pt-0">
                  <span className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-line text-xs font-black">{initials(r.name)}</span>
                    <span className="text-sm">
                      <strong>{r.name}</strong> <span className="font-mono text-xs text-muted">{r.athlete_id}</span>
                      <span className="block text-xs text-muted">
                        {districtName(lang, r.district)} · {r.birth_year}{r.events ? ` · ${r.events}` : ""}
                        {r.replaces ? ` · ${t.dashRequestIsChange}` : ""}
                      </span>
                    </span>
                  </span>
                  <span className="flex gap-2">
                    {(["accept", "decline"] as const).map((decision) => (
                      <form key={decision} action={act.decideLink}>
                        <Hidden lang={lang} slaaId={d.slaa_id} />
                        <input type="hidden" name="link" value={r.link} />
                        <input type="hidden" name="decision" value={decision} />
                        <button className={decision === "accept" ? DARK : GHOST}>
                          {decision === "accept" ? <><Check className="size-3.5" aria-hidden /> {t.dashAccept}</> : <><X className="size-3.5" aria-hidden /> {t.dashDecline}</>}
                        </button>
                      </form>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          ) : <AllClear t={t} />}
        </Card>

        <Card className="flex flex-col gap-4 border-t-4 border-t-gold p-5 sm:p-6">
          <h3 className="flex items-center justify-between gap-3 font-bold">
            {t.dashMarksTitle}
            <span className="bg-night px-2 py-0.5 text-xs text-white tabular-nums">{c.marks.length}</span>
          </h3>
          {c.marks.length ? (
            <ul className="flex flex-col divide-y divide-line">
              {c.marks.map((m) => (
                <li key={m.id} className="flex flex-col gap-3 py-3 text-sm first:pt-0">
                  <div>
                    <p><strong>{m.name}</strong> · {eventLabel(lang, m.event)}</p>
                    <p className="mt-1 flex items-baseline gap-2">
                      <span className="font-mono text-2xl font-black">{m.mark}</span>
                      {m.previous && <span className="text-xs text-muted">{fill(t.dashPreviousPb, { mark: m.previous })}</span>}
                    </p>
                    <p className="text-xs text-muted">{m.year}{m.competition ? ` · ${m.competition}` : ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={act.decideMark}>
                      <Hidden lang={lang} slaaId={d.slaa_id} />
                      <input type="hidden" name="markId" value={m.id} />
                      <input type="hidden" name="decision" value="accept" />
                      <button className={DARK}><Check className="size-3.5" aria-hidden /> {t.dashApproveMark}</button>
                    </form>
                    <form action={act.decideMark} className="flex gap-2">
                      <Hidden lang={lang} slaaId={d.slaa_id} />
                      <input type="hidden" name="markId" value={m.id} />
                      <input type="hidden" name="decision" value="decline" />
                      <input name="note" maxLength={500} placeholder={t.dashRejectReason} aria-label={t.dashRejectReason}
                        className="h-9 w-40 border border-line px-2 text-xs" />
                      <button className={GHOST}>{t.dashRejectMark}</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : <AllClear t={t} />}
        </Card>
      </div>

      {c.athletes.length > 0 && <SquadInsights t={t} c={c} />}

      <Card className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="flex items-center gap-2 text-lg font-bold"><Trophy className="size-5 text-accent" aria-hidden /> {t.dashSquadTitle}</h3>
          <p className="text-xs text-muted">{fill(t.dashPastAthletes, { count: String(c.past_count) })}</p>
        </div>
        <p className="-mt-2 text-sm text-muted">{t.dashSquadHint}</p>
        {c.athletes.length ? <Leaderboard lang={lang} t={t} c={c} /> : <p className="text-sm text-muted">{t.dashNoAthletes}</p>}
      </Card>

      <PastAndTimeline lang={lang} t={t} d={d} c={c} />

      {c.athletes.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold tracking-[0.16em] text-muted uppercase">{t.dashAthleteDetails}</h3>
          {c.athletes.map((a) => (
            <details key={a.link} className="card overflow-hidden">
              <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 select-none">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-night text-xs font-black text-white">{initials(a.full_name)}</span>
                <span className="flex-1 text-sm">
                  <strong>{a.full_name}</strong> <span className="font-mono text-xs text-muted">{a.athlete_id}</span>
                </span>
                {a.events.some((e) => e.pb && !e.verified) && <Badge tone="grey">{t.dashPbUnverified}</Badge>}
              </summary>
              <div className="border-t border-line px-4 py-4 text-sm">
                <p className="text-muted">
                  {formatDate(lang, a.date_of_birth)} · {a.gender === "F" ? t.genderF : t.genderM} · {districtName(lang, a.district)}
                  {a.school ? ` · ${a.school}` : ""}
                </p>
                <p className="mt-1">
                  {a.phone && <a href={`tel:${a.phone}`} className="font-semibold underline">{a.phone}</a>}
                  {a.email && <> · <a href={`mailto:${a.email}`} className="underline">{a.email}</a></>}
                </p>
                {a.events.length > 0 && (
                  <ul className="mt-3 flex flex-col divide-y divide-line border-t border-line">
                    {a.events.map((e) => (
                      <li key={e.code} className="flex flex-wrap items-center gap-3 py-2">
                        <span className="w-32 font-semibold">{eventLabel(lang, e.code)}</span>
                        <span className="font-mono font-bold">{e.pb ?? "—"}</span>
                        {e.place && e.field && <span className="text-xs text-muted">#{e.place} · {fill(t.dashTopPct, { pct: String(topPercent(e.place, e.field)) })}</span>}
                        {e.pb && (e.verified
                          ? <Badge tone="gold"><BadgeCheck className="size-3.5" aria-hidden /> {t.dashPbVerified}</Badge>
                          : (
                            <form action={act.confirmPb} className="ml-auto">
                              <Hidden lang={lang} slaaId={d.slaa_id} />
                              <input type="hidden" name="athleteId" value={a.athlete_id} />
                              <input type="hidden" name="event" value={e.code} />
                              <button className={GHOST}><BadgeCheck className="size-3.5" aria-hidden /> {t.dashConfirmPb}</button>
                            </form>
                          ))}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------
// Privacy
// ---------------------------------------------------------------------

export function PrivacyCard({ lang, t, d }: { lang: Lang; t: Dict; d: Dashboard }) {
  const options: [PrivacyKey, string][] = [
    ["hide_profile", t.dashHideProfile],
    ["hide_club", t.dashHideClub],
    ["hide_birth_year", t.dashHideBirthYear],
    ["hide_results", t.dashHideResults],
  ];
  return (
    <div id={`privacy-${d.slaa_id}`} className="scroll-mt-28">
      <Card className="flex h-full flex-col p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold"><EyeOff className="size-5 text-accent" aria-hidden /> {t.dashPrivacyTitle}</h2>
        <p className="mt-1 text-sm text-muted">{t.dashPrivacyIntro}</p>
        <form action={act.savePrivacy} className="mt-4 flex flex-col">
          <Hidden lang={lang} slaaId={d.slaa_id} />
          {options.map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center justify-between gap-4 border-b border-line py-3 text-sm last:border-0">
              {label}
              {/* a switch drawn around a real checkbox, so it still works without CSS */}
              <span className="relative inline-flex shrink-0">
                <input type="checkbox" name={key} defaultChecked={!!d.privacy[key]} className="peer sr-only" />
                <span className="h-6 w-11 bg-black/20 transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent" />
                <span className="absolute top-1 left-1 size-4 bg-white transition-transform peer-checked:translate-x-5" />
              </span>
            </label>
          ))}
          <button className={`${BUTTON} mt-4 self-start`}>{t.dashSavePrivacy}</button>
        </form>
      </Card>
    </div>
  );
}
