import {
  Bell, BadgeCheck, Check, ChevronRight, Clock, Eye, History, IdCard, LayoutDashboard, LogOut, Pencil, Plus,
  Settings, ShieldCheck, TrendingUp, UserCheck, UserRound, Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Notice } from "@/components/bits";
import type { Dict } from "@/lib/dict/en";
import { districtName } from "@/lib/districts";
import { fill, formatDate, type Lang } from "@/lib/i18n";
import { bestPerYear, type MarkPoint } from "@/lib/marks";
import { signOut } from "@/lib/member-actions";
import type { MemberRecord } from "@/lib/member-auth";
import type { Dashboard, MarkRow } from "@/lib/member-dashboard";
import { eventLabel } from "./Dashboard";
import { DashPendingButton } from "./DashPendingButton";

// Member portal: a navy sidebar, a top bar and one page per section,
// selected with ?view=. Server-rendered; the forms still post to
// lib/dashboard-actions.ts, which sends the member back to the same page.

export type PortalView = "overview" | "profile" | "performance" | "history" | "coaches" | "squad" | "settings";

const ICON: Record<PortalView, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard, profile: UserRound, performance: TrendingUp, history: History,
  coaches: UserCheck, squad: Users, settings: Settings,
};

/** The pages this record has, in sidebar order. */
export function portalViews(d: Dashboard | undefined): PortalView[] {
  if (!d) return ["overview", "profile", "settings"];
  const v: PortalView[] = ["overview", "profile"];
  if (d.is_athlete) v.push("performance", "history", "coaches");
  if (d.is_coach && d.is_athlete) v.push("squad");
  v.push("settings");
  return v;
}

export function viewLabel(t: Dict, v: PortalView) {
  return {
    overview: t.portalNavDashboard, profile: t.portalNavProfile, performance: t.dashNavPerformance,
    history: t.portalNavHistory, coaches: t.dashNavCoach, squad: t.dashNavSquad, settings: t.portalNavSettings,
  }[v];
}

export const portalHref = (lang: Lang, id: string, view: PortalView, extra = "") =>
  `/${lang}/account?r=${encodeURIComponent(id)}&view=${view}${extra}`;

const initials = (name: string) =>
  name.replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join("").toUpperCase() || "SL";

/** Things waiting for this member: marks to check or requests (coach), marks waiting (athlete). */
function waitingCount(d: Dashboard | undefined) {
  if (!d) return 0;
  const coach = d.coach ? d.coach.requests.length + d.coach.marks.length : 0;
  return coach + d.marks.filter((m) => m.status === "pending").length;
}

