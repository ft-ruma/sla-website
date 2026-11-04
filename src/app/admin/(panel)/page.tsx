import { ArrowRight, CalendarDays, Download, FileText, Newspaper, Plus, ShieldCheck, Trophy } from "lucide-react";
import Link from "next/link";
import { listItems, recentChanges } from "@/lib/cms-admin";
import { requireEditor } from "@/lib/cms-auth";
import { PageHead, Section } from "../ui";

export default async function Dashboard() {
  const { editor } = await requireEditor();
  const [news, comps, rankings, records, downloads, changes] = await Promise.all([
    listItems("news"), listItems("competition"), listItems("ranking"), listItems("record"), listItems("download"),
    recentChanges(15),
  ]);
  const drafts = [...news, ...comps].filter((i) => !i.published).length;
  const tiles = [
    { label: "News", n: news.length, sub: `${news.filter((i) => !i.published).length} drafts`, href: "/admin/news", icon: Newspaper, tone: "bg-accent/10 text-accent" },
    { label: "Competitions", n: comps.length, sub: "calendar and results", href: "/admin/competitions", icon: CalendarDays, tone: "bg-brand/10 text-brand" },
    { label: "Ranking lists", n: rankings.length, sub: "by event and season", href: "/admin/rankings", icon: Trophy, tone: "bg-emerald-600/10 text-emerald-700" },
    { label: "Records", n: records.length, sub: "senior and junior", href: "/admin/records", icon: ShieldCheck, tone: "bg-amber-400/20 text-amber-700" },
    { label: "Downloads", n: downloads.length, sub: "PDF documents", href: "/admin/downloads", icon: Download, tone: "bg-violet-600/10 text-violet-700" },
    { label: "Pages", n: 6, sub: "About, Privacy and more", href: "/admin/pages", icon: FileText, tone: "bg-slate-600/10 text-slate-700" },
  ];
  return (
    <>
      <PageHead title={`Hello, ${editor.display_name.split(" ")[0]}`}
        intro={drafts ? `${drafts} draft${drafts === 1 ? "" : "s"} not yet on the website.` : "Everything you have written is live on the website."}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/news/new" className="btn btn-primary"><Plus className="size-4" aria-hidden /> Write news</Link>
            <Link href="/admin/competitions/new" className="btn btn-dark"><Plus className="size-4" aria-hidden /> Add competition</Link>
          </div>
        } />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href={t.href} className="group card card-hover flex items-center gap-4 p-5">
              <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${t.tone}`}><t.icon className="size-6" aria-hidden /></span>
              <span className="flex-1">
                <span className="block text-3xl font-extrabold tabular-nums">{t.n}</span>
                <span className="block text-sm font-semibold">{t.label}</span>
                <span className="block text-xs text-muted">{t.sub}</span>
              </span>
              <ArrowRight className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <Section title="Recent changes">
        {changes.length ? (
          <ul className="divide-y divide-line text-sm">
            {changes.map((c, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                <span><strong>{c.actor}</strong> · {c.action.replace(/_/g, " ")}{c.target ? ` · ${c.target}` : ""}</span>
                <time className="text-xs text-muted">{c.at.toLocaleString("en-GB", { timeZone: "Asia/Colombo" })}</time>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">No changes yet.</p>}
      </Section>
    </>
  );
}
