"use client";

import { useEffect, useState } from "react";

type Item = { id: string; label: string; Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> };

/** Left-rail jump links with live hash highlighting. */
export function HubRailNav({ items, ariaLabel }: { items: Item[]; ariaLabel: string }) {
  const [hash, setHash] = useState("");
  useEffect(() => {
    const sync = () => setHash(window.location.hash.replace(/^#/, ""));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return (
    <nav className="hub-rail-nav" aria-label={ariaLabel}>
      {items.map(({ id, label, Icon }, i) => {
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
