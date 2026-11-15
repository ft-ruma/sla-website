"use client";

import {
  BadgeCheck, Check, Clock, Eye, History, IdCard, Pencil, Plus, ShieldCheck, TrendingUp, UserCheck, UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Notice } from "@/components/bits";
import type { Dict } from "@/lib/dict/en";
import { districtName } from "@/lib/districts";
import { fill, formatDate, type Lang } from "@/lib/i18n";
import { EVENTS } from "@/lib/events";
import { bestPerYear, type MarkPoint } from "@/lib/marks";
import type { MemberRecord } from "@/lib/member-auth";
import type { Dashboard, MarkRow } from "@/lib/member-dashboard";
import { PortalLink } from "./PortalShell";

export type { PortalView } from "./portal-nav";
export { portalHref, portalViews, viewLabel } from "./portal-nav";

const EXTRA_EVENTS: Record<string, string> = {
  "3000m": "3000m", RW: "Race walk", HM: "Half marathon", XC: "Cross country", "4x400mX": "4×400m mixed relay",
};
const eventLabel = (lang: Lang, code: string) =>
  EVENTS.find((e) => e.code === code)?.name[lang] ?? EXTRA_EVENTS[code] ?? code;

const initials = (name: string) =>
  name.replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join("").toUpperCase() || "SLA";

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
  const [eventCode, setEventCode] = useState(ev);
  const chosen = series.find((s) => s.code === eventCode) ?? [...series].sort((a, b) => b.points.length - a.points.length)[0];
  const results = resultRows(d).slice(0, 6);
  const first = name.split(/\s+/)[0];
  const sendHash = `send-${r.slaa_id}`;

  return (
    <div className="flex flex-col gap-6">
      <PortalHeading title={t.portalNavDashboard} intro={fill(t.portalWelcome, { name: first })} r={r} t={t} />

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
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

        <section className="portal-card">
          <h2 className="portal-h2">{t.portalQuickActions}</h2>
          <div className="mt-4 flex flex-col gap-2.5">
            <PortalLink view="performance" hash={sendHash} className="portal-btn">
              <Plus className="size-4" aria-hidden /> {t.portalActPb}
            </PortalLink>
            <PortalLink view="coaches" className="portal-btn-outline">
              <UserCheck className="size-4" aria-hidden /> {t.portalActCoach}
            </PortalLink>
            <PortalLink view="settings" className="portal-btn-outline">
              <ShieldCheck className="size-4" aria-hidden /> {t.portalActPrivacy}
            </PortalLink>
            {r.status === "verified" && (
              <Link href={`/${lang}/athlete/${r.slaa_id}`} className="portal-btn-outline">
                <Eye className="size-4" aria-hidden /> {t.portalActPublic}
              </Link>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <section className="portal-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="portal-h2">{t.portalProgressTitle}</h2>
              {chosen && <p className="mt-0.5 text-sm text-muted">{eventLabel(lang, chosen.code)} ({t.dashPb})</p>}
            </div>
            {series.length > 1 && (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.dashEvent}>
                {series.map((s) => (
                  <button key={s.code} type="button" onClick={() => setEventCode(s.code)}
                    aria-current={s.code === chosen?.code ? "true" : undefined} className="portal-chip">
                    {eventLabel(lang, s.code)}
                  </button>
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

        <section className="portal-card">
          <div className="flex items-center justify-between gap-2">
            <h2 className="portal-h2">{t.portalRecentResults}</h2>
            <PortalLink view="history" className="text-sm font-semibold text-[#2b4fd8] hover:underline">{t.dashViewAll}</PortalLink>
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

      <section className="portal-card bg-[#f7f8fc]">
        <h2 className="portal-h2 flex items-center gap-2"><Pencil className="size-4 text-[#2b4fd8]" aria-hidden /> {t.portalUpdateTitle}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {([
            { icon: IdCard, title: t.portalDetailsCard, text: t.portalDetailsCardText, cta: t.portalDetailsCardBtn, view: "profile" as const },
            { icon: TrendingUp, title: t.portalPbCard, text: t.portalPbCardText, cta: t.portalPbCardBtn, view: "performance" as const, hash: sendHash },
            { icon: UserCheck, title: t.portalCoachCard, text: t.portalCoachCardText, cta: t.portalCoachCardBtn, view: "coaches" as const },
          ]).map((c) => (
            <div key={c.title} className="flex gap-4 rounded-2xl border border-[#e6e9f2] bg-white p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eef2ff] text-[#2b4fd8]"><c.icon className="size-5" /></span>
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <p className="font-bold">{c.title}</p>
                <p className="text-sm text-muted">{c.text}</p>
                <PortalLink view={c.view} hash={c.hash} className="portal-btn mt-2 h-9 px-5 text-sm">{c.cta}</PortalLink>
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
