import { FileText } from "lucide-react";
import type { Download } from "@/content/types";
import { listItems } from "@/lib/cms-admin";
import { requireEditor } from "@/lib/cms-auth";
import { deleteDownload, saveDownload } from "../../actions";
import { ConfirmButton } from "../../Confirm";
import { Flash, INPUT, LABEL, LangFields, PageHead, SAVE, Section } from "../../ui";

export default async function Downloads({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  await requireEditor();
  const { msg, err } = await searchParams;
  const items = (await listItems<Download>("download")).sort((a, b) => b.doc.date.localeCompare(a.doc.date));
  return (
    <>
      <PageHead title="Downloads" intro="Circulars, forms, the constitution and reports. They are listed on the website's Downloads page, newest first." />
      <Flash msg={msg} err={err} />
      <form action={saveDownload}>
        <Section title="Add a PDF">
          <LangFields name="title" label="Title" required max={200} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={LABEL}>Date *<input type="date" name="date" required defaultValue={new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" })} className={INPUT} /></label>
            <label className={LABEL}>PDF file * (up to 15 MB)<input type="file" name="file" required accept="application/pdf" className="pt-2 text-sm" /></label>
          </div>
          <div><button className={SAVE}>Upload</button></div>
        </Section>
      </form>
      <div className="card overflow-hidden">
        {items.length ? (
          <ul className="divide-y divide-line">
            {items.map(({ key, doc }) => (
              <li key={key} className="flex items-center gap-4 px-5 py-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-clay/10 text-clay"><FileText className="size-5" aria-hidden /></span>
                <a href={`/api/cms/file/${doc.file}`} target="_blank" className="min-w-0 flex-1">
                  <span className="block truncate font-bold hover:underline">{doc.title.en}</span>
                  <span className="block text-xs text-muted">{doc.date} · {doc.name}</span>
                </a>
                <form action={deleteDownload}>
                  <input type="hidden" name="key" value={key} />
                  <ConfirmButton question="Delete this document from the website?" className="rounded-full px-3 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-50">Delete</ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        ) : <p className="p-6 text-sm text-muted">No documents yet.</p>}
      </div>
    </>
  );
}