export function PortalShell({ lang, t, records, r, d, view, children }: {
  lang: Lang; t: Dict; records: MemberRecord[]; r: MemberRecord; d: Dashboard | undefined; view: PortalView;
  children: React.ReactNode;
}) {
  const views = portalViews(d);
  const name = r.details?.full_name ?? r.display_name;
  const role = [r.details?.is_athlete && t.roleAthlete, r.details?.is_coach && t.roleCoach].filter(Boolean).join(" · ");
  const waiting = waitingCount(d);
  return (
    <div className="portal">
      <aside className="portal-side">
        <div className="portal-side-brand">
          <Image src="/brand/sla-logo.png" alt="" width={40} height={40} className="size-10 rounded-lg" />
          <span className="leading-tight font-extrabold tracking-wide uppercase">{t.siteName}</span>
        </div>
        {records.length > 1 && (
          <div className="portal-records">
            <p className="portal-side-label">{t.portalRecord}</p>
            {records.map((x) => (
              <Link key={x.slaa_id} href={portalHref(lang, x.slaa_id, "overview")}
                aria-current={x.slaa_id === r.slaa_id ? "true" : undefined} className="portal-record">
                <span className="portal-avatar size-8 text-[0.7rem]">{initials(x.display_name)}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{x.display_name}</span>
                  <span className="block font-mono text-[0.68rem] opacity-60">{x.slaa_id}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
        <nav aria-label={t.accountTitle} className="portal-nav">
          {views.map((v) => {
            const Icon = ICON[v];
            return (
              <Link key={v} href={portalHref(lang, r.slaa_id, v)} aria-current={v === view ? "page" : undefined}
                className="portal-nav-link">
                <Icon className="size-[1.1rem] shrink-0" />
                <span>{viewLabel(t, v)}</span>
              </Link>
            );
          })}
        </nav>
        <form action={signOut} className="portal-logout">
          <input type="hidden" name="lang" value={lang} />
          <DashPendingButton type="submit" className="portal-nav-link w-full" pendingLabel="…">
            <LogOut className="size-[1.1rem] shrink-0" aria-hidden /> <span>{t.signOut}</span>
          </DashPendingButton>
        </form>
      </aside>

      <div className="portal-main">
        <div className="portal-top">
          <p className="portal-crumb">{t.accountTitle} <ChevronRight className="size-3.5" aria-hidden /> <span>{viewLabel(t, view)}</span></p>
          <div className="flex items-center gap-4">
            <Link href={portalHref(lang, r.slaa_id, d?.coach && (d.coach.requests.length || d.coach.marks.length) ? (d.is_athlete ? "squad" : "overview") : "performance")}
              className="portal-bell" aria-label={fill(t.portalNotifications, { count: String(waiting) })}>
              <Bell className="size-5" aria-hidden />
              {waiting > 0 && <span className="portal-bell-dot">{waiting > 9 ? "9+" : waiting}</span>}
            </Link>
            <div className="flex items-center gap-3">
              <span className="portal-avatar size-10 text-sm">{initials(name)}</span>
              <span className="hidden leading-tight sm:block">
                <span className="block max-w-[14rem] truncate text-sm font-bold">{name}</span>
                <span className="block text-xs text-muted">{role || t.accountTitle}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="portal-body">{children}</div>
      </div>
    </div>
  );
}

/** Page heading row: title, a line under it, and the verification pill. */
export function PortalHeading({ title, intro, r, t }: { title: string; intro?: string; r?: MemberRecord; t: Dict }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[1.75rem]">{title}</h1>
        {intro && <p className="mt-1 text-sm text-muted">{intro}</p>}
      </div>
      {r && (r.status === "verified"
        ? <span className="portal-pill is-ok"><BadgeCheck className="size-4" aria-hidden /> {t.portalVerified}</span>
        : <span className="portal-pill is-wait"><Clock className="size-4" aria-hidden /> {t.portalPending}</span>)}
    </div>
  );
}

// ---------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------

/** Performance line: y axis with values, a label on every point, years along the bottom. */
function ProgressChart({ points, label, compact = false }: { points: MarkPoint[]; label: string; compact?: boolean }) {
  // compact: a narrower drawing for phones, so its labels stay readable when scaled to the screen
  const W = compact ? 320 : 560, H = compact ? 220 : 230, L = compact ? 38 : 46, R = compact ? 18 : 22, T = 26, B = 30;
  const vals = points.map((p) => p.value);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo || Math.abs(hi) * 0.05 || 1) * 0.25;
  lo -= pad; hi += pad;
  const x = (i: number) => L + (points.length === 1 ? (W - L - R) / 2 : (i / (points.length - 1)) * (W - L - R));
  const y = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const ticks = [0, 1, 2, 3, 4].map((k) => hi - (k / 4) * (hi - lo));
  const fmt = (v: number) => (Math.abs(hi - lo) < 10 ? v.toFixed(1) : Math.round(v).toString());
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e7eaf3" />
          <text x={L - 10} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#8a90a2">{fmt(v)}</text>
        </g>
      ))}
      <path d={`${line} L${x(points.length - 1)},${H - B} L${x(0)},${H - B} Z`} fill={`url(#${compact ? "portal-area-c" : "portal-area"})`} />
      <defs>
        <linearGradient id={compact ? "portal-area-c" : "portal-area"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b4fd8" stopOpacity="0.16" />
          <stop offset="1" stopColor="#2b4fd8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={line} fill="none" stroke="#2b4fd8" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={p.year}>
          <circle cx={x(i)} cy={y(p.value)} r={4.5} fill="#2b4fd8" stroke="#fff" strokeWidth={2} />
          <text x={x(i)} y={y(p.value) - 11} textAnchor="middle" fontSize={11} fontWeight={700} fill="#1f2937">{p.mark}</text>
          <text x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="#8a90a2">{p.year}</text>
        </g>
      ))}
    </svg>
  );
}

