import { Building2, GraduationCap, MapPin, School, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/bits";
import { Container, PageHero } from "@/components/PageHero";
import type { Dict } from "@/lib/dict/en";
import { DISTRICTS, districtName } from "@/lib/districts";
import { fill, getDict, isLang } from "@/lib/i18n";
import { pageMeta } from "@/lib/page";
import { CLUB_TYPES, listClubs, type ClubType } from "@/lib/registry";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ district?: string; type?: string; q?: string }>;
};

const TYPE_ICON: Record<ClubType, React.ElementType> = {
  UNIVERSITY: GraduationCap, SCHOOL: School, CIVIL_CLUB: Users, INSTITUTIONAL: Building2,
};

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = getDict(lang);
  return pageMeta(lang, "/clubs", t.clubsTitle, t.clubsIntro);
}

export default async function ClubsPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = getDict(lang);
  const q = await searchParams;
  const district = (DISTRICTS as readonly string[]).includes(q.district ?? "") ? q.district : undefined;
  const type = (CLUB_TYPES as readonly string[]).includes(q.type ?? "") ? q.type : undefined;
  const search = q.q?.trim().slice(0, 80) || undefined;
  const clubs = await listClubs({ district, type, q: search });
  const field = "h-11 w-full border border-line bg-white px-3 text-sm outline-none focus:border-ink";

  return (
    <>
      <PageHero kicker={t.navCommunity} title={t.clubsTitle} intro={t.clubsIntro} />
      <Container className="flex flex-col gap-8 py-12">
        <form className="grid gap-3 border border-line p-4 sm:grid-cols-[1fr_1fr_1fr_auto]" role="search">
          <label className="flex flex-col gap-1 text-xs font-semibold tracking-wider text-muted uppercase">
            {t.searchClubs}
            <input name="q" defaultValue={search} className={field} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold tracking-wider text-muted uppercase">
            {t.district}
            <select name="district" defaultValue={district ?? ""} className={field}>
              <option value="">{t.allDistricts}</option>
              {DISTRICTS.map((d) => <option key={d} value={d}>{districtName(lang, d)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold tracking-wider text-muted uppercase">
            {t.category}
            <select name="type" defaultValue={type ?? ""} className={field}>
              <option value="">{t.allTypes}</option>
              {CLUB_TYPES.map((c) => <option key={c} value={c}>{t[`clubType_${c}` as keyof Dict]}</option>)}
            </select>
          </label>
          <button className="h-11 self-end bg-night px-6 text-sm font-bold text-white hover:bg-black">{t.show}</button>
        </form>

        {clubs === null ? <Notice>{t.clubsNotConnected}</Notice> : (
          <>
            <p className="text-sm font-semibold text-muted">{fill(t.clubCount, { n: clubs.length })}</p>
            {clubs.length ? (
              <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {clubs.map((c) => {
                  const Icon = TYPE_ICON[c.category];
                  return (
                    <li key={c.club_id}>
                      <Link href={`/${lang}/clubs/${c.club_id}`}
                        className="group flex h-full gap-4 border-b border-line py-4">
                        <span className="grid size-10 shrink-0 place-items-center bg-black/5 text-ink"><Icon className="size-5" aria-hidden /></span>
                        <span className="min-w-0">
                          <span className="block font-bold text-pretty group-hover:text-accent">{c.name}</span>
                          <span className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                            <MapPin className="size-3.5" aria-hidden />{districtName(lang, c.district)} · {t[`clubType_${c.category}` as keyof Dict]}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : <Notice>{t.noClubs}</Notice>}
          </>
        )}

      </Container>
    </>
  );
}
