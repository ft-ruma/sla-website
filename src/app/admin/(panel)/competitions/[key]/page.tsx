import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Competition } from "@/content/types";
import { getItem } from "@/lib/cms-admin";
import { requireEditor } from "@/lib/cms-auth";
import { DISTRICTS } from "@/lib/districts";
import { EVENTS } from "@/lib/events";
import { rowsToText } from "@/lib/mark-input";
import { deleteCompetition, saveCompetition } from "../../../actions";
import { ConfirmButton } from "../../../Confirm";
import { DANGER, Flash, INPUT, LABEL, LangFields, PageHead, SAVE, Section, TEXTAREA, Toggle } from "../../../ui";

const CATEGORIES = {
  national: "National", provincial: "Provincial", schools: "Schools", university: "University",
  forces: "Forces", club: "Club", road: "Road running",
};

export default async function EditCompetition({ params, searchParams }: {
  params: Promise<{ key: string }>; searchParams: Promise<{ msg?: string; err?: string }>;
}) {
  await requireEditor();
  const { key } = await params;
  const { msg, err } = await searchParams;
  const isNew = key === "new";
  const item = isNew ? null : await getItem<Competition>("competition", key);
  if (!isNew && !item) notFound();
  const c = item?.doc;
  // existing result lists, plus three empty ones for adding more
  const blocks = [...(c?.results ?? []), ...Array.from({ length: 3 }, () => null)];

  return (
    <>
      <Link href="/admin/competitions" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All competitions
      </Link>
      <PageHead title={isNew ? "Add competition" : c!.name.en}
        action={!isNew && item?.published && (
          <a href={`/en/competitions/${key}`} target="_blank" className="btn btn-ghost"><ExternalLink className="size-4" aria-hidden /> View on website</a>
        )} />
      <Flash msg={msg} err={err} />
      <form action={saveCompetition} className="flex flex-col gap-5">
        <input type="hidden" name="key" value={isNew ? "" : key} />
        <input type="hidden" name="currentCircular" value={c?.circular ?? ""} />
        <input type="hidden" name="blocks" value={blocks.length} />
        <Section title="Details">
          <LangFields name="name" label="Name" value={c?.name} required max={200} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className={LABEL}>
              Category *
              <select name="category" defaultValue={c?.category ?? "national"} className={INPUT}>
                {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className={LABEL}>Venue *<input name="venue" required defaultValue={c?.venue} maxLength={150} className={INPUT} /></label>
            <label className={LABEL}>
              District *
              <select name="district" defaultValue={c?.district ?? "Colombo"} className={INPUT}>
                {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
            <label className={LABEL}>First day *<input type="date" name="start" required defaultValue={c?.start} className={INPUT} /></label>
            <label className={LABEL}>Last day<input type="date" name="end" defaultValue={c?.end} className={INPUT} /></label>
            <label className={LABEL}>Entry deadline<input type="date" name="entryDeadline" defaultValue={c?.entryDeadline} className={INPUT} /></label>
          </div>
          <Toggle name="published" label="Published" checked={item ? item.published : true} hint="Off hides it from the calendar." />
        </Section>

        <Section title="Circular (PDF)">
          {c?.circular ? (
            <div className="flex flex-wrap items-center gap-4">
              <a href={`/api/cms/file/${c.circular}`} target="_blank" className="inline-flex items-center gap-2 text-sm font-bold underline">
                <FileText className="size-4 text-clay" aria-hidden /> Current circular
              </a>
              <Toggle name="removeCircular" label="Remove it" />
            </div>
          ) : <p className="text-sm text-muted">No circular yet.</p>}
          <label className={LABEL}>
            {c?.circular ? "Replace with" : "Upload"} a PDF (up to 15 MB)
            <input type="file" name="circular" accept="application/pdf" className="text-sm" />
          </label>
        </Section>

        <Section title="Results">
          <p className="-mt-2 text-sm text-muted">
            One athlete per line, in finishing order: <code className="rounded bg-sand px-1.5 py-0.5 text-xs">athlete, club, mark, wind</code>.
            Marks as you would write them: 10.21, 1:52.30, 7.68, 5400. Wind is optional. You can paste straight from a spreadsheet.
            Empty a box to remove that list.
          </p>
          {blocks.map((b, i) => (
            <fieldset key={i} className="grid gap-3 rounded-2xl bg-sand p-4 sm:grid-cols-[1fr_1fr_1fr]">
              <legend className="sr-only">Result list {i + 1}</legend>
              <label className={LABEL}>
                Event
                <select name={`r_event_${i}`} defaultValue={b?.event ?? ""} className={INPUT}>
                  <option value="">— choose to add —</option>
                  {EVENTS.map((e) => <option key={e.code} value={e.code}>{e.name.en}</option>)}
                </select>
              </label>
              <label className={LABEL}>
                Gender
                <select name={`r_gender_${i}`} defaultValue={b?.gender ?? "M"} className={INPUT}>
                  <option value="M">Men</option><option value="F">Women</option>
                </select>
              </label>
              <label className={LABEL}>
                Stage
                <select name={`r_stage_${i}`} defaultValue={b?.stage ?? "official"} className={INPUT}>
                  <option value="official">Official</option><option value="provisional">Provisional</option>
                </select>
              </label>
              <label className={`${LABEL} sm:col-span-3`}>
                Results
                <textarea name={`r_rows_${i}`} rows={b ? Math.min(12, b.rows.length + 1) : 3} spellCheck={false}
                  defaultValue={b ? rowsToText(b.event, b.rows, "result") : ""}
                  placeholder="K. D. Perera, Sri Lanka Army Sports Club, 10.21, +1.4" className={`${TEXTAREA} font-mono`} />
              </label>
            </fieldset>
          ))}
        </Section>

        <div><button className={SAVE}>{isNew ? "Save competition" : "Save changes"}</button></div>
      </form>
      {!isNew && (
        <form action={deleteCompetition} className="border-t border-black/10 pt-5">
          <input type="hidden" name="key" value={key} />
          <ConfirmButton question="Delete this competition and all its results? This cannot be undone." className={DANGER}>Delete this competition and its results</ConfirmButton>
        </form>
      )}
    </>
  );
}
