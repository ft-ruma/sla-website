import { CompetitionCard } from "@/components/CompetitionCard";
import { Container, PageHero, SectionHeading } from "@/components/PageHero";
import { getCompetitions } from "@/lib/cms";
import { calendar } from "@/lib/competitions";
import { pageLang, pageMeta, type LangParams } from "@/lib/page";

export const revalidate = 3600;

export async function generateMetadata({ params }: LangParams) {
  const { lang, t } = await pageLang(params);
  return pageMeta(lang, "/calendar", t.calendarTitle, t.calendarIntro);
}

export default async function CalendarPage({ params }: LangParams) {
  const { lang, t } = await pageLang(params);
  const { live, upcoming, past } = calendar(await getCompetitions());
  return (
    <>
      <PageHero kicker={t.navCompete} title={t.calendarTitle} intro={t.calendarIntro} />
      <Container className="flex flex-col gap-14 py-12">
        <section>
          <SectionHeading title={t.upcoming} />
          {live.length + upcoming.length ? (
            <div>
              {[...live, ...upcoming].map((c) => <CompetitionCard key={c.id} c={c} lang={lang} t={t} />)}
            </div>
          ) : <p className="text-muted">{t.noUpcoming}</p>}
        </section>
        {past.length > 0 && (
          <section>
            <SectionHeading title={t.past} />
            <div>
              {past.map((c) => <CompetitionCard key={c.id} c={c} lang={lang} t={t} />)}
            </div>
          </section>
        )}
      </Container>
    </>
  );
}
