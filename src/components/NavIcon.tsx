import {
  Award, BarChart3, Building2, CalendarDays, ClipboardCheck, Download, Info, Newspaper, ShieldCheck, Sprout, Timer, UserRound,
} from "lucide-react";
import type { NavKey } from "./nav";

const ICONS: Record<NavKey, React.ElementType> = {
  news: Newspaper, calendar: CalendarDays, results: Timer, rankings: BarChart3, records: Award, athletes: UserRound,
  clubs: Building2, coaches: ClipboardCheck, development: Sprout, about: Info, antiDoping: ShieldCheck, downloads: Download,
};

export function NavIcon({ name, className }: { name: NavKey; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} aria-hidden />;
}
