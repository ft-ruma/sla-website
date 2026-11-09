import { Plus } from "lucide-react";
import Link from "next/link";
import type { RankingList } from "@/content/types";
import { listItems } from "@/lib/cms-admin";
import { requireEditor } from "@/lib/cms-auth";
import { EVENTS, formatMark, getEvent } from "@/lib/events";
import { rowsToText } from "@/lib/mark-input";
import { deleteRanking, saveRanking } from "../../actions";
import { ConfirmButton } from "../../Confirm";
import { DANGER, Flash, INPUT, LABEL, PageHead, PendingButton, SAVE, Section, TEXTAREA } from "../../ui";

export default async function Rankings({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string; edit?: string }> }) {
  await requireEditor();
  const { msg, err, edit } = await searchParams;
  const lists = (await listItems<RankingList>("ranking"))
    .sort((a, b) => b.doc.season - a.doc.season || EVENTS.findIndex((e) => e.code === a.doc.event) - EVENTS.findIndex((e) => e.code === b.doc.event));
  const current = edit && edit !== "new" ? lists.find((l) => l.key === edit)?.doc : undefined;
  return (
    <>
      <PageHead title="Rankings" intro="Season lists by event and gender. The best mark is sorted to the top automatically."
        action={<Link href="/admin/rankings?edit=new#editor" className="btn btn-primary"><Plus className="size-4" aria-hidden /> New list</Link>} />
      <Flash msg={msg} err={err} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map(({ key, doc }) => (
          <Link key={key} href={`/admin/rankings?edit=${key}#editor`}
            className={`card card-hover p-4 ${edit === key ? "ring-2 ring-accent" : ""}`}>
            <p className="text-xs font-bold tracking-wider text-muted uppercase">{doc.season} · {doc.gender === "M" ? "Men" : "Women"}</p>
            <p className="mt-1 text-lg font-extrabold">{getEvent(doc.event).name.en}</p>
            <p className="text-sm text-muted">
              {doc.rows.length} athletes{doc.rows[0] ? ` · best ${formatMark(doc.event, doc.rows[0].mark)} (${doc.rows[0].athlete})` : ""}
            </p>
          </Link>
        ))}
      </div>
      {edit && (
        <form id="editor" action={saveRanking} className="scroll-mt-6">
          <input type="hidden" name="key" value={current ? edit : ""} />
          <Section title={current ? `Edit: ${getEvent(current.event).name.en} · ${current.gender === "M" ? "Men" : "Women"} · ${current.season}` : "New ranking list"}>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className={LABEL}>
                Event *
                <select name="event" defaultValue={current?.event ?? "100m"} className={INPUT}>
                  {EVENTS.map((e) => <option key={e.code} value={e.code}>{e.name.en}</option>)}
                </select>
              </label>
              <label className={LABEL}>
                Gender *
                <select name="gender" defaultValue={current?.gender ?? "M"} className={INPUT}>
                  <option value="M">Men</option><option value="F">Women</option>
                </select>
              </label>
              <label className={LABEL}>Season *<input type="number" name="season" min={1950} max={2100} required defaultValue={current?.season ?? new Date().getFullYear()} className={INPUT} /></label>
            </div>
            <label className={LABEL}>
              Athletes, one per line: athlete, club, mark, wind, date (YYYY-MM-DD), competition
              <textarea name="rows" rows={10} spellCheck={false} defaultValue={current ? rowsToText(current.event, current.rows, "ranking") : ""}
                placeholder="K. D. Perera, Sri Lanka Army Sports Club, 10.21, +1.4, 2026-07-12, Air Force Open"
                className={`${TEXTAREA} font-mono`} />
            </label>
            <div><PendingButton className={SAVE}>Save list</PendingButton></div>
          </Section>
        </form>
      )}
      {current && (
        <form action={deleteRanking}>
          <input type="hidden" name="key" value={edit} />
          <ConfirmButton question="Delete this ranking list?" className={DANGER}>Delete this list</ConfirmButton>
        </form>
      )}
    </>
  );
}
