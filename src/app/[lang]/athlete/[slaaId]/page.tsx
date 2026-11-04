import { BadgeCheck, CircleAlert, MapPin, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { ArrowLink, Badge, Card, Notice } from "@/components/bits";
import { Container } from "@/components/PageHero";
import { districtName } from "@/lib/districts";
import { fill, getDict, isLang } from "@/lib/i18n";
import { pageMeta } from "@/lib/page";
import { getMember } from "@/lib/registry";
import { isValidSlaaId, normalizeSlaaId } from "@/lib/slaa-id";

type Params = { params: Promise<{ lang: string; slaaId: string }> };

export const dynamic = "force-dynamic";

async function load(params: Params["params"]) {
  const { lang, slaaId } = await params;
  if (!isLang(lang)) notFound();
  return { lang, t: getDict(lang), id: normalizeSlaaId(decodeURIComponent(slaaId)) };
}

export async function generateMetadata({ params }: Params) {
  const { lang, t, id } = await load(params);
  return { ...pageMeta(lang, `/athlete/${id}`, `${id} · ${t.verifiedMember}`), robots: { index: false } };
}

export default async function AthleteProfile({ params }: Params) {
  const { lang, t, id } = await load(params);
  const member = isValidSlaaId(id) ? await getMember(id) : null;
  const back = <ArrowLink href={`/${lang}/athletes`}>{t.athletesTitle}</ArrowLink>;

  if (!member) {
    return (
      <Container className="flex max-w-2xl flex-col gap-5 py-16">
        <p className="font-mono text-2xl font-bold tracking-wider">{id}</p>
        {member === undefined ? <Notice>{t.notConnected}</Notice> : (
          <p className="flex items-start gap-2.5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {isValidSlaaId(id) ? t.notFound : t.verifyInvalid}
          </p>
        )}
        {back}
      </Container>
    );
  }

  return (
    <>
      <section className="border-b border-line bg-night text-white">
        <Container className="flex flex-col gap-4 py-12 sm:py-16">
          <Badge tone="gold"><BadgeCheck className="size-3.5" aria-hidden /> {t.verifiedMember}</Badge>
          <h1 className="text-4xl font-bold sm:text-5xl">{member.display_name}</h1>
          <p className="font-mono text-xl font-bold tracking-wider text-accent sm:text-2xl">{member.slaa_id}</p>
        </Container>
      </section>
      <Container className="grid gap-6 py-12 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-6 sm:p-8">
          <dl className="grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold tracking-wider text-muted uppercase">{t.roles}</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {member.is_athlete && <Badge>{t.roleAthlete}</Badge>}
                {member.is_coach && <Badge tone="gold">{t.roleCoach}</Badge>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-wider text-muted uppercase">{t.district}</dt>
              <dd className="mt-2 inline-flex items-center gap-1.5 font-medium"><MapPin className="size-4 text-brand" aria-hidden />{districtName(lang, member.district)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-wider text-muted uppercase">{t.gender}</dt>
              <dd className="mt-2 font-medium">{member.gender === "F" ? t.genderF : t.genderM} · {fill(t.born, { year: member.birth_year })}</dd>
            </div>
            {member.club_name && (
              <div>
                <dt className="text-xs font-semibold tracking-wider text-muted uppercase">{t.club}</dt>
                <dd className="mt-2 font-medium">{member.club_name}</dd>
              </div>
            )}
          </dl>
          {member.is_minor && <div className="mt-6"><Notice>{t.minorNote}</Notice></div>}
        </Card>
        <Card className="flex gap-4 p-6 sm:p-8">
          <ShieldCheck className="size-8 shrink-0 text-brand" aria-hidden />
          <p className="text-sm text-muted">{t.privacyNote}</p>
        </Card>
        <div>{back}</div>
      </Container>
    </>
  );
}
