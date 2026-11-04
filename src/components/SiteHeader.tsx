import { LogIn } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Dict } from "@/lib/dict/en";
import type { Lang } from "@/lib/langs";
import { portal } from "@/lib/portal";
import { LanguageLinks, MainNav, MenuPanel } from "./HeaderParts";
import { fullNav, mainNav } from "./nav";

export function SiteHeader({ lang, t, notice }: { lang: Lang; t: Dict; notice?: string }) {
  return (
    <header className="no-print sticky top-0 z-40 bg-white/85 backdrop-blur-xl backdrop-saturate-150">
      {notice && (
        <p className="sample-notice truncate bg-[#fff4d6] px-4 py-1.5 text-center text-xs text-ink sm:text-sm">{notice}</p>
      )}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-accent focus:px-3 focus:py-2 focus:text-white">
        {t.skipToContent}
      </a>
      <div className="border-b border-black/[0.06]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-[4.5rem] sm:px-6">
          <Link href={`/${lang}`} className="flex min-w-0 items-center gap-3">
            <Image src="/brand/sla-logo.png" alt="" width={44} height={44} priority className="size-10 shrink-0 sm:size-11" />
            <span className="flex min-w-0 flex-col leading-none">
              <span className="truncate text-base font-extrabold tracking-tight text-ink sm:text-lg">{t.siteName}</span>
              <span className="mt-0.5 hidden text-xs font-bold tracking-[0.16em] text-muted uppercase sm:block">{t.siteTagline}</span>
            </span>
          </Link>

          <div className="flex h-full items-center gap-1 sm:gap-3">
            <MainNav items={mainNav(lang, t)} label={t.menu} />
            <LanguageLinks lang={lang} label={t.language} />
            <Link href={`/${lang}/sign-in`}
              className="hidden h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-ink ring-1 ring-black/15 transition hover:ring-ink sm:inline-flex">
              <LogIn className="size-4" aria-hidden /> {t.signIn}
            </Link>
            <a href={portal.home(lang)}
              className="hidden h-10 items-center rounded-full bg-accent px-4 text-sm font-bold text-white shadow-[0_8px_18px_-8px_rgb(232_93_4/0.7)] transition hover:bg-[#d14f00] sm:inline-flex">
              {t.register}
            </a>
            <MenuPanel groups={fullNav(lang, t)} menu={t.menu} close={t.close}
              footer={
                <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:flex-wrap">
                  <Link href={`/${lang}/sign-in`} className="text-sm font-semibold hover:text-accent">{t.signInTitle}</Link>
                  <a href={portal.athlete(lang)} className="text-sm font-semibold hover:text-accent">{t.registerAthlete}</a>
                  <a href={portal.coach(lang)} className="text-sm font-semibold hover:text-accent">{t.registerCoach}</a>
                </div>
              } />
          </div>
        </div>
      </div>
    </header>
  );
}
