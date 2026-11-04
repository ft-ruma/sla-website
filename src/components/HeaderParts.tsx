"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LANG_COOKIE, LANG_NAMES, LANGS, type Lang } from "@/lib/langs";
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
      ? "tap inline-flex min-h-11 items-center rounded-full px-4 text-base font-bold tracking-wider uppercase text-ink/50 hover:bg-sand hover:text-ink aria-[current=true]:bg-sand aria-[current=true]:text-ink"
      // ≥44px tap target on phones
      : "grid h-11 min-w-11 place-items-center rounded-full px-2 text-sm font-bold tracking-wider text-ink/45 uppercase transition active:bg-black/5 hover:bg-black/5 hover:text-ink aria-[current=true]:text-ink";
  return (
    <nav aria-label={label} className="flex items-center gap-0.5">
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

export function MenuPanel({ groups, menu, close, footer }: {
  groups: NavGroup[];
  more?: string;
  menu: string;
  close: string;
  footer: React.ReactNode;
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

  // Portal to <body>: the header uses backdrop-blur, which makes position:fixed
  // children clip to the header bar — so the drawer looked like it did nothing.
  const drawer = open && mounted
    ? createPortal(
        <div
          id="site-menu"
          role="dialog"
          aria-modal="true"
          aria-label={menu}
          className="fixed inset-0 z-[60] flex flex-col bg-white"
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-black/[0.06] px-3 sm:h-[4.5rem] sm:px-6">
            <p className="text-base font-extrabold tracking-tight">{menu}</p>
            <button type="button" onClick={() => setOpen(false)}
              className="tap grid size-11 place-items-center rounded-full text-ink ring-1 ring-black/10 transition active:bg-black/5">
              <X className="size-6" strokeWidth={1.75} aria-hidden />
              <span className="sr-only">{close}</span>
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:grid-cols-3 sm:gap-10 sm:px-8 sm:py-12">
              {groups.map((g) => (
                <div key={g.title}>
                  <p className="label mb-4 text-ink">{g.title}</p>
                  <ul className="flex flex-col">
                    {g.items.map((i) => (
                      <li key={i.href}>
                        <Link href={i.href} aria-current={isActive(pathname, i.href) ? "page" : undefined}
                          onClick={() => setOpen(false)}
                          className="tap flex items-center justify-between rounded-xl px-3 py-3.5 text-lg font-semibold text-ink transition active:bg-sand hover:bg-sand aria-[current=page]:bg-sand aria-[current=page]:text-accent">
                          {i.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mx-auto max-w-6xl px-5 pb-12 sm:px-8">{footer}</div>
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
