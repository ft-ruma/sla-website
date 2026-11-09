import {
  BadgeCheck, CalendarDays, Check, CircleCheck, Clock, EyeOff, MapPin, Search, Send,
  TrendingDown, TrendingUp, Trophy, UserCheck, Users, X,
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
  CoachingTimeline, Columns, Donut, FieldHistogram, GROUP_COLORS, improvement, RadarChart, RankRing, ScoreRing,
  Sparkline, SplitBar, standing, StrengthBars, topPercent, TrendChart,
} from "./DashboardCharts";
import { markValue } from "@/lib/marks";
import { DashPendingButton } from "./DashPendingButton";
import { HubRailNav, type HubRailIcon } from "./HubRailNav";

// Performance Hub: left rail, centre analytics, right insights. Server-rendered;
// forms post to lib/dashboard-actions.ts.

const INPUT = "dash-input";
const BUTTON = "dash-btn";
const SMALL = "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-bold";
const GHOST = "dash-btn-ghost";
const DARK = "dash-btn";
const KICKER = "text-xs font-bold tracking-[0.16em] text-brand uppercase";
const PANEL = "dash-panel p-5 sm:p-6";
const LINK = "text-sm font-bold text-brand hover:underline underline-offset-2";

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
// Performance Hub shell: rail · main · insights
// ---------------------------------------------------------------------

function firstName(name: string) {
  return name.replace(/[^\p{L}\s]/gu, " ").trim().split(/\s+/)[0] || name;
}

function ageYears(dob: string | null | undefined) {
  if (!dob) return null;
  const born = Date.parse(dob);
  if (!Number.isFinite(born)) return null;
  return Math.max(0, Math.floor((Date.now() - born) / (365.25 * 86_400_000)));
}

type Kpi = {
  label: string; value: React.ReactNode; sub?: string; spark?: number[]; rising?: boolean;
  delta?: string; tone?: "blue" | "green" | "orange" | "violet";
};

