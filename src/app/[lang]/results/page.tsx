import { ArrowRight, MapPin, Trophy } from "lucide-react";
import Link from "next/link";
import { Badge, Notice } from "@/components/bits";
import { CATEGORY_COLOUR } from "@/components/CompetitionCard";
import { Container, PageHero } from "@/components/PageHero";
import { getCompetitions } from "@/lib/cms";
import { districtName } from "@/lib/districts";
import { fill, formatDate, formatDateRange } from "@/lib/i18n";
import type { Dict } from "@/lib/dict/en";
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
          <ul className="grid gap-4 lg:grid-cols-2">
            {withResults.map((c) => {
              const provisional = c.results!.some((r) => r.stage === "provisional");
              const day = new Intl.DateTimeFormat("en", { day: "numeric", timeZone: "Asia/Colombo" }).format(new Date(`${c.start}T00:00:00+05:30`));
              return (
                <li key={c.id}>
                  <Link href={`/${lang}/competitions/${c.id}#results`}
                    className="group card card-hover flex h-full flex-col gap-5 p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className={`flex w-16 shrink-0 flex-col items-center justify-center rounded-2xl py-2.5 text-white ${CATEGORY_COLOUR[c.category]}`}>
                        <span className="text-2xl leading-none font-extrabold tracking-tight tabular">{day}</span>
                        <span className="mt-1 text-xs font-bold tracking-[0.14em] uppercase opacity-90">{formatDate(lang, c.start, { month: "short" })}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="cat text-muted">{t[`cat_${c.category}` as keyof Dict]}</p>
                        <h2 className="mt-1 text-xl leading-snug font-bold tracking-tight text-pretty decoration-accent decoration-2 underline-offset-4 group-hover:underline">{c.name[lang]}</h2>
                        <p className="mt-1.5 text-sm text-muted">{formatDateRange(lang, c.start, c.end)}</p>
                        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted">
                          <MapPin className="size-3.5 shrink-0" aria-hidden />{c.venue}, {districtName(lang, c.district)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-4">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                        <Trophy className="size-4 text-accent" aria-hidden /> {fill(t.events, { n: c.results!.length })}
                      </span>
                      <Badge tone={provisional ? "gold" : "green"}>{provisional ? t.stage_provisional : t.stage_official}</Badge>
                      <span aria-hidden className="ml-auto grid size-10 place-items-center rounded-full bg-sand transition group-hover:bg-accent group-hover:text-white">
                        <ArrowRight className="size-5 transition group-hover:translate-x-0.5" />
                      </span>
                    </div>
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
