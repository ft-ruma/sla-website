import { LogIn } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Dict } from "@/lib/dict/en";
import type { Lang } from "@/lib/langs";
import { portal } from "@/lib/portal";
import { LanguageLinks, MegaNav, MobileMenu } from "./HeaderParts";
import { megaNav } from "./nav";

export function SiteHeader({ lang, t, notice }: { lang: Lang; t: Dict; notice?: string }) {
  const mega = megaNav(lang, t);
  return (
    <header className="site-header no-print sticky top-0 z-40">
      {notice && (
        <p className="sample-notice truncate bg-[#fff4d6] px-3 py-1.5 text-center text-xs leading-snug text-ink sm:text-sm">
          {notice}
        </p>
      )}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-white">
        {t.skipToContent}
      </a>
      <div className="site-header-bar">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:h-[4.5rem]">
          <Link href={`/${lang}`} className="site-brand flex min-w-0 items-center gap-2.5 lg:shrink-0">
            <Image src="/brand/sla-logo.png" alt="" width={44} height={44} priority className="site-brand-mark size-9 shrink-0 sm:size-10 lg:size-11" />
            <span className="site-brand-text flex min-w-0 flex-col leading-none">
              <span className="truncate text-[0.95rem] font-extrabold tracking-tight text-ink sm:text-lg">{t.siteName}</span>
              <span className="mt-1 hidden text-[0.65rem] font-bold tracking-[0.16em] text-muted uppercase sm:block">{t.siteTagline}</span>
            </span>
          </Link>

          <MegaNav news={mega.news} groups={mega.groups} label={t.menu} />

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <div className="hidden lg:block">
              <LanguageLinks lang={lang} label={t.language} />
            </div>
            <div className="hidden lg:block">
              <Link href={`/${lang}/sign-in`} className="tap site-header-ghost gap-1.5" aria-label={t.signIn}>
                <LogIn className="size-4" aria-hidden />
                <span className="hidden xl:inline">{t.signIn}</span>
              </Link>
            </div>
            <a href={portal.home(lang)} className="tap site-header-cta">{t.register}</a>
            <MobileMenu news={mega.news} groups={mega.groups} lang={lang}
              signInHref={`/${lang}/sign-in`} registerHref={portal.home(lang)}
              labels={{ menu: t.menu, close: t.close, language: t.language, signIn: t.signIn, register: t.register }} />
          </div>
        </div>
      </div>
    </header>
  );
}
