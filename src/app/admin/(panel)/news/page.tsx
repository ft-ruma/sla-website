import { Plus } from "lucide-react";
import Link from "next/link";
import type { NewsItem } from "@/content/types";
import { listItems } from "@/lib/cms-admin";
import { requireEditor } from "@/lib/cms-auth";
import { Flash, PageHead, StatusPill } from "../../ui";

export default async function NewsList({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireEditor();
  const { msg } = await searchParams;
  const items = await listItems<NewsItem>("news");
  return (
    <>
      <PageHead title="News" intro="Announcements, press releases and updates. Drafts are only visible here."
        action={<Link href="/admin/news/new" className="btn btn-primary"><Plus className="size-4" aria-hidden /> Write news</Link>} />
      <Flash msg={msg} />
      <div className="card overflow-hidden">
        {items.length ? (
          <ul className="divide-y divide-line">
            {items.map(({ key, doc, published, updated_at }) => (
              <li key={key}>
                <Link href={`/admin/news/${key}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-sand">
                  <span className="hidden w-24 shrink-0 text-xs font-semibold text-muted sm:block">{doc.date}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{doc.title.en}</span>
                    <span className="block text-xs text-muted capitalize">{doc.category} · edited {new Date(updated_at).toLocaleDateString("en-GB")}</span>
                  </span>
                  <StatusPill published={published} />
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="p-6 text-sm text-muted">No news yet.</p>}
      </div>
    </>
  );
}
