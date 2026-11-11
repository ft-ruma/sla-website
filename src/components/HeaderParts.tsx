"use client";

import { ChevronDown, ChevronRight, LogIn, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LANG_COOKIE, LANG_NAMES, LANGS, type Lang } from "@/lib/langs";
import { NavIcon } from "./NavIcon";
import type { NavGroup, NavItem } from "./nav";

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
const groupActive = (pathname: string, items: NavItem[]) => items.some((i) => isActive(pathname, i.href));

/** Site mega menu: News + one multi-column panel for the site sections. */
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
  // How the last press happened: a mouse has already opened the panel by hovering,
  // so its click should not close it again; a tap or a key press toggles it.
  const lastPointer = useRef("");

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
                onPointerDown={(e) => { lastPointer.current = e.pointerType; }}
                onClick={() => {
                  const viaMouse = lastPointer.current === "mouse";
                  lastPointer.current = "";
                  if (open && focusGroup === g.title) {
                    if (viaMouse) return;
                    setOpen(false);
                    setFocusGroup(null);
                  } else {
                    openPanel(g.title);
                  }
                }}
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
        data-lenis-prevent
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

export function LanguageLinks({ lang, label, tone = "bar" }: { lang: Lang; label: string; tone?: "bar" | "dark" }) {
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

/**
 * Phones and tablets: a Menu button that opens a full-screen panel with every
 * section (grouped), the language switch, sign-in and Register.
 */
export function MobileMenu({ news, groups, labels, lang, signInHref, registerHref }: {
  news: NavItem;
  groups: NavGroup[];
  labels: { menu: string; close: string; language: string; signIn: string; register: string };
  lang: Lang;
  signInHref: string;
  registerHref: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelId = useId();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    // keep the page behind the panel still
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { html.style.overflow = before; window.removeEventListener("keydown", onKey); };
  }, [open]);

  const all: NavGroup[] = [{ title: "", items: [news] }, ...groups];
  return (
    <>
      <button type="button" className="site-menu-btn" aria-expanded={open} aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}>
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        <span className="max-sm:sr-only">{open ? labels.close : labels.menu}</span>
      </button>
      {/* rendered at page level: the header's backdrop blur would otherwise
          trap this fixed panel inside the header box */}
      {mounted && createPortal(
      <div id={panelId} hidden={!open} className="site-menu-panel" data-lenis-prevent>
        <nav aria-label={labels.menu} className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-5 pb-10 sm:px-6">
          {all.map((g, gi) => (
            <section key={gi}>
              {g.title && <p className="site-menu-group-title">{g.title}</p>}
              <ul className="grid gap-1 sm:grid-cols-2">
                {g.items.map((i) => (
                  <li key={i.href}>
                    <Link href={i.href} aria-current={isActive(pathname, i.href) ? "page" : undefined}
                      className="site-menu-link" onClick={() => setOpen(false)}>
                      <span className="site-menu-icon"><NavIcon name={i.key} className="size-5" /></span>
                      <span className="min-w-0 flex-1">{i.label}</span>
                      <ChevronRight className="size-4 shrink-0 opacity-35" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <div className="flex flex-col gap-4 border-t border-line pt-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-muted">{labels.language}</span>
              <LanguageLinks lang={lang} label={labels.language} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link href={signInHref} className="btn btn-ghost" onClick={() => setOpen(false)}>
                <LogIn className="size-4" aria-hidden /> {labels.signIn}
              </Link>
              <a href={registerHref} className="btn btn-primary">{labels.register}</a>
            </div>
          </div>
        </nav>
      </div>, document.body)}
    </>
  );
}
