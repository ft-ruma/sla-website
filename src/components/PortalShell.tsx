"use client";

import {
  Bell, ChevronRight, LayoutDashboard, LogOut, History, Settings, TrendingUp, UserCheck, UserRound, Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  createContext, useCallback, useContext, useEffect, useState, type ReactNode,
} from "react";
import type { Dict } from "@/lib/dict/en";
import { fill, type Lang } from "@/lib/i18n";
import { signOut } from "@/lib/member-actions";
import type { MemberRecord } from "@/lib/member-auth";
import type { Dashboard } from "@/lib/member-dashboard";
import { DashPendingButton } from "./DashPendingButton";
import { portalHref, portalViews, type PortalView, viewLabel } from "./portal-nav";

const ICON: Record<PortalView, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard, profile: UserRound, performance: TrendingUp, history: History,
  coaches: UserCheck, squad: Users, settings: Settings,
};

type GoOpts = { hash?: string; query?: Record<string, string> };
type PortalNav = (view: PortalView, opts?: GoOpts) => void;

const NavCtx = createContext<PortalNav>(() => {});

/** Instant jump to another portal section (no server round-trip). */
export function PortalLink({
  view, hash, query, className, children, ...rest
}: {
  view: PortalView;
  hash?: string;
  query?: Record<string, string>;
  className?: string;
  children: ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick" | "className" | "children">) {
  const go = useContext(NavCtx);
  return (
    <button type="button" className={className} onClick={() => go(view, { hash, query })} {...rest}>
      {children}
    </button>
  );
}

const initials = (name: string) =>
  name.replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join("").toUpperCase() || "SL";

function waitingCount(d: Dashboard | undefined) {
  if (!d) return 0;
  const coach = d.coach ? d.coach.requests.length + d.coach.marks.length : 0;
  return coach + d.marks.filter((m) => m.status === "pending").length;
}

function viewFromUrl(fallback: PortalView, allowed: PortalView[]) {
  if (typeof window === "undefined") return fallback;
  const v = new URLSearchParams(window.location.search).get("view") as PortalView | null;
  return v && allowed.includes(v) ? v : fallback;
}

/**
 * Portal chrome with instant section switching. The server loads the dashboard
 * once and sends every section; clicking a nav item only changes which panel
 * is shown (no round-trip). Form posts still reload so fresh data comes back.
 */
export function PortalShell({
  lang, t, records, r, d, view: initialView, panels,
}: {
  lang: Lang;
  t: Dict;
  records: MemberRecord[];
  r: MemberRecord;
  d: Dashboard | undefined;
  view: PortalView;
  panels: Partial<Record<PortalView, ReactNode>>;
}) {
  const views = portalViews(d);
  const [view, setView] = useState<PortalView>(views.includes(initialView) ? initialView : views[0]);

  useEffect(() => {
    setView(viewFromUrl(initialView, views));
    // Reset when the chosen registration changes (full navigation).
  }, [initialView, r.slaa_id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onPop = () => setView(viewFromUrl(views[0], views));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [views]);

  const go = useCallback<PortalNav>((next, opts) => {
    if (!views.includes(next)) return;
    setView(next);
    const q = new URLSearchParams({ r: r.slaa_id, view: next, ...(opts?.query ?? {}) });
    const url = `/${lang}/account?${q.toString()}${opts?.hash ? (opts.hash.startsWith("#") ? opts.hash : `#${opts.hash}`) : ""}`;
    window.history.pushState(null, "", url);
    if (opts?.hash) {
      const id = opts.hash.replace(/^#/, "");
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } else {
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    }
  }, [lang, r.slaa_id, views]);

  const name = r.details?.full_name ?? r.display_name;
  const role = [r.details?.is_athlete && t.roleAthlete, r.details?.is_coach && t.roleCoach].filter(Boolean).join(" · ");
  const waiting = waitingCount(d);
  const bellView: PortalView = d?.coach && (d.coach.requests.length || d.coach.marks.length)
    ? (d.is_athlete ? "squad" : "overview")
    : "performance";

  return (
    <NavCtx.Provider value={go}>
      <div className="portal">
        <aside className="portal-side">
          <div className="portal-side-brand">
            <Image src="/brand/sla-logo.png" alt="" width={40} height={40} className="size-10 rounded-lg" />
            <span className="leading-tight font-extrabold tracking-wide uppercase">{t.siteName}</span>
          </div>
          {records.length > 1 && (
            <div className="portal-records">
              <p className="portal-side-label">{t.portalRecord}</p>
              {records.map((x) => (
                <Link key={x.slaa_id} href={portalHref(lang, x.slaa_id, "overview")}
                  aria-current={x.slaa_id === r.slaa_id ? "true" : undefined} className="portal-record">
                  <span className="portal-avatar size-8 text-[0.7rem]">{initials(x.display_name)}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{x.display_name}</span>
                    <span className="block font-mono text-[0.68rem] opacity-60">{x.slaa_id}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
          <nav aria-label={t.accountTitle} className="portal-nav">
            {views.map((v) => {
              const Icon = ICON[v];
              const current = v === view;
              return (
                <button key={v} type="button" aria-current={current ? "page" : undefined}
                  className="portal-nav-link" onClick={() => go(v)}>
                  <Icon className="size-[1.1rem] shrink-0" />
                  <span>{viewLabel(t, v)}</span>
                </button>
              );
            })}
          </nav>
          <form action={signOut} className="portal-logout">
            <input type="hidden" name="lang" value={lang} />
            <DashPendingButton type="submit" className="portal-nav-link w-full" pendingLabel="…">
              <LogOut className="size-[1.1rem] shrink-0" aria-hidden /> <span>{t.signOut}</span>
            </DashPendingButton>
          </form>
        </aside>

        <div className="portal-main">
          <div className="portal-top">
            <p className="portal-crumb">{t.accountTitle} <ChevronRight className="size-3.5" aria-hidden /> <span>{viewLabel(t, view)}</span></p>
            <div className="flex items-center gap-4">
              <button type="button" className="portal-bell" aria-label={fill(t.portalNotifications, { count: String(waiting) })}
                onClick={() => go(views.includes(bellView) ? bellView : "overview")}>
                <Bell className="size-5" aria-hidden />
                {waiting > 0 && <span className="portal-bell-dot">{waiting > 9 ? "9+" : waiting}</span>}
              </button>
              <div className="flex items-center gap-3">
                <span className="portal-avatar size-10 text-sm">{initials(name)}</span>
                <span className="hidden leading-tight sm:block">
                  <span className="block max-w-[14rem] truncate text-sm font-bold">{name}</span>
                  <span className="block text-xs text-muted">{role || t.accountTitle}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="portal-body">
            {views.map((v) => (
              <div key={v} hidden={v !== view} className="flex flex-col gap-6">
                {panels[v]}
              </div>
            ))}
          </div>
        </div>
      </div>
    </NavCtx.Provider>
  );
}
