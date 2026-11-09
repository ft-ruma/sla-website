import {
  BadgeCheck, Check, CircleCheck, Clock, EyeOff, Search, Send, TrendingDown, TrendingUp, Trophy, UserCheck,
  Users, X,
} from "lucide-react";
import { Badge, Notice } from "@/components/bits";
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

const INPUT = "dash-input";
const BUTTON = "dash-btn";
const SMALL = "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-bold";
const GHOST = "dash-btn-ghost";
const DARK = "dash-btn";
const KICKER = "text-xs font-bold tracking-[0.18em] text-accent uppercase";
const PANEL = "dash-panel p-5 sm:p-6";

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
    <div id={id} className="scroll-mt-28 dash-rise">
      <p className={KICKER}>{kicker}</p>
      <h2 className="mt-1.5 flex items-center gap-2.5 text-2xl font-bold tracking-tight sm:text-3xl">
        <span className="grid size-10 place-items-center rounded-2xl bg-accent/10 text-accent sm:size-11">{icon}</span>
        {title}
      </h2>
      {intro && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{intro}</p>}
    </div>
  );
}

function nextAction(t: Dict, status: MemberRecord["status"], d: Dashboard): string {
  if (status !== "verified") return t.dashNextActionPending;
  if (d.is_athlete && !d.coaches.some((c) => c.state === "active")) return t.dashNextActionCoach;
  if (d.is_athlete && d.marks.some((m) => m.status === "pending")) {
    return fill(t.dashInsightWaiting, { count: String(d.marks.filter((m) => m.status === "pending").length) });
  }
  if (d.is_athlete && d.events.some((e) => e.pb && !e.verified)) return t.dashNextActionVerify;
  if (d.is_athlete && !d.events.some((e) => e.pb)) return t.dashNextActionMark;
  return t.dashNextActionDone;
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

  const insights: string[] = [];
  if (d?.is_athlete) {
    const waiting = d.marks.filter((m) => m.status === "pending").length;
    if (waiting) insights.push(fill(t.dashInsightWaiting, { count: String(waiting) }));
    const best = bestEvent(d.events);
    if (best) insights.push(fill(t.dashInsightBest, { event: eventLabel(lang, best.code), pct: String(topPercent(best.place!, best.field!)) }));
  }

  return (
    <section className="relative overflow-hidden bg-night text-white">
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-accent/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 left-10 size-64 rounded-full bg-brand/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-[0.05] md:block"
        style={{ backgroundImage: "repeating-linear-gradient(115deg, #fff 0 2px, transparent 2px 46px)" }} />
      <Container className="relative flex flex-col gap-7 py-10 sm:py-12">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4 sm:gap-5">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-accent to-[#c44a00] text-xl font-black shadow-lg shadow-accent/30 sm:size-[4.5rem] sm:text-2xl">
              {initials(r.display_name)}
            </span>
            <div className="min-w-0">
              <p className={KICKER}>{t.accountTitle}</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-5xl">{r.display_name}</h1>
              <p className="mt-2.5 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-white/10 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-gold">{r.slaa_id}</span>
                {r.status === "verified"
                  ? <Badge tone="gold"><BadgeCheck className="size-3.5" aria-hidden /> {t.accountVerifiedBadge}</Badge>
                  : <span className="rounded-full border border-white/30 px-2.5 py-1 text-xs font-bold tracking-wider uppercase">{t.accountPendingBadge}</span>}
                {d?.is_athlete && <Badge tone="blue">{t.roleAthlete}</Badge>}
                {d?.is_coach && <Badge tone="blue">{t.roleCoach}</Badge>}
              </p>
              {email && <p className="mt-2 text-xs text-white/60">{fill(t.accountSignedInAs, { email })}</p>}
            </div>
          </div>
          {checks.length > 0 && (
            <div className="flex items-center gap-5 rounded-[1.35rem] border border-white/12 bg-white/[0.05] p-4 backdrop-blur-sm">
              <ScoreRing value={score} label={`${t.dashProfileTitle}: ${Math.round(score * 100)}%`} />
              <div>
                <p className="text-xs font-bold tracking-[0.14em] text-white/55 uppercase">{t.dashProfileTitle}</p>
                <ul className="mt-2 flex flex-col gap-1.5 text-xs">
                  {checks.map(([label, ok]) => (
                    <li key={label} className={`flex items-center gap-1.5 ${ok ? "text-white" : "text-white/40"}`}>
                      {ok ? <Check className="size-3.5 text-gold" aria-hidden /> : <span className="inline-block size-3.5 rounded-sm border border-white/35" aria-hidden />}
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {insights.length > 0 && (
          <div className="dash-insight">
            {insights.map((tip) => (
              <span key={tip} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">{tip}</span>
            ))}
          </div>
        )}

        {tiles.length > 0 && (
          <dl className="dash-kpi">
            {tiles.map((k) => (
              <div key={k.label}>
                <dt className="text-[0.68rem] font-bold tracking-[0.14em] text-white/55 uppercase">{k.label}</dt>
                <dd className="mt-2 text-3xl font-black tracking-tight tabular-nums sm:text-4xl">{k.value}</dd>
                {k.sub && <dd className="mt-1 text-xs text-white/60">{k.sub}</dd>}
              </div>
            ))}
          </dl>
        )}

        <div>
          <p className="mb-2 text-[0.68rem] font-bold tracking-[0.14em] text-white/45 uppercase">{t.dashJumpTo}</p>
          <nav aria-label={r.display_name} className="dash-nav">
            {nav.map(([id, label]) => (
              <a key={id} href={`#${id}`}>{label}</a>
            ))}
          </nav>
        </div>
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
    <article className={`${PANEL} flex flex-col gap-5 dash-rise`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.16em] text-muted uppercase">{name}</p>
          {e.pb ? (
            <>
              <p className="mt-1 font-mono text-4xl font-black tracking-tight sm:text-5xl">{e.pb}</p>
              <p className="mt-1.5 text-xs text-muted">{[e.pb_year, e.competition].filter(Boolean).join(" · ")}</p>
              <div className="mt-2.5">
                {e.verified
                  ? <Badge tone="gold"><BadgeCheck className="size-3.5" aria-hidden /> {t.dashPbVerified}</Badge>
                  : <Badge tone="grey"><Clock className="size-3.5" aria-hidden /> {t.dashPbUnverified}</Badge>}
              </div>
            </>
          ) : <p className="mt-2 text-lg font-bold text-muted">{t.dashNoPb}</p>}
        </div>
        {ranked ? (
          <div className="flex flex-col items-center rounded-2xl bg-sand/80 px-3 py-2 text-center">
            <RankRing place={e.place!} field={e.field!} label={rankText} />
            <p className="mt-1 text-xs text-muted">{fill(t.dashFieldOf, { field: String(e.field) })}</p>
            <p className="text-xs font-bold text-accent">{fill(t.dashTopPct, { pct: String(topPercent(e.place!, e.field!)) })}</p>
          </div>
        ) : (
          <p className="max-w-28 text-right text-xs text-muted">{t.dashEmptyRank}</p>
        )}
      </div>

      {(e.pb && e.dist && e.place && e.dist.length >= 3 && markValue(e.pb) !== null) || points.length >= 2 ? (
        <div className="rounded-2xl bg-sand/70 p-4">
          <p className="mb-3 text-xs font-bold tracking-[0.12em] text-muted uppercase">{t.dashAnalysisTitle}</p>
          {e.pb && e.dist && e.place && e.dist.length >= 3 && markValue(e.pb) !== null && (
            <div className="mb-4 last:mb-0">
              <p className="mb-2 text-xs font-semibold text-ink/70">{t.dashFieldTitle}</p>
              <FieldHistogram code={e.code} dist={e.dist} mine={markValue(e.pb)!} place={e.place} t={t} />
            </div>
          )}
          {points.length >= 2 ? (
            <div>
              <p className="mb-1 text-xs font-semibold text-ink/70">{t.dashProgressTitle}</p>
              <TrendChart code={e.code} points={points} label={`${name}: ${points.map((p) => `${p.year} ${p.mark}`).join(", ")}`} />
              {change && (
                <p className={`mt-2 flex items-center gap-1.5 text-sm font-bold ${change.better ? "text-emerald-700" : "text-clay"}`}>
                  {change.better ? <TrendingUp className="size-4" aria-hidden /> : <TrendingDown className="size-4" aria-hidden />}
                  {change.text}
                </p>
              )}
            </div>
          ) : e.pb ? <p className="text-xs text-muted">{t.dashTrendEmpty}</p> : null}
        </div>
      ) : null}

      {waiting && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-gold/30 px-3.5 py-2.5 text-sm">
          <span className="flex items-center gap-1.5 font-semibold">
            <Clock className="size-4" aria-hidden />
            {fill(t.dashWaitingFor, { mark: waiting.mark, year: String(waiting.year) })}
          </span>
          <form action={act.withdrawMark}>
            <Hidden lang={lang} slaaId={slaaId} />
            <input type="hidden" name="markId" value={waiting.id} />
            <button className="text-xs font-bold underline underline-offset-2 hover:text-accent">{t.dashWithdraw}</button>
          </form>
        </div>
      )}
    </article>
  );
}

export function AthleteDashboard({ lang, t, d, status, coachQuery, hits }: {
  lang: Lang; t: Dict; d: Dashboard; status: MemberRecord["status"]; coachQuery: string; hits: CoachHit[] | null;
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

  const focus = nextAction(t, status, d);

  return (
    <>
      <section className="flex flex-col gap-5">
        <div className="dash-focus p-5 sm:p-6 dash-rise">
          <p className={KICKER}>{t.dashFocusTitle}</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-muted uppercase">{t.dashNextAction}</p>
              <p className="mt-1 text-lg font-bold tracking-tight sm:text-xl">{focus}</p>
            </div>
            <a href={`#send-${d.slaa_id}`} className={`${BUTTON} self-start`}>
              <Send className="size-4" aria-hidden /> {t.dashSendMarkOpen}
            </a>
          </div>
        </div>

        <SectionHead id={`perf-${d.slaa_id}`} kicker={t.dashNavPerformance} title={t.dashEventsTitle}
          intro={t.dashEventsIntro} icon={<Trophy className="size-5" aria-hidden />} />
        {(strength.length > 0 || activity.length > 0) && (
          <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
            <div className={PANEL}>
              <h3 className="text-xs font-bold tracking-[0.14em] text-muted uppercase">{t.dashStrengthTitle}</h3>
              <p className="mt-1 mb-4 text-sm text-muted">{t.dashStrengthHint}</p>
              {strength.length ? <StrengthBars rows={strength} /> : <p className="text-sm text-muted">{t.dashNoPb}</p>}
            </div>
            <div className={PANEL}>
              <h3 className="text-xs font-bold tracking-[0.14em] text-muted uppercase">{t.dashActivityTitle}</h3>
              {activity.length ? (
                <ol className="mt-4 flex flex-col">
                  {activity.map((m) => (
                    <li key={m.id} className="relative flex gap-3 pb-4 pl-1 last:pb-0">
                      <span className={`relative mt-1 size-3 shrink-0 rounded-full ring-4 ring-white ${
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
            </div>
          </div>
        )}
        {d.events.length ? (
          <div className="grid gap-5 md:grid-cols-2">
            {d.events.map((e) => <EventCard key={e.code} lang={lang} t={t} e={e} marks={d.marks} slaaId={d.slaa_id} />)}
          </div>
        ) : <Notice>{t.dashNoEvents}</Notice>}
        <p className="text-xs text-muted">{t.dashRankNote}</p>

        <div id={`send-${d.slaa_id}`} className={`${PANEL} scroll-mt-28 border-l-4 border-accent`}>
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <Send className="size-4 text-accent" aria-hidden /> {t.dashSendMark}
          </h3>
          <p className="mt-2 text-sm text-muted">{active.length ? t.dashSendMarkIntro : t.dashSendMarkNoCoach}</p>
          <form action={act.sendMark} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Hidden lang={lang} slaaId={d.slaa_id} />
            <label className="flex flex-col gap-1.5 text-xs font-bold tracking-wider uppercase">
              {t.dashEvent}
              <select name="event" required className={INPUT} defaultValue={d.events[0]?.code}>
                {eventCodes.map((c) => <option key={c} value={c}>{eventLabel(lang, c)}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-bold tracking-wider uppercase">
              {t.dashMark}
              <input name="mark" required inputMode="decimal" maxLength={12} placeholder="10.85" className={`${INPUT} font-mono`} />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-bold tracking-wider uppercase">
              {t.dashYear}
              <input name="year" type="number" required min={1950} max={year} defaultValue={year} className={INPUT} />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-bold tracking-wider uppercase">
              {t.dashCompetition}
              <input name="competition" maxLength={120} className={INPUT} />
            </label>
            <button className={`${BUTTON} sm:col-span-2 lg:col-span-4 sm:justify-self-start`}>
              <Send className="size-4" aria-hidden /> {t.dashSendMarkButton}
            </button>
          </form>
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <SectionHead id={`coach-${d.slaa_id}`} kicker={t.dashNavCoach} title={t.dashCoachTitle}
          icon={<UserCheck className="size-6 text-accent" aria-hidden />} />
        {!active.length && <Notice>{t.dashNeedCoach}</Notice>}
        {(active.length > 0 || awaiting.length > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            {[...active, ...awaiting].map((c) => (
              <div key={c.link} className={`${PANEL} flex items-center gap-4`}>
                <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${c.state === "active" ? "bg-night text-white" : "bg-line text-muted"}`}>
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
              </div>
            ))}
          </div>
        )}
        {past.length > 0 && (
          <p className="text-xs text-muted">
            {t.dashPastCoaches}: {past.map((c) => `${c.name}${c.end_year ? ` (${c.end_year})` : ""}`).join(", ")}
          </p>
        )}

        <div className={PANEL}>
          <h3 className="font-bold">{active.length ? t.dashChangeCoach : t.dashChooseCoach}</h3>
          <p className="mt-1 text-sm text-muted">{active.length ? t.dashChangeCoachIntro : t.dashChooseCoachIntro}</p>
          <form method="get" action={`/${lang}/account#coach-${d.slaa_id}`} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="for" value={d.slaa_id} />
            <input name="coachq" defaultValue={coachQuery} minLength={2} maxLength={80} required
              placeholder={t.dashCoachSearchHint} aria-label={t.dashCoachSearchHint} className={INPUT} />
            <button className={`${BUTTON} shrink-0`}><Search className="size-4" aria-hidden /> {t.dashSearch}</button>
          </form>
          {hits && (hits.length ? (
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line">
              {hits.map((h) => (
                <li key={h.slaa_id} className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 text-sm">
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
        </div>
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
        <thead className="text-xs tracking-[0.14em] text-muted uppercase">
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
                  ? <span className={`inline-flex size-7 items-center justify-center rounded-full ${podium[i]}`}>{i + 1}</span>
                  : <span className="inline-flex size-7 items-center justify-center rounded-full text-muted">{i + 1}</span>}
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
      <div className={PANEL}>
        <h3 className="text-xs font-bold tracking-[0.14em] text-muted uppercase">{t.dashGroupTitle}</h3>
        <div className="mt-4">
          <Donut slices={slices} total={c.athletes.length} centerLabel={t.dashAthletesShort} />
        </div>
      </div>
      <div className={`${PANEL} flex flex-col gap-6`}>
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
      </div>
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
      <div className={PANEL}>
        <h3 className="text-xs font-bold tracking-[0.14em] text-muted uppercase">{t.dashTimelineTitle}</h3>
        <p className="mt-1 mb-4 text-sm text-muted">{t.dashTimelineHint}</p>
        {stints.length ? (
          <CoachingTimeline stints={stints} now={now}
            labels={{ current: t.dashTimelineCurrent, past: t.dashTimelinePast, pending: t.dashTimelinePending }} />
        ) : <p className="text-sm text-muted">{t.dashTimelineEmpty}</p>}
        {undated > 0 && stints.length > 0 && (
          <p className="mt-3 text-xs text-muted">{fill(t.dashTimelineNoYear, { count: String(undated) })}</p>
        )}
      </div>

      <div className={`${PANEL} flex flex-col`}>
        <h3 className="flex items-center justify-between gap-3 text-xs font-bold tracking-[0.14em] text-muted uppercase">
          {t.dashPastTitle}
          {waiting > 0 && <span className="rounded-full bg-gold px-2.5 py-0.5 text-xs text-night tabular-nums">{fill(t.dashPastWaiting, { count: String(waiting) })}</span>}
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
      </div>
    </div>
  );
}

export function CoachDashboard({ lang, t, d }: { lang: Lang; t: Dict; d: Dashboard }) {
  const c = d.coach!;
  return (
    <section className="flex flex-col gap-5">
      <SectionHead id={`squad-${d.slaa_id}`} kicker={t.dashNavSquad} title={t.dashNeedsYou}
        icon={<Users className="size-5" aria-hidden />} />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={`${PANEL} flex flex-col gap-4 border-t-4 border-t-accent`}>
          <h3 className="flex items-center justify-between gap-3 font-bold">
            {t.dashRequestsTitle}
            <span className="rounded-full bg-night px-2.5 py-0.5 text-xs text-white tabular-nums">{c.requests.length}</span>
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
        </div>

        <div className={`${PANEL} flex flex-col gap-4 border-t-4 border-t-gold`}>
          <h3 className="flex items-center justify-between gap-3 font-bold">
            {t.dashMarksTitle}
            <span className="rounded-full bg-night px-2.5 py-0.5 text-xs text-white tabular-nums">{c.marks.length}</span>
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
                        className="dash-input h-9 w-44 text-xs" />
                      <button className={GHOST}>{t.dashRejectMark}</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : <AllClear t={t} />}
        </div>
      </div>

      {c.athletes.length > 0 && <SquadInsights t={t} c={c} />}

      <div className={`${PANEL} flex flex-col gap-4`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="flex items-center gap-2 text-lg font-bold"><Trophy className="size-5 text-accent" aria-hidden /> {t.dashSquadTitle}</h3>
          <p className="text-xs text-muted">{fill(t.dashPastAthletes, { count: String(c.past_count) })}</p>
        </div>
        <p className="-mt-2 text-sm text-muted">{t.dashSquadHint}</p>
        {c.athletes.length ? <Leaderboard lang={lang} t={t} c={c} /> : <p className="text-sm text-muted">{t.dashNoAthletes}</p>}
      </div>

      <PastAndTimeline lang={lang} t={t} d={d} c={c} />

      {c.athletes.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold tracking-[0.16em] text-muted uppercase">{t.dashAthleteDetails}</h3>
          {c.athletes.map((a) => (
            <details key={a.link} className="dash-panel overflow-hidden">
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
      <div className={`${PANEL} flex h-full flex-col`}>
        <h2 className="flex items-center gap-2 text-lg font-bold"><EyeOff className="size-5 text-accent" aria-hidden /> {t.dashPrivacyTitle}</h2>
        <p className="mt-1 text-sm text-muted">{t.dashPrivacyIntro}</p>
        <form action={act.savePrivacy} className="mt-4 flex flex-col">
          <Hidden lang={lang} slaaId={d.slaa_id} />
          {options.map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center justify-between gap-4 border-b border-line py-3.5 text-sm last:border-0">
              <span className="pr-3 leading-snug">{label}</span>
              <span className="relative inline-flex shrink-0">
                <input type="checkbox" name={key} defaultChecked={!!d.privacy[key]} className="peer sr-only" />
                <span className="h-7 w-12 rounded-full bg-black/15 transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent" />
                <span className="absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
              </span>
            </label>
          ))}
          <button className={`${BUTTON} mt-5 self-start`}>{t.dashSavePrivacy}</button>
        </form>
      </div>
    </div>
  );
}
