import { Card } from "@/components/bits";
import { Container, PageHero, SectionHeading } from "@/components/PageHero";
import { getRecords } from "@/lib/cms";
import type { NationalRecord } from "@/content/types";
import { EVENTS, formatMark, formatWind, getEvent } from "@/lib/events";
import type { Dict } from "@/lib/dict/en";
import type { Lang } from "@/lib/i18n";
import { pageLang, pageMeta, type LangParams } from "@/lib/page";

export async function generateMetadata({ params }: LangParams) {
  const { lang, t } = await pageLang(params);
  return pageMeta(lang, "/records", t.recordsTitle, t.recordsIntro);
}

const order = (code: string) => EVENTS.findIndex((e) => e.code === code);

function RecordTable({ rows, lang, t }: { rows: NationalRecord[]; lang: Lang; t: Dict }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
            <th scope="col" className="py-2.5 pr-3 font-semibold">{t.event}</th>
            <th scope="col" className="py-2.5 pr-3 text-right font-semibold">{t.mark}</th>
            <th scope="col" className="py-2.5 pr-3 font-semibold">{t.holder}</th>
            <th scope="col" className="hidden py-2.5 pr-3 font-semibold md:table-cell">{t.venue}</th>
            <th scope="col" className="py-2.5 font-semibold">{t.year}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.event}-${r.gender}`} className="border-b border-line/70 last:border-0">
              <td className="py-3 pr-3 font-semibold">{getEvent(r.event).name[lang]}</td>
              <td className="py-3 pr-3 text-right font-mono font-bold whitespace-nowrap tabular">
                {formatMark(r.event, r.mark)}
                {r.wind !== undefined && <span className="ml-1.5 text-xs font-normal text-muted">({formatWind(r.wind)})</span>}
              </td>
              <td className="py-3 pr-3">{r.athlete}<span className="block text-xs text-muted">{r.club}</span></td>
              <td className="hidden py-3 pr-3 text-muted md:table-cell">{r.venue}</td>
              <td className="py-3 tabular">{r.year}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function RecordsPage({ params }: LangParams) {
  const { lang, t } = await pageLang(params);
  const records = await getRecords();
  const groups = (["senior", "junior"] as const).map((category) => ({
    title: category === "senior" ? t.recordSenior : t.recordJunior,
    genders: (["M", "F"] as const).map((g) => ({
      g,
      rows: records.filter((r) => r.category === category && r.gender === g).sort((a, b) => order(a.event) - order(b.event)),
    })).filter((x) => x.rows.length),
  })).filter((x) => x.genders.length);

  return (
    <>
      <PageHero kicker={t.navCompete} title={t.recordsTitle} intro={t.recordsIntro} />
      <Container className="flex flex-col gap-12 py-12">
        {groups.map((grp) => (
          <section key={grp.title}>
            <SectionHeading title={grp.title} />
            <div className="grid gap-5 xl:grid-cols-2">
              {grp.genders.map(({ g, rows }) => (
                <Card key={g} className="p-5 sm:p-6">
                  <h3 className="mb-4 text-xl font-bold">{g === "M" ? t.men : t.women}</h3>
                  <RecordTable rows={rows} lang={lang} t={t} />
                </Card>
              ))}
            </div>
          </section>
        ))}
      </Container>
    </>
  );
}
