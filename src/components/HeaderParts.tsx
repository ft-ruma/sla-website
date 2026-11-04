"use client";

import { ArrowRight, ChevronRight, LogIn, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LANG_COOKIE, LANG_NAMES, LANGS, type Lang } from "@/lib/langs";
import { NavIcon } from "./NavIcon";
import type { NavGroup, NavItem } from "./nav";

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function MainNav({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="hidden items-center gap-0.5 rounded-full bg-black/[0.04] p-1 lg:flex">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={isActive(pathname, i.href) ? "page" : undefined}
          className="rounded-full px-3.5 py-1.5 text-sm font-semibold text-ink/70 transition hover:bg-white hover:text-ink aria-[current=page]:bg-night aria-[current=page]:text-white">
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export function LanguageLinks({ lang, label, tone = "bar" }: { lang: Lang; label: string; tone?: "bar" | "menu" | "dark" }) {
  const pathname = usePathname();
  const rest = pathname.replace(/^\/(si|ta|en)(?=\/|$)/, "");
  const cls = tone === "dark"
    ? "px-1.5 py-0.5 text-xs font-bold tracking-wider text-white/45 uppercase hover:text-white aria-[current=true]:text-white"
    : tone === "menu"
      ? "tap inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-3 text-sm font-bold tracking-wider uppercase text-ink/55 ring-1 ring-black/10 transition active:bg-sand hover:bg-sand aria-[current=true]:bg-night aria-[current=true]:text-white aria-[current=true]:ring-night"
      : "grid h-11 min-w-11 place-items-center rounded-full px-2 text-sm font-bold tracking-wider text-ink/45 uppercase transition active:bg-black/5 hover:bg-black/5 hover:text-ink aria-[current=true]:text-ink";
  return (
    <nav aria-label={label} className={tone === "menu" ? "flex w-full items-center gap-2" : "flex items-center gap-0.5"}>
      {LANGS.map((l) => (
        <Link key={l} href={`/${l}${rest}`} lang={l} hrefLang={l} aria-current={l === lang ? "true" : undefined}
          onClick={() => { document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`; }}
          className={cls}>
          {tone === "bar" ? ({ si: "SI", ta: "TA", en: "EN" } as const)[l] : LANG_NAMES[l]}
        </Link>
      ))}
    </nav>
  );
}

export function MenuPanel({
  groups,
  menu,
  close,
  siteName,
  languageLabel,
  lang,
  signInHref,
  signInLabel,
  registerHref,
  registerLabel,
  athleteHref,
  athleteLabel,
  coachHref,
  coachLabel,
}: {
  groups: NavGroup[];
  menu: string;
  close: string;
  siteName: string;
  languageLabel: string;
  lang: Lang;
  signInHref: string;
  signInLabel: string;
  registerHref: string;
  registerLabel: string;
  athleteHref: string;
  athleteLabel: string;
  coachHref: string;
  coachLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Portal to <body>: header backdrop-blur would otherwise clip a fixed child.
  const drawer = open && mounted
    ? createPortal(
        <div
          id="site-menu"
          role="dialog"
          aria-modal="true"
          aria-label={menu}
          className="fixed inset-0 z-[60] flex flex-col"
        >
          {/* Dim the page; tap outside the sheet closes on tablet landscape */}
          <button type="button" aria-label={close} onClick={() => setOpen(false)}
            className="absolute inset-0 bg-night/45 backdrop-blur-[2px] animate-[menu-fade_0.2s_ease-out]" />

          <div className="relative z-10 mx-auto flex h-full w-full max-w-lg flex-col bg-sand shadow-2xl animate-[menu-slide_0.28s_cubic-bezier(0.22,1,0.36,1)] sm:max-w-xl md:ml-auto md:max-w-md md:border-l md:border-black/5">
            {/* Top brand bar */}
            <div className="shrink-0 bg-night px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-4 text-white sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Image src="/brand/sla-logo.png" alt="" width={40} height={40} className="size-10 rounded-xl bg-white/10 p-1" />
                  <div className="min-w-0">
                    <p className="truncate text-base font-extrabold tracking-tight">{siteName}</p>
                    <p className="text-xs font-semibold tracking-[0.14em] text-white/55 uppercase">{menu}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setOpen(false)}
                  className="tap grid size-11 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition active:bg-white/20">
                  <X className="size-5" strokeWidth={2} aria-hidden />
                  <span className="sr-only">{close}</span>
                </button>
              </div>
              <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-1/3 rounded-full bg-accent" />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
              <div className="mb-5 md:hidden">
                <p className="mb-2 text-[0.7rem] font-bold tracking-[0.14em] text-muted uppercase">{languageLabel}</p>
                <LanguageLinks lang={lang} label={languageLabel} tone="menu" />
              </div>

              <div className="flex flex-col gap-5">
                {groups.map((g) => (
                  <section key={g.title} className="overflow-hidden rounded-2xl bg-white shadow-[0_0_0_1px_rgb(17_17_17/0.06),0_10px_28px_-18px_rgb(17_17_17/0.28)]">
                    <p className="border-b border-line bg-white px-4 py-3 text-[0.72rem] font-extrabold tracking-[0.14em] text-accent uppercase">
                      {g.title}
                    </p>
                    <ul className="flex flex-col divide-y divide-line/80">
                      {g.items.map((i) => {
                        const active = isActive(pathname, i.href);
                        return (
                          <li key={i.href}>
                            <Link href={i.href} aria-current={active ? "page" : undefined}
                              onClick={() => setOpen(false)}
                              className={`tap flex items-center gap-3 px-4 py-3.5 transition active:bg-sand ${active ? "bg-accent/5" : "hover:bg-sand/70"}`}>
                              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${active ? "bg-accent text-white" : "bg-sand text-ink"}`}>
                                <NavIcon name={i.key} className="size-5" />
                              </span>
                              <span className={`min-w-0 flex-1 text-[1.05rem] font-semibold ${active ? "text-accent" : "text-ink"}`}>
                                {i.label}
                              </span>
                              <ChevronRight className={`size-5 shrink-0 ${active ? "text-accent" : "text-muted"}`} aria-hidden />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>

              <div className="mt-6 grid gap-3 pb-2">
                <a href={registerHref}
                  className="tap btn btn-primary w-full justify-center shadow-[0_12px_28px_-12px_rgb(232_93_4/0.75)]">
                  {registerLabel} <ArrowRight className="size-4" aria-hidden />
                </a>
                <Link href={signInHref} onClick={() => setOpen(false)}
                  className="tap btn btn-ghost w-full justify-center">
                  <LogIn className="size-4" aria-hidden /> {signInLabel}
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <a href={athleteHref} className="tap rounded-2xl bg-white px-3 py-3 text-center text-sm font-bold text-ink ring-1 ring-black/8 transition active:bg-sand">
                    {athleteLabel}
                  </a>
                  <a href={coachHref} className="tap rounded-2xl bg-white px-3 py-3 text-center text-sm font-bold text-ink ring-1 ring-black/8 transition active:bg-sand">
                    {coachLabel}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="site-menu"
        className="tap grid size-11 place-items-center self-center rounded-full text-ink ring-1 ring-black/10 transition active:bg-black/5 hover:ring-ink">
        {open ? <X className="size-6" strokeWidth={1.75} aria-hidden /> : <Menu className="size-6" strokeWidth={1.75} aria-hidden />}
        <span className="sr-only">{open ? close : menu}</span>
      </button>
      {drawer}
    </>
  );
}
