"use client";

import {
  CalendarDays, Download, FileText, Home, LogOut, Menu, Newspaper, Settings, ShieldCheck, Trophy, UserCircle, Users, X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const ITEMS: { href: string; label: string; icon: LucideIcon; owner?: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/news", label: "News", icon: Newspaper },
  { href: "/admin/competitions", label: "Competitions & results", icon: CalendarDays },
  { href: "/admin/rankings", label: "Rankings", icon: Trophy },
  { href: "/admin/records", label: "Records", icon: ShieldCheck },
  { href: "/admin/pages", label: "Pages", icon: FileText },
  { href: "/admin/downloads", label: "Downloads", icon: Download },
  { href: "/admin/settings", label: "Site settings", icon: Settings },
  { href: "/admin/editors", label: "Editors", icon: Users, owner: true },
  { href: "/admin/account", label: "Your account", icon: UserCircle },
];

const active = (path: string, href: string) => (href === "/admin" ? path === href : path === href || path.startsWith(href + "/"));

export function AdminNav({ name, role, logout }: { name: string; role: string; logout: () => Promise<void> }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const items = ITEMS.filter((i) => !i.owner || role === "owner");
  const current = items.find((i) => active(path, i.href));

  const list = (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={active(path, i.href) ? "page" : undefined}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white aria-[current=page]:bg-accent aria-[current=page]:text-white">
          <i.icon className="size-4.5 shrink-0" aria-hidden /> {i.label}
        </Link>
      ))}
    </nav>
  );
  const footer = (
    <div className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-4">
      <a href="/en" target="_blank" className="rounded-xl px-3 py-2 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white">View the website ↗</a>
      <div className="flex items-center justify-between gap-2 px-3 text-xs">
        <span className="min-w-0">
          <span className="block truncate font-semibold text-white">{name}</span>
          <span className="text-white/50 capitalize">{role}</span>
        </span>
        <form action={logout}>
          <button className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-white/70 hover:bg-white/10 hover:text-white">
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </form>
      </div>
    </div>
  );
  const brand = (
    <div className="flex items-center gap-3 px-2">
      <Image src="/brand/sla-logo.png" alt="" width={36} height={36} className="size-9" />
      <span className="leading-tight">
        <span className="block text-sm font-extrabold text-white">Sri Lanka Athletics</span>
        <span className="text-[0.65rem] font-bold tracking-wider text-white/50 uppercase">Website admin</span>
      </span>
    </div>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 bg-night p-4 lg:flex">
        {brand}
        {list}
        {footer}
      </aside>
      <div className="sticky top-0 z-30 flex items-center justify-between bg-night px-4 py-3 text-white lg:hidden">
        <span className="font-bold">{current?.label ?? "Website admin"}</span>
        <button type="button" onClick={() => setOpen(true)} aria-expanded={open} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ring-1 ring-white/30">
          <Menu className="size-4" aria-hidden /> Menu
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <div aria-hidden onClick={() => setOpen(false)} className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto bg-night p-4">
            <div className="flex items-center justify-between">
              {brand}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-1.5 text-white hover:bg-white/10">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            {list}
            {footer}
          </div>
        </div>
      )}
    </>
  );
}
