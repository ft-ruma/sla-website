"use client";

import Lenis from "lenis";
import { useEffect, useState } from "react";

// One smooth-scroll instance for the whole page, so the index can glide to a section.
let lenis: Lenis | null = null;

/** Height of the sticky site header, read from the CSS variable it sets. */
function headerOffset() {
  const header = document.querySelector("header.site-header");
  return header ? header.getBoundingClientRect().height : 0;
}

/** Scroll so the section starts just under the sticky header. */
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - headerOffset();
  if (lenis) lenis.scrollTo(top, { duration: 1.2 });
  else window.scrollTo({ top, behavior: "smooth" });
}

/**
 * Smooth, slightly weighted wheel scrolling (Lenis). Native scrolling is kept
 * on touch screens and for anyone who asks the system for reduced motion.
 */
export function SmoothScroll() {
  // Keep --header-h equal to the header's real height (it changes with the
  // notice, the two-row phone layout and the language), so anything pinned
  // under the header sits exactly against it.
  useEffect(() => {
    const header = document.querySelector("header.site-header");
    if (!header) return;
    const set = () => document.documentElement.style.setProperty("--header-h", `${header.getBoundingClientRect().height}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false });
    let frame = 0;
    const raf = (time: number) => {
      lenis?.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frame);
      lenis?.destroy();
      lenis = null;
    };
  }, []);
  return null;
}

export type RailSection = { id: string; n: string; label: string };

/**
 * Wide screens only: on the right, the list of sections (done above, the
 * current one large, the rest below) and a ruler showing how far down the
 * page you are. Clicking a name glides to that section.
 */
export function ScrollRail({ sections, label }: { sections: RailSection[]; label: string }) {
  const [active, setActive] = useState(-1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = headerOffset() + window.innerHeight * 0.3;
      let current = -1;
      sections.forEach((s, i) => {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = i;
      });
      setActive(current);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [sections]);

  const pct = Math.round(progress * 100);
  return (
    <>
      <nav aria-label={label} className="scroll-index no-print">
        <ol>
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} aria-current={i === active ? "true" : undefined}
                className={i < active ? "is-past" : i === active ? "is-active" : "is-next"}
                onClick={(e) => { e.preventDefault(); scrollToSection(s.id); }}>
                <span className="scroll-index-n">{s.n}</span>
                <span className="scroll-index-label">{s.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div aria-hidden className="scroll-ruler no-print">
        <span className="scroll-ruler-ticks" />
        <span className="scroll-ruler-mark" style={{ top: `${progress * 100}%` }}>
          <span className="scroll-ruler-pct">{String(pct).padStart(3, "0")}%</span>
        </span>
      </div>
    </>
  );
}