export function DashHub({ lang, t, r, d, email, children }: {
  lang: Lang; t: Dict; r: MemberRecord; d: Dashboard | undefined; email: string | null;
  children: React.ReactNode;
}) {
  const p = r.details;
  const checks: [string, boolean][] = d?.is_athlete ? [
    [t.dashChkVerified, r.status === "verified"],
    [t.dashChkCoach, d.coaches.some((c) => c.state === "active")],
    [t.dashChkEvents, d.events.length > 0],
    [t.dashChkPb, d.events.some((e) => e.pb)],
    [t.dashChkPbVerified, d.events.some((e) => e.pb) && d.events.every((e) => !e.pb || e.verified)],
  ] : d?.is_coach && d.coach ? [
    [t.dashChkVerified, r.status === "verified"],
    [t.dashSumAthletes, d.coach.athletes.length > 0],
    [t.dashSumRequests, d.coach.requests.length === 0],
    [t.dashSumMarks, d.coach.marks.length === 0],
  ] : [[t.dashChkVerified, r.status === "verified"]];
  const profileScore = checks.length ? checks.filter(([, ok]) => ok).length / checks.length : 0;
  const ranked = d?.is_athlete ? d.events.filter((e) => e.place && e.field) : [];
  const standScore = ranked.length
    ? ranked.reduce((s, e) => s + standing(e.place!, e.field!), 0) / ranked.length
    : 0;
  // Blend completeness with competitive standing so OVR feels like performance, not a checklist.
  const score = d?.is_athlete && ranked.length
    ? Math.min(0.99, profileScore * 0.35 + standScore * 0.65)
    : profileScore;
  const focus = d ? nextAction(t, r.status, d) : t.dashNextActionPending;
  const coach = d?.coaches.find((c) => c.state === "active" && c.primary) ?? d?.coaches.find((c) => c.state === "active");
  const best = d?.is_athlete ? bestEvent(d.events) : undefined;
  const withPb = d?.is_athlete ? d.events.filter((e) => e.pb) : [];
  const waiting = d?.is_athlete ? d.marks.filter((m) => m.status === "pending").length : 0;
  const age = ageYears(p?.date_of_birth);
  const bestTrend = best && d ? bestPerYear(best.code, [
    ...d.marks.filter((m) => m.event === best.code && m.status === "approved"),
    { year: best.pb_year, mark: best.pb },
  ]) : [];
  const bestChange = best ? improvement(best.code, bestTrend, t) : null;
  const verifiedShare = withPb.length ? withPb.filter((e) => e.verified).length / withPb.length : 0;

  const tiles: Kpi[] = [];
  if (d?.is_athlete) {
    tiles.push(
      {
        label: t.dashKpiBestRank,
        value: best ? `#${best.place}` : "—",
        sub: best ? `${eventLabel(lang, best.code)} · ${fill(t.dashTopPct, { pct: String(topPercent(best.place!, best.field!)) })}` : t.dashKpiNone,
        spark: best ? [0.35, 0.42, 0.5, 0.55, standing(best.place!, best.field!)] : [0.2, 0.25, 0.22, 0.28, 0.3],
        rising: true,
        delta: bestChange ? `${bestChange.better ? "+" : "−"}${bestChange.text.match(/\(([\d.]+)%\)/)?.[1] ?? "0"}%` : undefined,
        tone: "blue",
      },
      {
        label: t.dashKpiVerified,
        value: `${withPb.filter((e) => e.verified).length}/${withPb.length || 0}`,
        sub: t.dashKpiPbCount,
        spark: [0.25, 0.35, 0.45, 0.55, Math.max(0.15, verifiedShare)],
        rising: verifiedShare >= 0.5,
        delta: withPb.length ? `${Math.round(verifiedShare * 100)}%` : undefined,
        tone: "green",
      },
      {
        label: t.dashKpiWaiting,
        value: waiting,
        sub: t.dashActivityTitle,
        spark: [waiting + 3, waiting + 2, waiting + 1, Math.max(0, waiting), waiting].map(Number),
        rising: waiting === 0,
        delta: waiting === 0 ? "0" : `+${waiting}`,
        tone: "orange",
      },
      {
        label: t.dashKpiEvents,
        value: d.events.length,
        sub: coach?.name ? `${t.dashKpiCoach}: ${coach.name}` : t.dashKpiCoach,
        spark: [1, 1.5, 2, Math.max(1, d.events.length - 1), Math.max(1, d.events.length)],
        rising: true,
        delta: d.events.length ? `+${d.events.length}` : undefined,
        tone: "violet",
      },
    );
  } else if (d?.is_coach && d.coach) {
    tiles.push(
      { label: t.dashSumRequests, value: d.coach.requests.length, spark: [2, 1, d.coach.requests.length, d.coach.requests.length], rising: d.coach.requests.length === 0, tone: "orange" },
      { label: t.dashSumMarks, value: d.coach.marks.length, spark: [3, 2, 1, d.coach.marks.length], rising: d.coach.marks.length === 0, tone: "blue" },
      { label: t.dashSumAthletes, value: d.coach.athletes.length, spark: [1, 2, 3, d.coach.athletes.length || 1], rising: true, tone: "green" },
      { label: t.dashKpiPast, value: d.coach.past?.length ?? d.coach.past_count, spark: [1, 1, 2, 2], rising: true, tone: "violet" },
    );
  }

  const nav: { id: string; label: string; icon: HubRailIcon }[] = [
    { id: `overview-${r.slaa_id}`, label: t.dashNavOverview, icon: "overview" },
  ];
  if (d?.is_athlete) {
    nav.push({ id: `perf-${r.slaa_id}`, label: t.dashNavPerformance, icon: "performance" });
    nav.push({ id: `coach-${r.slaa_id}`, label: t.dashNavCoach, icon: "coach" });
  }
  if (d?.is_coach) nav.push({ id: `squad-${r.slaa_id}`, label: t.dashNavSquad, icon: "squad" });
  if (d) nav.push({ id: `privacy-${r.slaa_id}`, label: t.dashNavPrivacy, icon: "privacy" });
  nav.push({ id: `details-${r.slaa_id}`, label: t.dashNavDetails, icon: "details" });

  const roles = [d?.is_athlete && t.roleAthlete, d?.is_coach && t.roleCoach].filter(Boolean).join(" · ");
  const club = p?.club_name || p?.academic_institution || "—";
  const sideStats: [string, string][] = [];
  if (d?.is_athlete) {
    sideStats.push(
      [t.dashKpiBestRank, best ? `#${best.place}` : "—"],
      [t.dashKpiVerified, `${withPb.filter((e) => e.verified).length}/${withPb.length || 0}`],
      [t.dashKpiWaiting, String(waiting)],
      [t.dashKpiEvents, String(d.events.length)],
      [t.dashKpiCoach, coach?.name ?? t.dashKpiNone],
    );
  } else if (d?.is_coach && d.coach) {
    sideStats.push(
      [t.dashSumAthletes, String(d.coach.athletes.length)],
      [t.dashSumRequests, String(d.coach.requests.length)],
      [t.dashSumMarks, String(d.coach.marks.length)],
      [t.dashKpiPast, String(d.coach.past?.length ?? d.coach.past_count)],
    );
  }

  const infoRows: [typeof BadgeCheck, string, string][] = [
    [BadgeCheck, t.dashVitalId, r.slaa_id],
    [CalendarDays, t.dateOfBirth, p ? formatDate(lang, p.date_of_birth) : "—"],
    [Users, t.dashVitalGender, p ? (p.gender === "F" ? t.genderF : t.genderM) : "—"],
    [MapPin, t.dashVitalDistrict, p ? districtName(lang, p.district) : "—"],
    [Trophy, t.dashVitalClub, club],
  ];

  return (
    <div id={`r-${r.slaa_id}`} className="hub scroll-mt-20">
      <aside className="hub-rail" aria-label={t.dashJumpTo}>
        <div className="hub-brand">
          <span className="hub-brand-mark" aria-hidden>SLA</span>
          <div>
            <p className="text-[0.65rem] font-bold tracking-[0.16em] text-brand uppercase">{t.dashHubBrand}</p>
            <p className="text-sm font-bold text-ink">{t.accountTitle}</p>
          </div>
        </div>
        <HubRailNav ariaLabel={t.dashJumpTo} items={nav} />
        <div className="hub-rail-cta">
          <p className="text-xs font-bold tracking-[0.14em] text-white/70 uppercase">{t.dashFocusCta}</p>
          <p className="mt-2 text-sm font-semibold leading-snug text-white">{focus}</p>
          {d?.is_athlete && (
            <a href={`#send-${d.slaa_id}`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-brand">
              <Send className="size-3.5" aria-hidden /> {t.dashSendMarkOpen}
            </a>
          )}
        </div>
        <div className="hub-rail-user">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-xs font-black text-brand">{initials(r.display_name)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{r.display_name}</p>
            <p className="truncate font-mono text-[0.68rem] text-muted">{r.slaa_id}</p>
          </div>
        </div>
      </aside>

      <div className="hub-main">
        <header id={`overview-${r.slaa_id}`} className="hub-welcome scroll-mt-28">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-[2rem]">
              {fill(t.dashWelcomeBack, { name: firstName(r.display_name) })}{" "}
              <span aria-hidden>👋</span>
            </h1>
            <p className="mt-1 text-sm text-muted">{t.dashWelcomeSub}</p>
            {email && <p className="mt-1 text-xs text-muted">{fill(t.accountSignedInAs, { email })}</p>}
          </div>
          {d?.is_athlete && (
            <a href={`#perf-${r.slaa_id}`} className={`${LINK} hidden sm:inline-flex items-center gap-1`}>
              {t.dashViewAnalytics} →
            </a>
          )}
        </header>

        <section className="hub-athlete dash-rise">
          <div className="hub-athlete-media" aria-hidden>
            <span className="hub-athlete-orb" />
            <span className="hub-athlete-ring" />
            <span className="hub-athlete-avatar">{initials(r.display_name)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{r.display_name}</h2>
              {r.status === "verified"
                ? <Badge tone="gold"><BadgeCheck className="size-3.5" aria-hidden /> {t.accountVerifiedBadge}</Badge>
                : <Badge tone="grey">{t.accountPendingBadge}</Badge>}
            </div>
            <p className="mt-1 text-sm font-medium text-brand/80">
              {roles || t.accountTitle}
              {p?.club_name ? ` · ${p.club_name}` : p?.academic_institution ? ` · ${p.academic_institution}` : ""}
            </p>
            <dl className="hub-vitals">
              <div><dt>{t.dashVitalId}</dt><dd className="font-mono">{r.slaa_id}</dd></div>
              <div><dt>{t.dashVitalAge}</dt><dd>{age ?? "—"}</dd></div>
              <div><dt>{t.dashVitalDistrict}</dt><dd>{p ? districtName(lang, p.district) : "—"}</dd></div>
              <div><dt>{t.dashVitalGender}</dt><dd>{p ? (p.gender === "F" ? t.genderF : t.genderM) : "—"}</dd></div>
              <div><dt>{t.dashVitalClub}</dt><dd className="truncate" title={club}>{club}</dd></div>
            </dl>
          </div>
          {d?.is_athlete && best && (
            <div className="hub-athlete-highlight">
              <p className="text-[0.65rem] font-bold tracking-[0.14em] text-white/65 uppercase">{t.dashKpiBestRank}</p>
              <p className="mt-1 text-3xl font-black text-white">#{best.place}</p>
              <p className="text-xs font-semibold text-white/80">{eventLabel(lang, best.code)}</p>
              <p className="mt-1 text-[0.7rem] text-white/60">{fill(t.dashTopPct, { pct: String(topPercent(best.place!, best.field!)) })}</p>
            </div>
          )}
        </section>

        {tiles.length > 0 && (
          <dl className="hub-kpi">
            {tiles.map((k) => (
              <div key={k.label} className={`hub-kpi-card tone-${k.tone ?? "blue"}`}>
                <div className="flex items-start justify-between gap-2">
                  <dt>{k.label}</dt>
                  {k.delta && (
                    <span className={`hub-delta ${k.rising === false ? "is-down" : "is-up"}`}>{k.delta}</span>
                  )}
                </div>
                <dd className="hub-kpi-value">{k.value}</dd>
                {k.sub && <dd className="text-xs text-muted">{k.sub}</dd>}
                {k.spark && <Sparkline values={k.spark} rising={k.rising !== false} />}
              </div>
            ))}
          </dl>
        )}

        <nav className="hub-mobile-nav" aria-label={t.dashJumpTo}>
          {nav.map(({ id, label }) => <a key={id} href={`#${id}`}>{label}</a>)}
        </nav>

        <div className="flex flex-col gap-8 sm:gap-10">{children}</div>
      </div>

      <aside className="hub-side" aria-label={t.dashSeasonSummary}>
        <div className="hub-search" role="search">
          <Search className="size-4 shrink-0 text-muted" aria-hidden />
          <p className="min-w-0 flex-1 truncate text-sm text-muted">{t.dashSearchPlaceholder}</p>
          <div className="flex max-w-[55%] gap-1 overflow-x-auto">
            {nav.slice(0, 3).map(({ id, label }) => (
              <a key={id} href={`#${id}`} className="hub-search-chip">{label}</a>
            ))}
          </div>
        </div>

        <div className="hub-side-card">
          <h3 className="hub-side-title">{t.dashSeasonSummary}</h3>
          <div className="mt-4 flex items-center gap-4">
            <ScoreRing value={score} label={`${t.dashProfileTitle}: ${Math.round(score * 100)}`} tone="light" size={118} />
            <ul className="flex flex-1 flex-col gap-2.5 text-sm">
              {sideStats.map(([label, value]) => (
                <li key={label} className="flex items-baseline justify-between gap-3">
                  <span className="text-muted">{label}</span>
                  <strong className="tabular-nums">{value}</strong>
                </li>
              ))}
            </ul>
          </div>
          <ul className="mt-4 flex flex-col gap-1.5 border-t border-line pt-4 text-xs">
            {checks.map(([label, ok]) => (
              <li key={label} className={`flex items-center gap-1.5 ${ok ? "text-ink" : "text-muted"}`}>
                {ok ? <Check className="size-3.5 text-emerald-600" aria-hidden /> : <span className="size-3.5 rounded-sm border border-line" aria-hidden />}
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="hub-side-card">
          <h3 className="hub-side-title">{t.dashPlayerInfo}</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {infoRows.map(([Icon, label, value]) => (
              <li key={label} className="flex items-start gap-3 text-sm">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-xs text-muted">{label}</span>
                  <strong className="font-semibold break-words">{value}</strong>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="hub-side-action">
          <p className="text-xs font-bold tracking-[0.14em] text-white/70 uppercase">{t.dashNextAction}</p>
          <p className="mt-2 text-base font-bold leading-snug text-white">{focus}</p>
          {d?.is_athlete ? (
            <a href={`#send-${d.slaa_id}`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-brand">
              <Send className="size-4" aria-hidden /> {t.dashSendMarkOpen}
            </a>
          ) : d?.is_coach ? (
            <a href={`#squad-${d.slaa_id}`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-brand">
              <Users className="size-4" aria-hidden /> {t.dashNavSquad}
            </a>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

/** @deprecated Prefer DashHub — kept for any stray imports. */
export function RecordHero(props: {
  lang: Lang; t: Dict; r: MemberRecord; d: Dashboard | undefined; email: string | null;
}) {
  return <DashHub {...props}>{null}</DashHub>;
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
    <article className="event-card dash-rise">
      <div className="event-card-head">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-bold tracking-[0.16em] text-white/70 uppercase">{name}</p>
          {e.pb ? (
            <>
              <p className="mt-1 font-mono text-4xl font-black tracking-tight text-white sm:text-5xl">{e.pb}</p>
              <p className="mt-1.5 text-xs text-white/65">{[e.pb_year, e.competition].filter(Boolean).join(" · ")}</p>
            </>
          ) : <p className="mt-2 text-lg font-bold text-white/70">{t.dashNoPb}</p>}
        </div>
        {ranked ? (
          <div className="flex flex-col items-center rounded-2xl bg-white/15 px-3 py-2 text-center text-white backdrop-blur-sm">
            <RankRing place={e.place!} field={e.field!} label={rankText} />
            <p className="mt-1 text-xs text-white/70">{fill(t.dashFieldOf, { field: String(e.field) })}</p>
            <p className="text-xs font-bold text-gold">{fill(t.dashTopPct, { pct: String(topPercent(e.place!, e.field!)) })}</p>
          </div>
        ) : (
          <p className="max-w-28 text-right text-xs text-white/55">{t.dashEmptyRank}</p>
        )}
      </div>

      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {e.pb && (e.verified
            ? <Badge tone="gold"><BadgeCheck className="size-3.5" aria-hidden /> {t.dashPbVerified}</Badge>
            : <Badge tone="grey"><Clock className="size-3.5" aria-hidden /> {t.dashPbUnverified}</Badge>)}
          {change && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${change.better ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-clay"}`}>
              {change.better ? <TrendingUp className="size-3.5" aria-hidden /> : <TrendingDown className="size-3.5" aria-hidden />}
              {change.text}
            </span>
          )}
        </div>

        {(e.pb && e.dist && e.place && e.dist.length >= 3 && markValue(e.pb) !== null) || points.length >= 2 ? (
          <div className="rounded-2xl bg-[#f3f5fb] p-4">
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
              </div>
            ) : e.pb ? <p className="text-xs text-muted">{t.dashTrendEmpty}</p> : null}
          </div>
        ) : null}

        {waiting && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-sm ring-1 ring-amber-200">
            <span className="flex items-center gap-1.5 font-semibold">
              <Clock className="size-4 text-amber-600" aria-hidden />
              {fill(t.dashWaitingFor, { mark: waiting.mark, year: String(waiting.year) })}
            </span>
            <form action={act.withdrawMark}>
              <Hidden lang={lang} slaaId={slaaId} />
              <input type="hidden" name="markId" value={waiting.id} />
              <button className="text-xs font-bold text-brand underline underline-offset-2">{t.dashWithdraw}</button>
            </form>
          </div>
        )}
      </div>
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

  const trendEvent = [...d.events]
    .map((e) => ({ e, points: bestPerYear(e.code, [...d.marks.filter((m) => m.event === e.code && m.status === "approved"), { year: e.pb_year, mark: e.pb }]) }))
    .sort((a, b) => b.points.length - a.points.length || (a.e.place && a.e.field && b.e.place && b.e.field ? a.e.place / a.e.field - b.e.place / b.e.field : 0))[0];
  const trendChange = trendEvent ? improvement(trendEvent.e.code, trendEvent.points, t) : null;
  const insights: string[] = [];
  if (status !== "verified") insights.push(t.dashNextActionPending);
  else if (!active.length) insights.push(t.dashNextActionCoach);
  const waitingMarks = d.marks.filter((m) => m.status === "pending").length;
  if (waitingMarks) insights.push(fill(t.dashInsightWaiting, { count: String(waitingMarks) }));
  const best = bestEvent(d.events);
  if (best) insights.push(fill(t.dashInsightBest, { event: eventLabel(lang, best.code), pct: String(topPercent(best.place!, best.field!)) }));
  if (trendChange) insights.push(fill(t.dashInsightImprove, { event: eventLabel(lang, trendEvent!.e.code), delta: trendChange.text }));

  const radarRows = strength.slice(0, 6).map((r) => ({ label: r.label.replace(/\s.*/, "").slice(0, 8), value: standing(r.place, r.field) }));
  const markSlices = [
    { label: t.dashStatus_approved, value: d.marks.filter((m) => m.status === "approved").length, color: "#16a34a" },
    { label: t.dashStatus_pending, value: d.marks.filter((m) => m.status === "pending").length, color: "#f59e0b" },
    { label: t.dashStatus_rejected, value: d.marks.filter((m) => m.status === "rejected").length, color: "#c1121f" },
  ].filter((s) => s.value > 0);

  return (
    <>
      <section className="flex flex-col gap-5">
        <SectionHead id={`perf-${d.slaa_id}`} kicker={t.dashNavPerformance} title={t.dashEventsTitle}
          intro={t.dashEventsIntro} icon={<Trophy className="size-5" aria-hidden />} />

        {insights.length > 0 && (
          <div className="hub-insight-strip">
            {insights.slice(0, 3).map((tip) => (
              <span key={tip} className="hub-insight-chip">{tip}</span>
            ))}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
          <div className={`${PANEL} min-h-72`}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold">{t.dashPerformanceTrend}</h3>
                <p className="text-xs text-muted">{t.dashTrendPick}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {trendEvent && <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">{eventLabel(lang, trendEvent.e.code)}</span>}
                {trendChange && (
                  <span className={`text-xs font-bold ${trendChange.better ? "text-emerald-600" : "text-clay"}`}>
                    {trendChange.better ? "↑" : "↓"} {trendChange.text}
                  </span>
                )}
              </div>
            </div>
            {trendEvent && trendEvent.points.length >= 2 ? (
              <TrendChart
                tall
                code={trendEvent.e.code}
                points={trendEvent.points}
                label={`${eventLabel(lang, trendEvent.e.code)}: ${trendEvent.points.map((p) => `${p.year} ${p.mark}`).join(", ")}`}
              />
            ) : <p className="mt-10 text-sm text-muted">{t.dashNoTrendYet}</p>}
          </div>
          <div className={PANEL}>
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h3 className="text-base font-bold">{t.dashActivityTitle}</h3>
              <a href={`#send-${d.slaa_id}`} className={LINK}>{t.dashViewAll}</a>
            </div>
            {activity.length ? (
              <ol className="flex flex-col">
                {activity.slice(0, 5).map((m) => (
                  <li key={m.id} className="hub-match-row">
                    <span className={`hub-match-dot ${
                      { pending: "is-pending", approved: "is-win", rejected: "is-loss", withdrawn: "is-draw" }[m.status]}`} aria-hidden />
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#eef1f8] text-[0.65rem] font-black text-brand">
                      {m.event.slice(0, 3)}
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <strong className="block truncate">{eventLabel(lang, m.event)}</strong>
                      <span className="text-xs text-muted">{t[`dashStatus_${m.status}` as keyof Dict]} · {m.year}{m.competition ? ` · ${m.competition}` : ""}</span>
                    </span>
                    <span className="font-mono text-sm font-black tabular-nums">{m.mark}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-muted">{t.dashActivityEmpty}</p>}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className={PANEL}>
            <h3 className="text-base font-bold">{t.dashStrengthTitle}</h3>
            <p className="mt-1 mb-3 text-sm text-muted">{t.dashRadarHint}</p>
            {radarRows.length >= 3 ? (
              <RadarChart rows={radarRows} />
            ) : strength.length ? (
              <StrengthBars rows={strength} />
            ) : <p className="text-sm text-muted">{t.dashNoPb}</p>}
            {radarRows.length >= 3 && strength.length > 0 && (
              <div className="mt-2"><StrengthBars rows={strength.slice(0, 4)} /></div>
            )}
          </div>
          <div className={PANEL}>
            <h3 className="text-base font-bold">{t.dashMarksBreakdown}</h3>
            <p className="mt-1 mb-3 text-sm text-muted">{t.dashMarksBreakdownHint}</p>
            {markSlices.length ? (
              <Donut slices={markSlices} total={markSlices.reduce((n, s) => n + s.value, 0)} centerLabel={t.dashMarksShort} />
            ) : <p className="text-sm text-muted">{t.dashActivityEmpty}</p>}
          </div>
        </div>

        {d.events.length ? (
          <div className="grid gap-5 md:grid-cols-2">
            {d.events.map((e) => <EventCard key={e.code} lang={lang} t={t} e={e} marks={d.marks} slaaId={d.slaa_id} />)}
          </div>
        ) : <Notice>{t.dashNoEvents}</Notice>}
        <p className="text-xs text-muted">{t.dashRankNote}</p>

        <div id={`send-${d.slaa_id}`} className={`${PANEL} scroll-mt-28 border-l-4 border-brand`}>
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <Send className="size-4 text-brand" aria-hidden /> {t.dashSendMark}
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
            <DashPendingButton className={`${BUTTON} sm:col-span-2 lg:col-span-4 sm:justify-self-start`} pendingLabel="…">
              <Send className="size-4" aria-hidden /> {t.dashSendMarkButton}
            </DashPendingButton>
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
                        <DashPendingButton className={DARK}>{t.dashSwitchTo}</DashPendingButton>
                      </form>
                    )}
                    <form action={act.requestCoach}>
                      <Hidden lang={lang} slaaId={d.slaa_id} />
                      <input type="hidden" name="coachId" value={h.slaa_id} />
                      <input type="hidden" name="mode" value="add" />
                      <DashPendingButton className={active.length ? GHOST : DARK}>{active.length ? t.dashAddCoach : t.dashRequestCoach}</DashPendingButton>
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
                        <DashPendingButton className={decision === "accept" ? DARK : GHOST}>
                          {decision === "accept" ? <><Check className="size-3.5" aria-hidden /> {t.dashAccept}</> : <><X className="size-3.5" aria-hidden /> {t.dashDecline}</>}
                        </DashPendingButton>
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
                      <DashPendingButton className={DARK}><Check className="size-3.5" aria-hidden /> {t.dashApproveMark}</DashPendingButton>
                    </form>
                    <form action={act.decideMark} className="flex gap-2">
                      <Hidden lang={lang} slaaId={d.slaa_id} />
                      <input type="hidden" name="markId" value={m.id} />
                      <input type="hidden" name="decision" value="decline" />
                      <input name="note" maxLength={500} placeholder={t.dashRejectReason} aria-label={t.dashRejectReason}
                        className="dash-input h-9 w-44 text-xs" />
                      <DashPendingButton className={GHOST}>{t.dashRejectMark}</DashPendingButton>
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
        <h2 className="flex items-center gap-2 text-lg font-bold"><EyeOff className="size-5 text-brand" aria-hidden /> {t.dashPrivacyTitle}</h2>
        <p className="mt-1 text-sm text-muted">{t.dashPrivacyIntro}</p>
        <form action={act.savePrivacy} className="mt-4 flex flex-col">
          <Hidden lang={lang} slaaId={d.slaa_id} />
          {options.map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center justify-between gap-4 border-b border-line py-3.5 text-sm last:border-0">
              <span className="pr-3 leading-snug">{label}</span>
              <span className="relative inline-flex shrink-0">
                <input type="checkbox" name={key} defaultChecked={!!d.privacy[key]} className="peer sr-only" />
                <span className="h-7 w-12 rounded-full bg-black/15 transition-colors peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-brand" />
                <span className="absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
              </span>
            </label>
          ))}
          <DashPendingButton className={`${BUTTON} mt-5 self-start`}>{t.dashSavePrivacy}</DashPendingButton>
        </form>
      </div>
    </div>
  );
}