type ResultRow = { key: string; year: number | null; event: string; mark: string; competition: string | null; pb: boolean };

/** Approved marks, newest first, plus any personal best not among them. */
function resultRows(d: Dashboard): ResultRow[] {
  const pbOf = new Map(d.events.map((e) => [e.code, e.pb]));
  const rows: ResultRow[] = d.marks
    .filter((m) => m.status === "approved")
    .sort((a, b) => b.year - a.year || b.at.localeCompare(a.at))
    .map((m) => ({ key: `m${m.id}`, year: m.year, event: m.event, mark: m.mark, competition: m.competition, pb: pbOf.get(m.event) === m.mark }));
  for (const e of d.events) {
    if (e.pb && !rows.some((r) => r.event === e.code && r.mark === e.pb))
      rows.push({ key: `pb${e.code}`, year: e.pb_year, event: e.code, mark: e.pb, competition: e.competition, pb: true });
  }
  return rows.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}

export function AthleteOverview({ lang, t, r, d, ev }: { lang: Lang; t: Dict; r: MemberRecord; d: Dashboard; ev?: string }) {
  const p = r.details;
  const name = p?.full_name ?? r.display_name;
  const main = [...d.events].sort((a, b) => a.priority - b.priority)[0];
  const series = d.events.map((e) => ({
    code: e.code,
    points: bestPerYear(e.code, [...d.marks.filter((m) => m.event === e.code && m.status === "approved"), { year: e.pb_year, mark: e.pb }]),
  })).filter((s) => s.points.length > 0);
  const chosen = series.find((s) => s.code === ev) ?? [...series].sort((a, b) => b.points.length - a.points.length)[0];
  const results = resultRows(d).slice(0, 6);
  const first = name.split(/\s+/)[0];

  return (
    <div className="flex flex-col gap-6">
      <PortalHeading title={t.portalNavDashboard} intro={fill(t.portalWelcome, { name: first })} r={r} t={t} />

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        {/* Profile card */}
        <section className="portal-card flex flex-col gap-6 sm:flex-row sm:items-center">
          <span className="portal-avatar portal-avatar-lg">{initials(name)}</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold tracking-tight">{name}</h2>
            <p className="mt-1 text-sm text-muted">{t.dashVitalId}: <span className="font-mono font-semibold text-ink">{r.slaa_id}</span></p>
            <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-sm text-ink/80">
              {main && <span>{eventLabel(lang, main.code)}</span>}
              {p?.district && <><span className="text-ink/25">|</span><span>{districtName(lang, p.district)}</span></>}
              {(p?.club_name || p?.academic_institution) && <><span className="text-ink/25">|</span><span>{p.club_name ?? p.academic_institution}</span></>}
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-[#eef0f6] pt-4 sm:grid-cols-3">
              <div><dt className="portal-dt">{t.dateOfBirth}</dt><dd className="portal-dd">{p ? formatDate(lang, p.date_of_birth) : "—"}</dd></div>
              <div><dt className="portal-dt">{t.gender}</dt><dd className="portal-dd">{p ? (p.gender === "F" ? t.genderF : t.genderM) : "—"}</dd></div>
              <div><dt className="portal-dt">{t.portalStatus}</dt>
                <dd className={`portal-dd flex items-center gap-1.5 ${r.status === "verified" ? "text-emerald-600" : "text-amber-600"}`}>
                  {r.status === "verified" ? <ShieldCheck className="size-4" aria-hidden /> : <Clock className="size-4" aria-hidden />}
                  {r.status === "verified" ? t.portalVerified : t.portalPending}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Quick actions */}
        <section className="portal-card">
          <h2 className="portal-h2">{t.portalQuickActions}</h2>
          <div className="mt-4 flex flex-col gap-2.5">
            <Link href={portalHref(lang, r.slaa_id, "performance", `#send-${r.slaa_id}`)} className="portal-btn">
              <Plus className="size-4" aria-hidden /> {t.portalActPb}
            </Link>
            <Link href={portalHref(lang, r.slaa_id, "coaches")} className="portal-btn-outline">
              <UserCheck className="size-4" aria-hidden /> {t.portalActCoach}
            </Link>
            <Link href={portalHref(lang, r.slaa_id, "settings")} className="portal-btn-outline">
              <ShieldCheck className="size-4" aria-hidden /> {t.portalActPrivacy}
            </Link>
            {r.status === "verified" && (
              <Link href={`/${lang}/athlete/${r.slaa_id}`} className="portal-btn-outline">
                <Eye className="size-4" aria-hidden /> {t.portalActPublic}
              </Link>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        {/* Performance progression */}
        <section className="portal-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="portal-h2">{t.portalProgressTitle}</h2>
              {chosen && <p className="mt-0.5 text-sm text-muted">{eventLabel(lang, chosen.code)} ({t.dashPb})</p>}
            </div>
            {series.length > 1 && (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.dashEvent}>
                {series.map((s) => (
                  <Link key={s.code} href={portalHref(lang, r.slaa_id, "overview", `&ev=${encodeURIComponent(s.code)}`)}
                    aria-current={s.code === chosen?.code ? "true" : undefined} className="portal-chip">
                    {eventLabel(lang, s.code)}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4">
            {chosen && chosen.points.length >= 2
              ? <>
                  <div className="sm:hidden"><ProgressChart compact points={chosen.points} label={`${eventLabel(lang, chosen.code)}: ${chosen.points.map((q) => `${q.year} ${q.mark}`).join(", ")}`} /></div>
                  <div className="hidden sm:block"><ProgressChart points={chosen.points} label={`${eventLabel(lang, chosen.code)}: ${chosen.points.map((q) => `${q.year} ${q.mark}`).join(", ")}`} /></div>
                </>
              : <p className="py-12 text-center text-sm text-muted">{t.portalProgressEmpty}</p>}
          </div>
        </section>

        {/* Recent results */}
        <section className="portal-card">
          <div className="flex items-center justify-between gap-2">
            <h2 className="portal-h2">{t.portalRecentResults}</h2>
            <Link href={portalHref(lang, r.slaa_id, "history")} className="text-sm font-semibold text-[#2b4fd8] hover:underline">{t.dashViewAll}</Link>
          </div>
          {results.length ? (
            <table className="portal-table mt-3">
              <thead><tr><th>{t.dashYear}</th><th>{t.dashEvent}</th><th>{t.portalResult}</th><th className="text-center">{t.portalPbShort}</th></tr></thead>
              <tbody>
                {results.map((x) => (
                  <tr key={x.key}>
                    <td className="text-muted">{x.year ?? "—"}</td>
                    <td>{eventLabel(lang, x.event)}</td>
                    <td className="font-mono font-bold">{x.mark}</td>
                    <td className="text-center">{x.pb ? <Check className="mx-auto size-4 text-emerald-600" aria-label={t.dashPb} /> : <span className="text-ink/30">–</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="py-10 text-center text-sm text-muted">{t.portalNoResults}</p>}
        </section>
      </div>

      {/* Update your information */}
      <section className="portal-card bg-[#f7f8fc]">
        <h2 className="portal-h2 flex items-center gap-2"><Pencil className="size-4 text-[#2b4fd8]" aria-hidden /> {t.portalUpdateTitle}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            { icon: IdCard, title: t.portalDetailsCard, text: t.portalDetailsCardText, cta: t.portalDetailsCardBtn, href: portalHref(lang, r.slaa_id, "profile") },
            { icon: TrendingUp, title: t.portalPbCard, text: t.portalPbCardText, cta: t.portalPbCardBtn, href: portalHref(lang, r.slaa_id, "performance", `#send-${r.slaa_id}`) },
            { icon: UserCheck, title: t.portalCoachCard, text: t.portalCoachCardText, cta: t.portalCoachCardBtn, href: portalHref(lang, r.slaa_id, "coaches") },
          ].map((c) => (
            <div key={c.title} className="flex gap-4 rounded-2xl border border-[#e6e9f2] bg-white p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eef2ff] text-[#2b4fd8]"><c.icon className="size-5" /></span>
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <p className="font-bold">{c.title}</p>
                <p className="text-sm text-muted">{c.text}</p>
                <Link href={c.href} className="portal-btn mt-2 h-9 px-5 text-sm">{c.cta}</Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------
// Profile and competition history
// ---------------------------------------------------------------------

export function ProfileView({ lang, t, r }: { lang: Lang; t: Dict; r: MemberRecord }) {
  const p = r.details;
  const rows: [string, React.ReactNode][] = p ? [
    [t.fullName, p.full_name],
    [t.nameWithInitials, p.name_with_initials],
    [t.dateOfBirth, formatDate(lang, p.date_of_birth)],
    [t.gender, p.gender === "F" ? t.genderF : t.genderM],
    [t.idNumber, p.nic ? `${t.idNic} ${p.nic}` : p.postal_id && `${t.idPostal} ${p.postal_id}`],
    [t.district, districtName(lang, p.district)],
    [t.phone, p.phone],
    [t.signInEmail, p.email],
    [t.roles, [p.is_athlete && t.roleAthlete, p.is_coach && t.roleCoach].filter(Boolean).join(", ")],
    [t.school, p.academic_institution],
    [t.club, p.club_name],
    [t.licence, [p.license_no, p.license_level].filter(Boolean).join(" · ")],
  ] : [];
  return (
    <div className="flex flex-col gap-6">
      <PortalHeading title={t.portalNavProfile} intro={t.portalProfileIntro} r={r} t={t} />
      <section data-testid="member-record" className="portal-card">
        {p ? (
          <>
            <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {rows.filter(([, value]) => value).map(([label, value]) => (
                <div key={label}>
                  <dt className="portal-dt">{label}</dt>
                  <dd className="portal-dd mt-1.5 break-words">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 border-t border-[#eef0f6] pt-4 text-sm text-muted">{fill(t.registeredOn, { date: formatDate(lang, p.registered_on) })}</p>
          </>
        ) : <Notice>{t.accountPending}</Notice>}
      </section>
    </div>
  );
}

const STATUS_TONE: Record<MarkRow["status"], string> = {
  approved: "bg-emerald-50 text-emerald-700", pending: "bg-amber-50 text-amber-700",
  rejected: "bg-red-50 text-red-700", withdrawn: "bg-slate-100 text-slate-600",
};

export function HistoryView({ lang, t, r, d }: { lang: Lang; t: Dict; r: MemberRecord; d: Dashboard }) {
  const marks = [...d.marks].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <div className="flex flex-col gap-6">
      <PortalHeading title={t.portalNavHistory} intro={t.portalHistoryIntro} r={r} t={t} />
      <section className="portal-card overflow-x-auto">
        {marks.length ? (
          <table className="portal-table min-w-[36rem]">
            <thead><tr><th>{t.dashYear}</th><th>{t.dashEvent}</th><th>{t.portalResult}</th><th>{t.dashCompetition.replace(/\s*\(.*\)/, "")}</th><th>{t.portalStatus}</th></tr></thead>
            <tbody>
              {marks.map((m) => (
                <tr key={m.id}>
                  <td className="text-muted">{m.year}</td>
                  <td className="font-semibold">{eventLabel(lang, m.event)}</td>
                  <td className="font-mono font-bold">{m.mark}</td>
                  <td className="text-muted">{m.competition ?? "—"}</td>
                  <td>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_TONE[m.status]}`}>{t[`dashStatus_${m.status}` as keyof Dict]}</span>
                    {m.note && <span className="mt-1 block text-xs text-muted">{m.note}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="py-10 text-center text-sm text-muted">{t.dashActivityEmpty}</p>}
      </section>
    </div>
  );
}
