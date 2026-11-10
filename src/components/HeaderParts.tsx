"use client";

import { ArrowRight, ChevronDown, ChevronRight, LogIn, Menu, Newspaper, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LANG_COOKIE, LANG_NAMES, LANGS, type Lang } from "@/lib/langs";
import { NavIcon } from "./NavIcon";
import type { NavGroup, NavItem } from "./nav";

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
const groupActive = (pathname: string, items: NavItem[]) => items.some((i) => isActive(pathname, i.href));

/** Desktop / tablet mega menu: News + one multi-column panel for the site sections. */
export function MegaNav({
  news,
  groups,
  label,
}: {
  news: NavItem;
  groups: NavGroup[];
  label: string;
}) {
  const pathname = usePathname();
  const panelId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [focusGroup, setFocusGroup] = useState<string | null>(null);

  const clearClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    clearClose();
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setFocusGroup(null);
    }, 140);
  };
  const openPanel = (title?: string) => {
    clearClose();
    setOpen(true);
    if (title) setFocusGroup(title);
  };

  useEffect(() => {
    setOpen(false);
    setFocusGroup(null);
  }, [pathname]);
  useEffect(() => () => clearClose(), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      setFocusGroup(null);
    };
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocusGroup(null);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("touchstart", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("touchstart", onPointer);
    };
  }, [open]);

  const newsActive = isActive(pathname, news.href);

  return (
    <nav
      ref={rootRef}
      aria-label={label}
      className="site-mega-nav"
      onMouseLeave={scheduleClose}
      onMouseEnter={clearClose}
    >
      <div className="site-mega-triggers">
        <Link
          href={news.href}
          title={news.label}
          aria-current={newsActive ? "page" : undefined}
          className={`site-main-link ${newsActive ? "is-active" : ""}`}
          onFocus={() => {
            setOpen(false);
            setFocusGroup(null);
          }}
        >
          <Newspaper className="size-4 shrink-0 opacity-80" aria-hidden />
          <span className="site-main-link-label">{news.label}</span>
        </Link>

        {groups.map((g) => {
          const active = groupActive(pathname, g.items);
          const highlighted = open && focusGroup === g.title;
          return (
            <div
              key={g.title}
              className="site-mega-item"
              onMouseEnter={() => openPanel(g.title)}
            >
              <button
                type="button"
                className={`site-main-link site-mega-trigger ${active ? "is-active" : ""} ${highlighted ? "is-open" : ""}`}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => {
                  if (open && focusGroup === g.title) {
                    setOpen(false);
                    setFocusGroup(null);
                  } else {
                    openPanel(g.title);
                  }
                }}
                onFocus={() => openPanel(g.title)}
              >
                <span className="site-main-link-label">{g.title}</span>
                <ChevronDown className={`size-3.5 shrink-0 opacity-55 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>

      <div
        id={panelId}
        hidden={!open}
        className="site-mega-panel"
        onMouseEnter={clearClose}
      >
        <div className="site-mega-panel-inner">
          <div className="site-mega-columns">
            {groups.map((g) => (
              <section
                key={g.title}
                className={`site-mega-column ${focusGroup === g.title ? "is-focus" : ""}`}
              >
                <p className="site-mega-panel-title">{g.title}</p>
                <ul className="site-mega-list">
                  {g.items.map((i) => {
                    const active = isActive(pathname, i.href);
                    return (
                      <li key={i.href}>
                        <Link
                          href={i.href}
                          aria-current={active ? "page" : undefined}
                          className={`site-mega-link ${active ? "is-active" : ""}`}
                          onClick={() => {
                            setOpen(false);
                            setFocusGroup(null);
                          }}
                        >
                          <span className={`site-mega-icon ${active ? "is-active" : ""}`}>
                            <NavIcon name={i.key} className="size-5" />
                          </span>
                          <span className="min-w-0 flex-1 font-semibold">{i.label}</span>
                          <ChevronRight className="size-4 shrink-0 opacity-35" aria-hidden />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

export function LanguageLinks({ lang, label, tone = "bar" }: { lang: Lang; label: string; tone?: "bar" | "menu" | "dark" }) {
  const pathname = usePathname();
  const rest = pathname.replace(/^\/(si|ta|en)(?=\/|$)/, "");
  if (tone === "dark") {
    return (
      <nav aria-label={label} className="flex items-center gap-0.5">
        {LANGS.map((l) => (
          <Link key={l} href={`/${l}${rest}`} lang={l} hrefLang={l} aria-current={l === lang ? "true" : undefined}
            onClick={() => { document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`; }}
            className="px-1.5 py-0.5 text-xs font-bold tracking-wider text-white/45 uppercase hover:text-white aria-[current=true]:text-white">
            {LANG_NAMES[l]}
          </Link>
        ))}
      </nav>
    );
  }
  if (tone === "menu") {
    return (
      <nav aria-label={label} className="grid grid-cols-3 gap-2">
        {LANGS.map((l) => (
          <Link key={l} href={`/${l}${rest}`} lang={l} hrefLang={l} aria-current={l === lang ? "true" : undefined}
            onClick={() => { document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`; }}
            className="tap inline-flex min-h-11 items-center justify-center rounded-2xl px-3 text-sm font-bold tracking-wider uppercase text-ink/55 ring-1 ring-black/10 transition active:bg-sand hover:bg-sand aria-[current=true]:bg-night aria-[current=true]:text-white aria-[current=true]:ring-night">
            {LANG_NAMES[l]}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav aria-label={label} className="site-lang">
      {LANGS.map((l) => (
        <Link key={l} href={`/${l}${rest}`} lang={l} hrefLang={l} aria-current={l === lang ? "true" : undefined}
          onClick={() => { document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`; }}
          className="site-lang-link">
          {({ si: "SI", ta: "TA", en: "EN" } as const)[l]}
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
  siteTagline,
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
  siteTagline: string;
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

  const drawer = open && mounted
    ? createPortal(
        <div id="site-menu" role="dialog" aria-modal="true" aria-label={menu}
          className="fixed inset-0 z-[60] flex flex-col">
          <button type="button" aria-label={close} onClick={() => setOpen(false)}
            className="absolute inset-0 bg-night/50 backdrop-blur-[3px] animate-[menu-fade_0.2s_ease-out]" />

          <div className="site-drawer relative z-10 mx-auto flex h-full w-full max-w-lg flex-col shadow-2xl animate-[menu-slide_0.28s_cubic-bezier(0.22,1,0.36,1)] sm:max-w-xl md:ml-auto md:max-w-[24rem] md:border-l md:border-black/5">
            <div className="shrink-0 bg-gradient-to-br from-night via-night to-[#1a1f4d] px-4 pt-[max(0.85rem,env(safe-area-inset-top))] pb-5 text-white sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                    <Image src="/brand/sla-logo.png" alt="" width={40} height={40} className="size-9" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-extrabold tracking-tight">{siteName}</p>
                    <p className="mt-0.5 text-xs font-semibold tracking-[0.12em] text-white/55 uppercase">{siteTagline}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setOpen(false)}
                  className="tap grid size-11 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition active:bg-white/20">
                  <X className="size-5" strokeWidth={2} aria-hidden />
                  <span className="sr-only">{close}</span>
                </button>
              </div>
              <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-accent to-gold" />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
              <div className="mb-5 sm:hidden">
                <p className="mb-2 text-[0.7rem] font-bold tracking-[0.14em] text-muted uppercase">{languageLabel}</p>
                <LanguageLinks lang={lang} label={languageLabel} tone="menu" />
              </div>

              <div className="flex flex-col gap-4">
                {groups.map((g) => (
                  <section key={g.title} className="site-drawer-group">
                    <p className="site-drawer-group-title">{g.title}</p>
                    <ul className="flex flex-col">
                      {g.items.map((i) => {
                        const active = isActive(pathname, i.href);
                        return (
                          <li key={i.href}>
                            <Link href={i.href} aria-current={active ? "page" : undefined}
                              onClick={() => setOpen(false)}
                              className={`site-drawer-link ${active ? "is-active" : ""}`}>
                              <span className={`site-drawer-icon ${active ? "is-active" : ""}`}>
                                <NavIcon name={i.key} className="size-5" />
                              </span>
                              <span className="min-w-0 flex-1 font-semibold">{i.label}</span>
                              <ChevronRight className="size-4 shrink-0 opacity-40" aria-hidden />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            </div>

            <div className="site-drawer-foot shrink-0 border-t border-line bg-white px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
              <div className="grid gap-2.5">
                <a href={registerHref} className="tap btn btn-primary w-full justify-center shadow-[0_12px_28px_-12px_rgb(232_93_4/0.75)]">
                  {registerLabel} <ArrowRight className="size-4" aria-hidden />
                </a>
                <Link href={signInHref} onClick={() => setOpen(false)}
                  className="tap btn btn-ghost w-full justify-center md:hidden">
                  <LogIn className="size-4" aria-hidden /> {signInLabel}
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <a href={athleteHref} className="tap rounded-2xl bg-sand px-3 py-3 text-center text-sm font-bold text-ink ring-1 ring-black/6 transition active:bg-white">
                    {athleteLabel}
                  </a>
                  <a href={coachHref} className="tap rounded-2xl bg-sand px-3 py-3 text-center text-sm font-bold text-ink ring-1 ring-black/6 transition active:bg-white">
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
        className="tap site-menu-btn md:hidden" aria-label={open ? close : menu}>
        {open ? <X className="size-5" strokeWidth={2} aria-hidden /> : <Menu className="size-5" strokeWidth={2} aria-hidden />}
        <span className="site-menu-btn-label">{menu}</span>
      </button>
      {drawer}
    </>
  );
}
