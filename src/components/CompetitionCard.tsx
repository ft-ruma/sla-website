import { MapPin } from "lucide-react";
import Link from "next/link";
import type { Competition, CompetitionCategory } from "@/content/types";
import { entriesOpen, statusOf } from "@/lib/competitions";
import type { Dict } from "@/lib/dict/en";
import { districtName } from "@/lib/districts";
import { fill, formatDate, formatDateRange, type Lang } from "@/lib/i18n";
import { Badge, LiveDot } from "./bits";

export const CATEGORY_COLOUR: Record<CompetitionCategory, string> = {
  national: "bg-brand",
  provincial: "bg-emerald-600",
  schools: "bg-accent",
  university: "bg-violet-600",
  forces: "bg-slate-600",
  club: "bg-sky-500",
  road: "bg-clay",
};

export function CompetitionStatusBadge({ c, t }: { c: Competition; t: Dict }) {
  const status = statusOf(c);
  if (status === "live") return <Badge tone="red"><LiveDot /> {t.statusLive}</Badge>;
  if (status === "completed") return <Badge tone="grey">{t.statusCompleted}</Badge>;
  return <Badge tone="outline">{t.statusUpcoming}</Badge>;
}

export function CompetitionCard({ c, lang, t }: { c: Competition; lang: Lang; t: Dict }) {
  const start = new Date(`${c.start}T00:00:00+05:30`);
  const day = new Intl.DateTimeFormat("en", { day: "numeric", timeZone: "Asia/Colombo" }).format(start);
  const month = formatDate(lang, c.start, { month: "short" });
  const status = statusOf(c);
  return (
    <Link href={`/${lang}/competitions/${c.id}`}
      className="group card card-hover mb-3 flex gap-4 p-4 sm:gap-5 sm:p-5">
      <div className={`flex w-16 shrink-0 flex-col items-center justify-center self-start rounded-2xl py-2.5 text-white ${CATEGORY_COLOUR[c.category]}`}>
        <p className="text-2xl font-extrabold leading-none tabular tracking-tight">{day}</p>
        <p className="mt-1 text-[0.72rem] font-bold tracking-[0.14em] uppercase opacity-90">{month}</p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <CompetitionStatusBadge c={c} t={t} />
          <span className="cat text-muted">{t[`cat_${c.category}` as keyof Dict]}</span>
        </div>
        <h3 className="text-lg font-bold tracking-tight text-pretty decoration-accent decoration-2 underline-offset-4 group-hover:underline">{c.name[lang]}</h3>
        <p className="mt-1 text-sm text-muted">{formatDateRange(lang, c.start, c.end)}</p>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted">
          <MapPin className="size-3.5 shrink-0" aria-hidden />{c.venue}, {districtName(lang, c.district)}
        </p>
        {status === "upcoming" && c.entryDeadline && (
          <p className={`mt-1 text-xs font-semibold ${entriesOpen(c) ? "text-emerald-700" : "text-muted"}`}>
            {entriesOpen(c) ? fill(t.entriesOpen, { date: formatDate(lang, c.entryDeadline, { day: "numeric", month: "long" }) }) : t.entriesClosed}
          </p>
        )}
      </div>
    </Link>
  );
}
