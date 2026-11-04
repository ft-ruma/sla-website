import type { NationalRecord } from "@/content/types";
import { listItems } from "@/lib/cms-admin";
import { requireEditor } from "@/lib/cms-auth";
import { EVENTS, formatMark, formatWind, getEvent } from "@/lib/events";
import { deleteRecord, saveRecord } from "../../actions";
import { ConfirmButton } from "../../Confirm";
import { Flash, INPUT, LABEL, PageHead, Section } from "../../ui";

function RecordForm({ r, k }: { r?: NationalRecord; k?: string }) {
  return (
    <form action={saveRecord} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <input type="hidden" name="key" value={k ?? ""} />
      <label className={LABEL}>
        Category
        <select name="category" defaultValue={r?.category ?? "senior"} className={INPUT}>
          <option value="senior">Senior</option><option value="junior">Junior</option>
        </select>
      </label>
      <label className={LABEL}>
        Event
        <select name="event" defaultValue={r?.event ?? "100m"} className={INPUT}>
          {EVENTS.map((e) => <option key={e.code} value={e.code}>{e.name.en}</option>)}
        </select>
      </label>
      <label className={LABEL}>
        Gender
        <select name="gender" defaultValue={r?.gender ?? "M"} className={INPUT}>
          <option value="M">Men</option><option value="F">Women</option>
        </select>
      </label>
      <label className={LABEL}>Mark *<input name="mark" required defaultValue={r ? formatMark(r.event, r.mark) : ""} placeholder="10.12" className={`${INPUT} font-mono`} /></label>
      <label className={LABEL}>Wind<input name="wind" defaultValue={r?.wind !== undefined ? formatWind(r.wind) : ""} placeholder="+1.6" className={`${INPUT} font-mono`} /></label>
      <label className={`${LABEL} lg:col-span-2`}>Athlete *<input name="athlete" required defaultValue={r?.athlete} className={INPUT} /></label>
      <label className={`${LABEL} lg:col-span-1`}>Club<input name="club" defaultValue={r?.club} className={INPUT} /></label>
      <label className={LABEL}>Year *<input name="year" type="number" required min={1900} max={2100} defaultValue={r?.year ?? new Date().getFullYear()} className={INPUT} /></label>
      <label className={LABEL}>Venue<input name="venue" defaultValue={r?.venue} className={INPUT} /></label>
      <div className="flex items-end gap-2 lg:col-span-5">
        <button className="btn btn-primary h-10">{k ? "Save" : "Add record"}</button>
      </div>
    </form>
  );
}

export default async function Records({ searchParams }: { searchParams: Promise<{ msg?: string; edit?: string }> }) {
  await requireEditor();
  const { msg, edit } = await searchParams;
  const records = (await listItems<NationalRecord>("record"))
    .sort((a, b) => a.doc.category.localeCompare(b.doc.category) || a.doc.gender.localeCompare(b.doc.gender)
      || EVENTS.findIndex((e) => e.code === a.doc.event) - EVENTS.findIndex((e) => e.code === b.doc.event));
  return (
    <>
      <PageHead title="National records" intro="Ratified senior and junior records. Edit a row to correct it, or add a new record." />
      <Flash msg={msg} />
      <Section title="Add a record"><RecordForm /></Section>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs tracking-wider text-muted uppercase">
            <tr className="border-b border-line"><th className="p-3">Record</th><th className="p-3">Mark</th><th className="p-3">Athlete</th><th className="p-3">Year</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {records.map(({ key, doc }) => (
              edit === key ? (
                <tr key={key}><td colSpan={5} className="bg-sand p-4"><RecordForm r={doc} k={key} /></td></tr>
              ) : (
                <tr key={key}>
                  <td className="p-3"><span className="font-semibold">{getEvent(doc.event).name.en}</span>
                    <span className="block text-xs text-muted capitalize">{doc.category} · {doc.gender === "M" ? "Men" : "Women"}</span></td>
                  <td className="p-3 font-mono font-bold">{formatMark(doc.event, doc.mark)}</td>
                  <td className="p-3">{doc.athlete}<span className="block text-xs text-muted">{doc.club}</span></td>
                  <td className="p-3">{doc.year}</td>
                  <td className="p-3">
                    <span className="flex justify-end gap-2">
                      <a href={`/admin/records?edit=${key}`} className="rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-black/15 hover:ring-ink">Edit</a>
                      <form action={deleteRecord}>
                        <input type="hidden" name="key" value={key} />
                        <ConfirmButton question="Delete this record?" className="rounded-full px-3 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-50">Delete</ConfirmButton>
                      </form>
                    </span>
                  </td>
                </tr>
              )
            ))}
            {!records.length && <tr><td colSpan={5} className="p-6 text-muted">No records yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
