import Image from "next/image";
import Link from "next/link";
import type { Dict } from "@/lib/dict/en";
import type { Lang } from "@/lib/langs";
import { portal } from "@/lib/portal";
import { LanguageLinks } from "./HeaderParts";
import { fullNav } from "./nav";

export function SiteFooter({ lang, t }: { lang: Lang; t: Dict }) {
  const linkClass = "text-sm text-white/60 transition hover:text-white";
  return (
    <footer className="no-print border-t-[3px] border-accent bg-night text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:gap-10 sm:px-6 sm:py-14 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-1">
          <Link href={`/${lang}`} className="flex items-center gap-3">
            <Image src="/brand/sla-logo.png" alt="" width={44} height={44} className="size-11" />
            <span className="text-lg font-extrabold">{t.siteName}</span>
          </Link>
          <p className="max-w-xs text-sm text-white/55">{t.footerAbout}</p>
        </div>
        {fullNav(lang, t).map((g) => (
          <div key={g.title}>
            <p className="label mb-4 text-white">{g.title}</p>
            <ul className="flex flex-col gap-2.5">
              {g.items.map((i) => <li key={i.href}><Link href={i.href} className={linkClass}>{i.label}</Link></li>)}
            </ul>
          </div>
        ))}
        <div>
          <p className="label mb-4 text-white">{t.footerJoin}</p>
          <ul className="flex flex-col gap-2.5">
            <li><a href={portal.athlete(lang)} className={linkClass}>{t.registerAthlete}</a></li>
            <li><a href={portal.coach(lang)} className={linkClass}>{t.registerCoach}</a></li>
            <li><Link href={`/${lang}/athletes`} className={linkClass}>{t.verifyId}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 text-xs text-white/45 sm:px-6 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} {t.siteName}. {t.rights}</span>
          <div className="flex flex-wrap items-center gap-5">
            <LanguageLinks lang={lang} label={t.language} tone="dark" />
            <Link href={`/${lang}/privacy`} className="hover:text-white">{t.navPrivacy}</Link>
            <Link href={`/${lang}/terms`} className="hover:text-white">{t.navTerms}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
