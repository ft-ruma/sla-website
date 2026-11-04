import { Plus } from "lucide-react";
import Link from "next/link";
import type { Competition } from "@/content/types";
import { listItems } from "@/lib/cms-admin";
import { requireEditor } from "@/lib/cms-auth";
import { statusOf } from "@/lib/competitions";
import { Flash, PageHead, StatusPill } from "../../ui";

export default async function CompetitionList({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireEditor();
  const { msg } = await searchParams;
  const items = (await listItems<Competition>("competition")).sort((a, b) => b.doc.start.localeCompare(a.doc.start));
  const label = { live: "Live", upcoming: "Upcoming", completed: "Completed" };
  return (
    <>
      <PageHead title="Competitions & results" intro="The calendar, entry deadlines, circulars and the results of each meet."
        action={<Link href="/admin/competitions/new" className="btn btn-primary"><Plus className="size-4" aria-hidden /> Add competition</Link>} />
      <Flash msg={msg} />
      <div className="card overflow-hidden">
        {items.length ? (
          <ul className="divide-y divide-line">
            {items.map(({ key, doc, published }) => (
              <li key={key}>
                <Link href={`/admin/competitions/${key}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-sand">
                  <span className="hidden w-24 shrink-0 text-xs font-semibold text-muted sm:block">{doc.start}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{doc.name.en}</span>
                    <span className="block text-xs text-muted">
                      {doc.venue} · {label[statusOf(doc)]} · {doc.results?.length ? `${doc.results.length} result lists` : "no results yet"}
                    </span>
                  </span>
                  <StatusPill published={published} />
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="p-6 text-sm text-muted">No competitions yet.</p>}
      </div>
    </>
  );
}
