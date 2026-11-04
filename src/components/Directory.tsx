import Link from "next/link";
import { BadgeCheck, Search } from "lucide-react";
import { Badge, Card, Notice } from "@/components/bits";
import { eventLabel } from "@/components/Dashboard";
import type { Dict } from "@/lib/dict/en";
import { DISTRICTS, districtName } from "@/lib/districts";
import { fill, type Lang } from "@/lib/i18n";
import { directorySearch } from "@/lib/member-dashboard";

// Searchable list of verified athletes and coaches. The database applies each
// member's privacy switches and the under-18 rules before anything reaches
// this page.

const INPUT = "h-11 border border-line bg-white px-3 text-sm outline-none focus:border-ink";

export async function Directory({ lang, t, role, path, search }: {
  lang: Lang; t: Dict; role: "athlete" | "coach"; path: string; search: Record<string, string | undefined>;
}) {
  const q = (search.q ?? "").trim().slice(0, 80);
  const district = (DISTRICTS as readonly string[]).includes(search.district ?? "") ? search.district! : "";
  const page = Math.min(500, Math.max(1, parseInt(search.page ?? "1", 10) || 1));
  const { rows, total } = await directorySearch(q, role, district, page).catch(() => ({ rows: [], total: 0 }));
  const href = (p: number) =>
    `${path}?${new URLSearchParams(Object.entries({ q, district, page: String(p) }).filter(([, v]) => v))}`;

  return (
    <div className="flex flex-col gap-6">
      <form method="get" role="search" className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} maxLength={80} placeholder={t.dirSearch} aria-label={t.dirSearch}
          className={`${INPUT} min-w-0 flex-1 basis-56`} />
        <select name="district" defaultValue={district} aria-label={t.district} className={INPUT}>
          <option value="">{t.dirAnyDistrict}</option>
          {DISTRICTS.map((d) => <option key={d} value={d}>{districtName(lang, d)}</option>)}
        </select>
        <button className="inline-flex h-11 items-center gap-2 bg-night px-4 text-sm font-bold text-white hover:bg-black">
          <Search className="size-4" aria-hidden /> {t.dashSearch}
        </button>
      </form>

      <p className="text-sm text-muted">{fill(t.dirCount, { count: String(total) })}</p>
      {rows.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((m) => (
            <li key={m.slaa_id}>
              <Card className="flex h-full flex-col gap-2 p-5">
                <Link href={`/${lang}/athlete/${m.slaa_id}`} className="font-bold hover:text-accent">{m.display_name}</Link>
                <p className="font-mono text-xs font-bold tracking-wider text-brand">{m.slaa_id}</p>
                <p className="text-sm text-muted">
                  {[districtName(lang, m.district), m.birth_year && fill(t.dirBorn, { year: String(m.birth_year) }), m.club_name]
                    .filter(Boolean).join(" · ")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {m.is_athlete && <Badge tone="blue">{t.roleAthlete}</Badge>}
                  {m.is_coach && <Badge tone="grey">{t.roleCoach}</Badge>}
                </div>
                {m.events.length > 0 && (
                  <ul className="mt-1 flex flex-col gap-1 text-sm">
                    {m.events.map((e) => (
                      <li key={e.code} className="flex items-center gap-2">
                        <span className="min-w-24">{eventLabel(lang, e.code)}</span>
                        {e.pb && <span className="font-mono font-bold">{e.pb}</span>}
                        {e.pb && e.verified && <BadgeCheck className="size-4 text-brand" aria-label={t.dashPbVerified} />}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </li>
          ))}
        </ul>
      ) : <Notice>{t.dirNone}</Notice>}

      {total > 24 && (
        <nav className="flex justify-between text-sm font-bold">
          {page > 1 ? <Link href={href(page - 1)} className="hover:text-accent">← {t.dirPrev}</Link> : <span />}
          {page * 24 < total && <Link href={href(page + 1)} className="hover:text-accent">{t.dirNext} →</Link>}
        </nav>
      )}
    </div>
  );
}
