import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { Notice } from "@/components/bits";
import { ChangePassword } from "@/components/MemberForms";
import { AthleteDashboard, CoachDashboard, PrivacyCard } from "@/components/Dashboard";
import {
  AthleteOverview, HistoryView, PortalHeading, ProfileView,
} from "@/components/MemberPortal";
import { PortalShell } from "@/components/PortalShell";
import { portalViews, type PortalView } from "@/components/portal-nav";
import type { DashMessage } from "@/lib/dashboard-actions";
import { coachSearch, dashboard, dashboardAvailable, type CoachHit } from "@/lib/member-dashboard";
import { Container } from "@/components/PageHero";
import type { Dict } from "@/lib/dict/en";
import { fill } from "@/lib/i18n";
import { currentMember, memberRecords } from "@/lib/member-auth";
import { pageLang, pageMeta, type LangParams } from "@/lib/page";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LangParams) {
  const { lang, t } = await pageLang(params);
  return { ...pageMeta(lang, "/account", t.accountTitle), robots: { index: false } };
}

const GOOD: DashMessage[] = [
  "privacySaved", "markSent", "markWithdrawn", "coachRequested", "coachCancelled",
  "linkAccepted", "linkDeclined", "pastConfirmed", "pastDeclined", "markApproved", "markRejected", "pbConfirmed",
];

export default async function AccountPage({
  params,
  searchParams,
}: LangParams & { searchParams: Promise<Record<string, string | undefined>> }) {
  const { lang, t } = await pageLang(params);
  // Load session and registrations together so the first paint waits on one round-trip.
  const [member, records] = await Promise.all([
    currentMember().catch(() => null),
    memberRecords().catch(() => [] as Awaited<ReturnType<typeof memberRecords>>),
  ]);
  if (!member) redirect(`/${lang}/sign-in`);
  if (!records.length) {
    return <Container className="py-16"><Notice>{t.accountPending}</Notice></Container>;
  }
  const s = await searchParams;
  // one registration at a time: ?r= picks it (several can share an email)
  const r = records.find((x) => x.slaa_id === (s.r ?? "").toUpperCase()) ?? records[0];
  const d = (await dashboard(r.slaa_id).catch(() => null)) ?? undefined;
  const views = portalViews(d);
  const view: PortalView = views.includes(s.view as PortalView) ? (s.view as PortalView) : "overview";
  const coachQuery = (s.coachq ?? "").trim().slice(0, 80);
  const hits: CoachHit[] | null = coachQuery && s.for === r.slaa_id ? await coachSearch(coachQuery).catch(() => []) : null;
  const message = s.msg && `dashMsg_${s.msg}` in t ? (s.msg as DashMessage) : null;

  const toast = message && s.r === r.slaa_id ? (
    <p role={GOOD.includes(message) ? "status" : "alert"}
      className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${GOOD.includes(message) ? "dash-toast-ok" : "dash-toast-err"}`}>
      {t[`dashMsg_${message}` as keyof Dict]}
    </p>
  ) : null;

  const overview = d?.is_athlete
    ? <AthleteOverview lang={lang} t={t} r={r} d={d} ev={s.ev} />
    : d?.is_coach && d.coach
      ? <>
          <PortalHeading title={t.portalNavDashboard} intro={fill(t.portalWelcome, { name: (r.details?.full_name ?? r.display_name).split(/\s+/)[0] })} r={r} t={t} />
          <CoachDashboard lang={lang} t={t} d={d} />
        </>
      : <ProfileView lang={lang} t={t} r={r} />;

  return (
    <PortalShell lang={lang} t={t} records={records} r={r} d={d} view={view} panels={{
      overview: <>{!dashboardAvailable() && <Notice>{t.dashUnavailable}</Notice>}{toast}{overview}</>,
      profile: <ProfileView lang={lang} t={t} r={r} />,
      performance: d?.is_athlete
        ? <AthleteDashboard lang={lang} t={t} d={d} status={r.status} coachQuery="" hits={null} only="performance" />
        : null,
      history: d?.is_athlete ? <HistoryView lang={lang} t={t} r={r} d={d} /> : null,
      coaches: d?.is_athlete
        ? <AthleteDashboard lang={lang} t={t} d={d} status={r.status}
            coachQuery={s.for === r.slaa_id ? coachQuery : ""} hits={hits} only="coach" />
        : null,
      squad: d?.is_coach && d.coach ? <CoachDashboard lang={lang} t={t} d={d} /> : null,
      settings: (
        <div className="flex flex-col gap-6">
          <PortalHeading title={t.portalNavSettings} t={t} />
          {d && <PrivacyCard lang={lang} t={t} d={d} />}
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="portal-card">
              <h2 className="portal-h2">{t.passwordTitle}</h2>
              <p className="mt-1 mb-5 text-sm text-muted">{t.passwordChangeText}</p>
              <ChangePassword lang={lang} t={t} />
            </div>
            <div className="portal-card flex flex-col justify-between gap-5">
              <p className="flex gap-3 text-sm text-muted">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#2b4fd8]" aria-hidden />
                {fill(t.accountSignedInAs, { email: member.email })}. {t.accountPrivate}
              </p>
            </div>
          </div>
        </div>
      ),
    }} />
  );
}
