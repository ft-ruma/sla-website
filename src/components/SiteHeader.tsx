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
    <header className="no-print sticky top-0 z-40 bg-white/90 backdrop-blur-xl backdrop-saturate-150">
      {notice && (
        <p className="sample-notice line-clamp-2 bg-[#fff4d6] px-3 py-1.5 text-center text-[0.8rem] leading-snug text-ink sm:truncate sm:text-sm">
          {notice}
        </p>
      )}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-accent focus:px-3 focus:py-2 focus:text-white">
        {t.skipToContent}
      </a>
      <div className="border-b border-black/[0.06]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:h-[4.5rem] sm:gap-4 sm:px-6">
          <Link href={`/${lang}`} className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            <Image src="/brand/sla-logo.png" alt="" width={48} height={48} priority className="size-10 shrink-0 sm:size-12" />
            <span className="flex min-w-0 flex-col leading-none">
              <span className="truncate text-[1.05rem] font-extrabold tracking-tight text-ink sm:text-lg">{t.siteName}</span>
              <span className="mt-0.5 hidden text-xs font-bold tracking-[0.16em] text-muted uppercase sm:block">{t.siteTagline}</span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <MainNav items={mainNav(lang, t)} label={t.menu} />
            <div className="hidden md:block">
              <LanguageLinks lang={lang} label={t.language} />
            </div>
            <Link href={`/${lang}/sign-in`}
              className="tap hidden h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-ink ring-1 ring-black/15 transition active:bg-black/5 lg:inline-flex">
              <LogIn className="size-4" aria-hidden /> {t.signIn}
            </Link>
            <a href={portal.home(lang)}
              className="tap hidden h-11 items-center rounded-full bg-accent px-4 text-sm font-bold text-white shadow-[0_8px_18px_-8px_rgb(232_93_4/0.7)] transition active:opacity-90 lg:inline-flex">
              {t.register}
            </a>
            <MenuPanel
              groups={fullNav(lang, t)}
              menu={t.menu}
              close={t.close}
              siteName={t.siteName}
              languageLabel={t.language}
              lang={lang}
              signInHref={`/${lang}/sign-in`}
              signInLabel={t.signIn}
              registerHref={portal.home(lang)}
              registerLabel={t.register}
              athleteHref={portal.athlete(lang)}
              athleteLabel={t.registerAthlete}
              coachHref={portal.coach(lang)}
              coachLabel={t.registerCoach}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
