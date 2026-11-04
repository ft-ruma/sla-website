import { BadgeCheck, MapPin, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { ArrowLink, Badge, Card } from "@/components/bits";
import { Container, PageHero } from "@/components/PageHero";
import type { Dict } from "@/lib/dict/en";
import { districtName } from "@/lib/districts";
import { getDict, isLang } from "@/lib/i18n";
import { pageMeta } from "@/lib/page";
import { getClub } from "@/lib/registry";

type Params = { params: Promise<{ lang: string; id: string }> };

export const revalidate = 3600;

async function load(params: Params["params"]) {
  const { lang, id } = await params;
  if (!isLang(lang) || !/^CLB-[A-Z]{3}-\d{4}$/.test(id)) notFound();
  const club = await getClub(id);
  if (!club) notFound();
  return { lang, t: getDict(lang), club };
}

export async function generateMetadata({ params }: Params) {
  const { lang, club } = await load(params);
  return pageMeta(lang, `/clubs/${club.club_id}`, club.name);
}

export default async function ClubPage({ params }: Params) {
  const { lang, t, club } = await load(params);
  return (
    <>
      <PageHero title={club.name}>
        <div className="flex flex-wrap gap-2">
          <Badge tone="gold"><BadgeCheck className="size-3.5" aria-hidden /> {t[`clubType_${club.category}` as keyof Dict]}</Badge>
        </div>
      </PageHero>
      <Container className="flex flex-col gap-6 py-12">
        <Card className="grid gap-5 p-6 sm:p-8 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold text-muted uppercase">{t.clubId}</p>
            <p className="mt-1 font-mono text-lg font-bold tracking-wider">{club.club_id}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted uppercase">{t.district}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 font-medium"><MapPin className="size-4 text-brand" aria-hidden />{districtName(lang, club.district)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted uppercase">{t.registeredAthletes}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 font-medium tabular"><Users className="size-4 text-brand" aria-hidden />{club.athlete_count}</p>
          </div>
        </Card>
        <ArrowLink href={`/${lang}/clubs`}>{t.clubsTitle}</ArrowLink>
      </Container>
    </>
  );
}
