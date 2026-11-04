import Link from "next/link";
import { Badge, Notice } from "@/components/bits";
import { Container, PageHero } from "@/components/PageHero";
import { getCompetitions } from "@/lib/cms";
import { districtName } from "@/lib/districts";
import { fill, formatDateRange } from "@/lib/i18n";
import { pageLang, pageMeta, type LangParams } from "@/lib/page";

export async function generateMetadata({ params }: LangParams) {
  const { lang, t } = await pageLang(params);
  return pageMeta(lang, "/results", t.resultsTitle, t.resultsIntro);
}

export default async function ResultsPage({ params }: LangParams) {
  const { lang, t } = await pageLang(params);
  const withResults = (await getCompetitions()).filter((c) => c.results?.length).sort((a, b) => b.start.localeCompare(a.start));
  return (
    <>
      <PageHero kicker={t.navCompete} title={t.resultsTitle} intro={t.resultsIntro} />
      <Container className="py-12">
        {withResults.length ? (
          <ul>
            {withResults.map((c) => {
              const provisional = c.results!.some((r) => r.stage === "provisional");
              return (
                <li key={c.id}>
                  <Link href={`/${lang}/competitions/${c.id}#results`}
                    className="group flex flex-col gap-3 border-b border-line py-5 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      <span className="block text-xl font-bold transition group-hover:text-accent">{c.name[lang]}</span>
                      <span className="mt-1 block text-sm text-muted">{formatDateRange(lang, c.start, c.end)} · {c.venue}, {districtName(lang, c.district)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Badge tone="blue">{fill(t.events, { n: c.results!.length })}</Badge>
                      <Badge tone={provisional ? "gold" : "green"}>{provisional ? t.stage_provisional : t.stage_official}</Badge>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : <Notice>{t.noResultsYet}</Notice>}
      </Container>
    </>
  );
}
