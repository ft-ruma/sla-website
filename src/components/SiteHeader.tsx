import { LogIn } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Dict } from "@/lib/dict/en";
import type { Lang } from "@/lib/langs";
import { portal } from "@/lib/portal";
import { LanguageLinks, MegaNav, MenuPanel } from "./HeaderParts";
import { fullNav, megaNav } from "./nav";

export function SiteHeader({ lang, t, notice }: { lang: Lang; t: Dict; notice?: string }) {
  const mega = megaNav(lang, t);
  return (
    <header className="site-header no-print sticky top-0 z-40">
      {notice && (
        <p className="sample-notice line-clamp-2 bg-[#fff4d6] px-3 py-1.5 text-center text-[0.8rem] leading-snug text-ink sm:truncate sm:text-sm">
          {notice}
        </p>
      )}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-white">
        {t.skipToContent}
      </a>
      <div className="site-header-bar">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:h-[4.5rem] sm:gap-3 sm:px-6">
          <Link href={`/${lang}`} className="site-brand flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3">
            <span className="site-brand-mark">
              <Image src="/brand/sla-logo.png" alt="" width={48} height={48} priority className="size-9 sm:size-11" />
            </span>
            <span className="flex min-w-0 flex-col leading-none">
              <span className="truncate text-[1.02rem] font-extrabold tracking-tight text-ink sm:text-lg">{t.siteName}</span>
              <span className="mt-0.5 hidden text-[0.68rem] font-bold tracking-[0.16em] text-muted uppercase md:block">{t.siteTagline}</span>
            </span>
          </Link>

          <MegaNav news={mega.news} groups={mega.groups} label={t.menu} />

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:block">
              <LanguageLinks lang={lang} label={t.language} />
            </div>
            <Link href={`/${lang}/sign-in`}
              className="tap site-header-ghost hidden items-center gap-1.5 md:inline-flex">
              <LogIn className="size-4" aria-hidden />
              <span className="hidden lg:inline">{t.signIn}</span>
            </Link>
            <a href={portal.home(lang)}
              className="tap site-header-cta max-md:px-3 max-md:text-[0.78rem]">
              {t.register}
            </a>
            <MenuPanel
              groups={fullNav(lang, t)}
              menu={t.menu}
              close={t.close}
              siteName={t.siteName}
              siteTagline={t.siteTagline}
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
