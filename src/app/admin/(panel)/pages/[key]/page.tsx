import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PAGES, type PageKey } from "@/content";
import type { InfoPage } from "@/content/pages";
import { listItems } from "@/lib/cms-admin";
import { requireEditor } from "@/lib/cms-auth";
import { savePage } from "../../../actions";
import { Flash, LangFields, PageHead, SAVE, Section, Toggle } from "../../../ui";
import { PAGE_PATHS } from "../paths";

export default async function EditPage({ params, searchParams }: {
  params: Promise<{ key: string }>; searchParams: Promise<{ msg?: string }>;
}) {
  await requireEditor();
  const { key } = await params;
  const { msg } = await searchParams;
  if (!(key in PAGES)) notFound();
  const pageKey = key as PageKey;
  const saved = (await listItems<InfoPage & { key: PageKey }>("page")).find((s) => s.doc.key === pageKey);
  const page = saved?.doc ?? PAGES[pageKey];
  const sections = [...page.sections, null, null];
  return (
    <>
      <Link href="/admin/pages" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All pages
      </Link>
      <PageHead title={page.title.en}
        action={<a href={`/en${PAGE_PATHS[pageKey]}`} target="_blank" className="btn btn-ghost"><ExternalLink className="size-4" aria-hidden /> View on website</a>} />
      <Flash msg={msg} />
      <form action={savePage} className="flex flex-col gap-5">
        <input type="hidden" name="key" value={pageKey} />
        <input type="hidden" name="sections" value={sections.length} />
        <Section>
          <LangFields name="title" label="Page title" value={page.title} required max={200} />
          <LangFields name="intro" label="Introduction" value={page.intro} rows={2} />
          <Toggle name="legalDraft" label="Show “draft, waiting for legal review”" checked={!!page.legalDraft} />
        </Section>
        {sections.map((s, i) => (
          <Section key={i} title={s ? `Section ${i + 1}` : "New section (optional)"}>
            <LangFields name={`s${i}_heading`} label="Heading" value={s?.heading} max={200} />
            <LangFields name={`s${i}_body`} label="Text" value={s?.body} rows={5} />
            {s && <p className="text-xs text-muted">Empty the English heading to remove this section.</p>}
          </Section>
        ))}
        <div><button className={SAVE}>Save page</button></div>
      </form>
    </>
  );
}
