import { ChevronDown, IdCard, LogOut, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { Card, Notice } from "@/components/bits";
import { ChangePassword } from "@/components/MemberForms";
import { AthleteDashboard, CoachDashboard, PrivacyCard, RecordHero } from "@/components/Dashboard";
import type { DashMessage } from "@/lib/dashboard-actions";
import { coachSearch, dashboard, dashboardAvailable, type CoachHit, type Dashboard } from "@/lib/member-dashboard";
import { Container } from "@/components/PageHero";
import type { Dict } from "@/lib/dict/en";
import { districtName } from "@/lib/districts";
import { fill, formatDate, type Lang } from "@/lib/i18n";
import { signOut } from "@/lib/member-actions";
import { currentMember, memberRecords, type MemberRecord } from "@/lib/member-auth";
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
  const member = await currentMember().catch(() => null);
  if (!member) redirect(`/${lang}/sign-in`);
  const s = await searchParams;
  const records = await memberRecords().catch(() => []);
  const boards = new Map<string, Dashboard>();
  for (const d of await Promise.all(records.map((r) => dashboard(r.slaa_id).catch(() => null))))
    if (d) boards.set(d.slaa_id, d);
  const coachQuery = (s.coachq ?? "").trim().slice(0, 80);
  const hits: CoachHit[] | null = coachQuery && s.for ? await coachSearch(coachQuery).catch(() => []) : null;
  const message = s.msg && `dashMsg_${s.msg}` in t ? (s.msg as DashMessage) : null;

  const multiple = records.length > 1;

  return (
    <>
      {multiple && (
        <section className="bg-night text-white">
          <Container className="flex flex-col gap-2 pt-10 pb-2">
            <p className="text-xs font-bold tracking-widest text-accent uppercase">{t.accountTitle}</p>
            <h1 className="text-3xl font-bold sm:text-4xl">{fill(t.accountRecordCount, { count: String(records.length) })}</h1>
            <p className="text-sm text-white/70">{fill(t.accountSignedInAs, { email: member.email })}</p>
          </Container>
        </section>
      )}
      {!dashboardAvailable() && <Container className="pt-8"><Notice>{t.dashUnavailable}</Notice></Container>}

      {records.map((r) => {
        const d = boards.get(r.slaa_id);
        return (
          <div key={r.slaa_id} id={`r-${r.slaa_id}`} className="scroll-mt-20 border-b-4 border-accent last:border-b-0">
            <RecordHero lang={lang} t={t} r={r} d={d} email={multiple ? null : member.email} />
            <Container className="flex flex-col gap-14 py-10 sm:py-14">
              {message && s.r === r.slaa_id && (
                <p role={GOOD.includes(message) ? "status" : "alert"}
                  className={`flex items-center gap-2 border-l-4 px-4 py-3 text-sm font-semibold ${GOOD.includes(message) ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-clay bg-red-50 text-red-800"}`}>
                  {t[`dashMsg_${message}` as keyof Dict]}
                </p>
              )}
              {d?.is_athlete && (
                <AthleteDashboard lang={lang} t={t} d={d} coachQuery={s.for === r.slaa_id ? coachQuery : ""}
                  hits={s.for === r.slaa_id ? hits : null} />
              )}
              {d?.is_coach && d.coach && <CoachDashboard lang={lang} t={t} d={d} />}
              <details id={`details-${r.slaa_id}`} className="group card scroll-mt-28 overflow-hidden" open={!d}>
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 font-bold select-none sm:px-6">
                  <span className="flex items-center gap-2"><IdCard className="size-5 text-accent" aria-hidden /> {t.dashDetailsTitle}</span>
                  <ChevronDown className="size-5 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="border-t border-line"><RecordCard lang={lang} t={t} r={r} /></div>
              </details>
              {d && <PrivacyCard lang={lang} t={t} d={d} />}
            </Container>
          </div>
        );
      })}

      <section className="bg-white">
        <Container className="grid gap-6 py-12 lg:grid-cols-[1.2fr_1fr]">
          <Card className="p-6 sm:p-8">
            <p className="text-xs font-bold tracking-[0.18em] text-accent uppercase">{t.dashSettingsTitle}</p>
            <h2 className="mt-1 text-lg font-bold">{t.passwordTitle}</h2>
            <p className="mt-1 mb-5 text-sm text-muted">{t.passwordChangeText}</p>
            <ChangePassword lang={lang} t={t} />
          </Card>
          <div className="flex flex-col justify-end gap-5">
            <p className="flex gap-3 text-sm text-muted">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
              {t.accountPrivate}
            </p>
            <form action={signOut}>
              <input type="hidden" name="lang" value={lang} />
              <button type="submit" className="inline-flex h-11 items-center gap-2 border border-ink px-5 text-sm font-bold hover:bg-night hover:text-white">
                <LogOut className="size-4" aria-hidden /> {t.signOut}
              </button>
            </form>
          </div>
        </Container>
      </section>
    </>
  );
}

function RecordCard({ lang, t, r }: { lang: Lang; t: Dict; r: MemberRecord }) {
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
    <div data-testid="member-record" className="p-5 sm:p-6">
      {p ? (
        <>
          <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.filter(([, value]) => value).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold tracking-wider text-muted uppercase">{label}</dt>
                <dd className="mt-2 font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-sm text-muted">{fill(t.registeredOn, { date: formatDate(lang, p.registered_on) })}</p>
        </>
      ) : (
        <Notice>{t.accountPending}</Notice>
      )}
    </div>
  );
}
