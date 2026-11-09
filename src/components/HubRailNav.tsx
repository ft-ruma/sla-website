"use client";

import {
  BadgeCheck, EyeOff, LayoutDashboard, Trophy, UserCheck, Users,
} from "lucide-react";
import { useEffect, useState } from "react";

const ICONS = {
  overview: LayoutDashboard,
  performance: Trophy,
  coach: UserCheck,
  squad: Users,
  privacy: EyeOff,
  details: BadgeCheck,
} as const;

export type HubRailIcon = keyof typeof ICONS;

/** Left-rail jump links with live hash highlighting. Icon ids stay serializable across the RSC boundary. */
export function HubRailNav({ items, ariaLabel }: {
  items: { id: string; label: string; icon: HubRailIcon }[];
  ariaLabel: string;
}) {
  const [hash, setHash] = useState("");
  useEffect(() => {
    const sync = () => setHash(window.location.hash.replace(/^#/, ""));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return (
    <nav className="hub-rail-nav" aria-label={ariaLabel}>
      {items.map(({ id, label, icon }, i) => {
        const Icon = ICONS[icon];
        const active = hash === id || (!hash && i === 0);
        return (
          <a key={id} href={`#${id}`} className={`hub-rail-link${active ? " is-active" : ""}`}>
            <Icon className="size-4" aria-hidden /><span>{label}</span>
          </a>
        );
      })}
    </nav>
  );
}
