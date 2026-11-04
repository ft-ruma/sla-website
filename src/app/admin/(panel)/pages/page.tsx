import { ArrowRight, FileText } from "lucide-react";
import Link from "next/link";
import { PAGES, type PageKey } from "@/content";
import type { InfoPage } from "@/content/pages";
import { listItems } from "@/lib/cms-admin";
import { requireEditor } from "@/lib/cms-auth";
import { PageHead } from "../../ui";
import { PAGE_PATHS } from "./paths";

export default async function Pages() {
  await requireEditor();
  const saved = await listItems<InfoPage & { key: PageKey }>("page");
  return (
    <>
      <PageHead title="Pages" intro="The information pages of the website. Downloads also lists the PDFs from the Downloads section." />
      <ul className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(PAGES) as PageKey[]).map((key) => {
          const doc = saved.find((s) => s.doc.key === key);
          return (
            <li key={key}>
              <Link href={`/admin/pages/${key}`} className="group card card-hover flex items-center gap-4 p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-600/10 text-slate-700"><FileText className="size-5" aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{(doc?.doc ?? PAGES[key]).title.en}</span>
                  <span className="block text-xs text-muted">
                    {PAGE_PATHS[key]} · {doc ? `edited ${new Date(doc.updated_at).toLocaleDateString("en-GB")}` : "built-in text"}
                  </span>
                </span>
                <ArrowRight className="size-4 text-muted group-hover:text-accent" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
