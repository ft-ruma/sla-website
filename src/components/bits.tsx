import { Info } from "lucide-react";
import Link from "next/link";

export function ArrowLink({ href, children, className = "", tone = "light" }: {
  href: string;
  children: React.ReactNode;
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <Link href={href}
      className={`more ${tone === "dark" ? "text-white" : "text-ink"} ${className}`}>
      {children}
    </Link>
  );
}

const BADGE_TONES = {
  blue: "bg-brand text-white",
  gold: "bg-gold text-night",
  green: "bg-emerald-700 text-white",
  red: "bg-clay text-white",
  grey: "bg-black/10 text-black/70",
  outline: "text-black/70 ring-1 ring-inset ring-black/15",
} as const;

export function Badge({ tone = "blue", children }: { tone?: keyof typeof BADGE_TONES; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.72rem] font-bold tracking-wider uppercase ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

export function LiveDot() {
  return <span aria-hidden className="live-dot inline-block size-2 rounded-full bg-white" />;
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-3 rounded-2xl border border-brand/15 bg-brand/[0.04] px-4 py-3.5 text-sm text-ink">
      <Info className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}
