import type { Dict } from "@/lib/dict/en";
import type { Lang } from "@/lib/i18n";
import type { Dashboard } from "@/lib/member-dashboard";

export type PortalView = "overview" | "profile" | "performance" | "history" | "coaches" | "squad" | "settings";

/** The pages this record has, in sidebar order. */
export function portalViews(d: Dashboard | undefined): PortalView[] {
  if (!d) return ["overview", "profile", "settings"];
  const v: PortalView[] = ["overview", "profile"];
  if (d.is_athlete) v.push("performance", "history", "coaches");
  if (d.is_coach && d.is_athlete) v.push("squad");
  v.push("settings");
  return v;
}

export function viewLabel(t: Dict, v: PortalView) {
  return {
    overview: t.portalNavDashboard, profile: t.portalNavProfile, performance: t.dashNavPerformance,
    history: t.portalNavHistory, coaches: t.dashNavCoach, squad: t.dashNavSquad, settings: t.portalNavSettings,
  }[v];
}

export const portalHref = (lang: Lang, id: string, view: PortalView, extra = "") =>
  `/${lang}/account?r=${encodeURIComponent(id)}&view=${view}${extra}`;
