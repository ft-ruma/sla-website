import { Directory } from "@/components/Directory";
import { Container, PageHero } from "@/components/PageHero";
import { pageLang, pageMeta, type LangParams } from "@/lib/page";
import { portal } from "@/lib/portal";
import { registryConnected } from "@/lib/registry";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LangParams) {
  const { lang, t } = await pageLang(params);
  return pageMeta(lang, "/coaches", t.coachesTitle, t.coachesIntro);
}

export default async function CoachesPage({
  params,
  searchParams,
}: LangParams & { searchParams: Promise<Record<string, string | undefined>> }) {
  const { lang, t } = await pageLang(params);
  const search = await searchParams;
  return (
    <>
      <PageHero kicker={t.navCommunity} title={t.coachesTitle} intro={t.coachesIntro} />
      <Container className="flex flex-col gap-10 py-12">
        {registryConnected() && <Directory lang={lang} t={t} role="coach" path={`/${lang}/coaches`} search={search} />}
        <div className="max-w-2xl">
          {!registryConnected() && <p className="text-lg text-ink/85">{t.coachesSoon}</p>}
          <a href={portal.coach(lang)} className="mt-6 inline-block text-sm font-bold tracking-wide text-accent uppercase hover:underline">{t.registerCoach}</a>
        </div>
      </Container>
    </>
  );
}
