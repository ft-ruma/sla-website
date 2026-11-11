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
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wider uppercase ${BADGE_TONES[tone]}`}>
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

/** A friendly "nothing here yet" panel: an icon on a soft disc and one line of text. */
export function EmptyState({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-sand/60 px-6 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-white text-accent shadow-sm ring-1 ring-line">
        <Icon className="size-6" />
      </span>
      <p className="max-w-sm text-muted text-pretty">{children}</p>
    </div>
  );
}
