import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { NewsItem } from "@/content/types";
import { getItem } from "@/lib/cms-admin";
import { requireEditor } from "@/lib/cms-auth";
import { deleteNews, saveNews } from "../../../actions";
import { ConfirmButton } from "../../../Confirm";
import { DANGER, Flash, INPUT, LABEL, LangFields, PageHead, SAVE, Section, Toggle } from "../../../ui";

const CATEGORIES = { news: "News", press: "Press release", development: "Development", integrity: "Clean sport" };
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });

export default async function EditNews({ params, searchParams }: {
  params: Promise<{ key: string }>; searchParams: Promise<{ msg?: string; err?: string }>;
}) {
  await requireEditor();
  const { key } = await params;
  const { msg, err } = await searchParams;
  const isNew = key === "new";
  const item = isNew ? null : await getItem<NewsItem>("news", key);
  if (!isNew && !item) notFound();
  const n = item?.doc;
  const para = (l: "en" | "si" | "ta") => (n?.body[l] ?? []).join("\n\n");

  return (
    <>
      <Link href="/admin/news" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All news
      </Link>
      <PageHead title={isNew ? "Write news" : n!.title.en}
        action={!isNew && item?.published && (
          <a href={`/en/news/${key}`} target="_blank" className="btn btn-ghost"><ExternalLink className="size-4" aria-hidden /> View on website</a>
        )} />
      <Flash msg={msg} err={err} />
      <form action={saveNews} className="flex flex-col gap-5">
        <input type="hidden" name="key" value={isNew ? "" : key} />
        <input type="hidden" name="currentImage" value={n?.image ?? ""} />
        <Section>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className={LABEL}>Date *<input type="date" name="date" required defaultValue={n?.date ?? today()} className={INPUT} /></label>
            <label className={LABEL}>
              Category *
              <select name="category" defaultValue={n?.category ?? "news"} className={INPUT}>
                {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            {isNew && (
              <label className={LABEL}>
                Web address (optional)
                <input name="slug" placeholder="made from the title" pattern="[a-z0-9-]*" className={INPUT} />
              </label>
            )}
          </div>
          <Toggle name="published" label="Published" checked={item ? item.published : true}
            hint="Off keeps it as a draft that only editors can see." />
        </Section>
        <Section title="Text">
          <LangFields name="title" label="Title" value={n?.title} required max={200} />
          <LangFields name="summary" label="Summary (one or two sentences, shown on cards)" value={n?.summary} rows={2} />
          <LangFields name="body" label="Article (leave an empty line between paragraphs)" rows={9}
            value={{ en: para("en"), si: para("si"), ta: para("ta") }} />
        </Section>
        <Section title="Cover photo">
          {n?.image ? (
            <div className="flex flex-wrap items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- preview of an uploaded file */}
              <img src={`/api/cms/file/${n.image}`} alt="" className="h-28 w-48 rounded-xl object-cover ring-1 ring-black/10" />
              <Toggle name="removeImage" label="Remove the photo" hint="The category illustration is shown instead." />
            </div>
          ) : <p className="text-sm text-muted">No photo: the website shows the category illustration.</p>}
          <label className={LABEL}>
            {n?.image ? "Replace with" : "Upload"} (JPG, PNG or WebP, up to 5 MB; landscape works best)
            <input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="text-sm" />
          </label>
        </Section>
        <div className="flex flex-wrap items-center gap-3">
          <button className={SAVE}>{isNew ? "Save" : "Save changes"}</button>
        </div>
      </form>
      {!isNew && (
        <form action={deleteNews} className="border-t border-black/10 pt-5">
          <input type="hidden" name="key" value={key} />
          <ConfirmButton question="Delete this news item? This cannot be undone." className={DANGER}>Delete this news item</ConfirmButton>
        </form>
      )}
    </>
  );
}
