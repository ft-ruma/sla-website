import { FileText } from "lucide-react";
import type { PageKey } from "@/content";
import { fileUrl, getDownloads, getPage } from "@/lib/cms";
import { formatDate, getDict, type Lang } from "@/lib/i18n";
import { pageMeta } from "@/lib/page";
import { Notice } from "./bits";
import { Container, PageHero } from "./PageHero";

export async function infoPageMeta(lang: Lang, key: PageKey, path: string) {
  const page = await getPage(key);
  return pageMeta(lang, path, page.title[lang], page.intro[lang]);
}

/** A plain content page: About, Development, Downloads, Privacy and so on. Edited in /admin/pages. */
export async function InfoPageView({ lang, page: key }: { lang: Lang; page: PageKey }) {
  const t = getDict(lang);
  const page = await getPage(key);
  const downloads = key === "downloads" ? await getDownloads() : [];
  return (
    <>
      <PageHero title={page.title[lang]} intro={page.intro[lang]} />
      <Container className="py-12">
        <div className="flex max-w-3xl flex-col gap-10">
          {page.legalDraft && <Notice>{t.legalDraft}</Notice>}
          {key === "downloads" && (
            downloads.length ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {downloads.map((d) => (
                  <li key={d.id}>
                    <a href={fileUrl(d.file)} target="_blank" rel="noreferrer" className="card card-hover flex items-center gap-4 p-4">
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-clay/10 text-clay">
                        <FileText className="size-6" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-bold">{d.title[lang] || d.title.en}</span>
                        <span className="block text-xs text-muted">PDF · {formatDate(lang, d.date)}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : <Notice>{t.downloadsEmpty}</Notice>
          )}
          {page.sections.map((s) => (
            <section key={s.heading.en}>
              <h2 className="mb-3 text-2xl font-bold text-ink sm:text-3xl">{s.heading[lang]}</h2>
              <p className="text-lg leading-relaxed whitespace-pre-line text-ink/85">{s.body[lang]}</p>
            </section>
          ))}
        </div>
      </Container>
    </>
  );
}
