import { CalendarDays, FileText, MapPin, Tag } from "lucide-react";
import { notFound } from "next/navigation";
import { Badge, Card, Notice } from "@/components/bits";
import { CompetitionStatusBadge } from "@/components/CompetitionCard";
import { Container, PageHero, SectionHeading } from "@/components/PageHero";
import { ResultTable } from "@/components/ResultTable";
import { getCompetitions } from "@/lib/cms";
import { entriesOpen, statusOf } from "@/lib/competitions";
import type { Dict } from "@/lib/dict/en";
import { districtName } from "@/lib/districts";
import { getEvent } from "@/lib/events";
import { fill, formatDate, formatDateRange, getDict, isLang } from "@/lib/i18n";
import { pageMeta } from "@/lib/page";
import { portal } from "@/lib/portal";

type Params = { params: Promise<{ lang: string; id: string }> };

export const revalidate = 300;

async function load(params: Params["params"]) {
  const { lang, id } = await params;
  const c = (await getCompetitions()).find((x) => x.id === id);
  if (!isLang(lang) || !c) notFound();
  return { lang, t: getDict(lang), c };
}

export async function generateMetadata({ params }: Params) {
  const { lang, c } = await load(params);
  return pageMeta(lang, `/competitions/${c.id}`, c.name[lang], `${c.venue} · ${formatDateRange(lang, c.start, c.end)}`);
}

export default async function CompetitionPage({ params }: Params) {
  const { lang, t, c } = await load(params);
  const status = statusOf(c);
  const facts = [
    { icon: CalendarDays, label: t.dates, value: formatDateRange(lang, c.start, c.end) },
    { icon: MapPin, label: t.venue, value: `${c.venue}, ${districtName(lang, c.district)}` },
    { icon: Tag, label: t.category, value: t[`cat_${c.category}` as keyof Dict] },
  ];
  return (
    <>
      <PageHero kicker={t[`cat_${c.category}` as keyof Dict]} title={c.name[lang]}>
        <div className="flex flex-wrap gap-2"><CompetitionStatusBadge c={c} t={t} /></div>
      </PageHero>
      <Container className="grid gap-8 py-12 lg:grid-cols-[1fr_20rem]">
        <section id="results" className="order-2 lg:order-1">
          <SectionHeading title={t.resultsHeading} />
          {c.results?.length ? (
            <div className="flex flex-col gap-5">
              {c.results.map((r) => (
                <Card key={`${r.event}-${r.gender}`} className="p-5 sm:p-6">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xl font-bold">{getEvent(r.event).name[lang]} · {r.gender === "M" ? t.men : t.women}</h3>
                    <Badge tone={r.stage === "official" ? "green" : "gold"}>{t[`stage_${r.stage}`]}</Badge>
                  </div>
                  <ResultTable event={r.event} rows={r.rows} t={t} />
                </Card>
              ))}
            </div>
          ) : <Notice>{t.resultsSoon}</Notice>}
        </section>
        <aside className="order-1 flex flex-col gap-4 lg:order-2">
          <Card className="p-5">
            <dl className="flex flex-col gap-4">
              {facts.map((f) => (
                <div key={f.label} className="flex gap-3">
                  <f.icon className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
                  <div>
                    <dt className="text-xs font-semibold text-muted uppercase">{f.label}</dt>
                    <dd className="font-medium">{f.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </Card>
          {c.circular && (
            <a href={`/api/cms/file/${c.circular}`} target="_blank" rel="noreferrer" className="card card-hover flex items-center gap-3 p-4 font-bold">
              <FileText className="size-5 text-clay" aria-hidden /> {t.circularPdf}
            </a>
          )}
          {status === "upcoming" && c.entryDeadline && (
            <Card className="p-5">
              <p className={`font-semibold ${entriesOpen(c) ? "text-emerald-700" : "text-muted"}`}>
                {entriesOpen(c) ? fill(t.entriesOpen, { date: formatDate(lang, c.entryDeadline) }) : t.entriesClosed}
              </p>
              <p className="mt-1 text-sm text-muted">{t.enterThroughPortal}</p>
              {entriesOpen(c) && (
                <a href={portal.home(lang)} className="mt-4 inline-flex h-11 items-center bg-night px-5 text-sm font-bold text-white hover:bg-black">
                  {t.register}
                </a>
              )}
            </Card>
          )}
        </aside>
      </Container>
    </>
  );
}
