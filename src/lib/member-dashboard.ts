import "server-only";
import { sql } from "./db";
import { sessionHash } from "./member-auth";
import * as mock from "./member-mock";
import { MOCK } from "./member-mock";

// The member dashboard, backed by the functions in db/member_dashboard.sql.
// Every call passes the session (as its HMAC); the database checks that the
// record belongs to the signed-in member before reading or changing it.
// With MEMBER_AUTH_MOCK=1 the same shapes come from member-mock.ts.

export const PRIVACY_KEYS = ["hide_profile", "hide_club", "hide_birth_year", "hide_results"] as const;
export type PrivacyKey = (typeof PRIVACY_KEYS)[number];

export type EventRow = {
  code: string;
  priority: number;
  pb: string | null;
  pb_year: number | null;
  competition: string | null;
  verified: boolean;
  place: number | null;
  field: number | null;
  /** Everyone's marks in this event as numbers, smallest first (for the field chart). */
  dist?: number[] | null;
};

export type MarkRow = {
  id: number;
  event: string;
  mark: string;
  year: number;
  competition: string | null;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  note: string | null;
  at: string;
};

export type CoachLink = {
  link: number;
  coach_id: string;
  name: string;
  district: string;
  state: "active" | "awaiting" | "past";
  primary: boolean;
  replaces: boolean;
  start_year: number | null;
  end_year: number | null;
};

export type CoachView = {
  requests: {
    link: number; athlete_id: string; name: string; district: string; birth_year: number;
    replaces: boolean; since: string; events: string | null;
  }[];
  athletes: {
    link: number; athlete_id: string; full_name: string; name: string; date_of_birth: string; gender: "M" | "F";
    district: string; phone: string | null; email: string | null; status: string; primary: boolean;
    school: string | null; events: EventRow[]; start_year?: number | null;
  }[];
  /** Former athletes: no contact details or date of birth. */
  past?: {
    link: number; athlete_id: string; name: string; district: string; start_year: number | null;
    end_year: number | null; confirmed: boolean; listed_by: string;
    events: { code: string; pb: string | null; verified: boolean }[];
  }[];
  marks: {
    id: number; athlete_id: string; name: string; event: string; mark: string; year: number;
    competition: string | null; previous: string | null;
  }[];
  past_count: number;
};

export type Dashboard = {
  slaa_id: string;
  is_athlete: boolean;
  is_coach: boolean;
  privacy: Partial<Record<PrivacyKey, boolean>>;
  events: EventRow[];
  marks: MarkRow[];
  coaches: CoachLink[];
  coach: CoachView | null;
};

/** True when mock mode is on, or when the website has a database connection. */
export const dashboardAvailable = () => MOCK || sql !== null;

async function session() {
  const hash = await sessionHash();
  if (!hash) throw new Error("Not signed in");
  if (MOCK) return { hash, db: null as typeof sql };
  if (!sql) throw new Error("Not signed in");
  return { hash, db: sql };
}

export async function dashboard(slaaId: string): Promise<Dashboard | null> {
  if (!dashboardAvailable()) return null;
  const { hash, db } = await session();
  if (MOCK) return mock.dashboard(hash, slaaId);
  const [row] = await db!<{ d: Dashboard | null }[]>`SELECT web.member_dashboard(${hash}, ${slaaId}) AS d`;
  return row?.d ?? null;
}

export async function setPrivacy(slaaId: string, privacy: Partial<Record<PrivacyKey, boolean>>) {
  const { hash, db } = await session();
  if (MOCK) return mock.setPrivacy(hash, slaaId, privacy);
  const [row] = await db!<{ ok: boolean }[]>`
    SELECT web.member_set_privacy(${hash}, ${slaaId}, ${db!.json(privacy)}) AS ok`;
  return row?.ok === true;
}

export async function submitMark(slaaId: string, event: string, mark: string, year: number, competition: string) {
  const { hash, db } = await session();
  if (MOCK) return mock.submitMark(hash, slaaId, event, mark, year, competition);
  const [row] = await db!<{ r: "ok" | "invalid" | "limited" }[]>`
    SELECT web.member_submit_mark(${hash}, ${slaaId}, ${event}, ${mark}, ${year}, ${competition}) AS r`;
  return row?.r ?? "invalid";
}

export async function withdrawMark(slaaId: string, id: number) {
  const { hash, db } = await session();
  if (MOCK) return mock.withdrawMark(hash, slaaId, id);
  const [row] = await db!<{ ok: boolean }[]>`SELECT web.member_withdraw_mark(${hash}, ${slaaId}, ${id}) AS ok`;
  return row?.ok === true;
}

export type CoachHit = { slaa_id: string; name: string; district: string; disciplines: string[]; verified: boolean };

export async function coachSearch(query: string): Promise<CoachHit[]> {
  if (!dashboardAvailable() || query.trim().length < 2) return [];
  const { hash, db } = await session();
  if (MOCK) return mock.coachSearch(hash, query);
  return db!<CoachHit[]>`SELECT * FROM web.member_coach_search(${hash}, ${query})`;
}

export async function requestCoach(slaaId: string, coachId: string, replace: boolean) {
  const { hash, db } = await session();
  if (MOCK) return mock.requestCoach(hash, slaaId, coachId, replace);
  const [row] = await db!<{ r: "ok" | "unknown" | "self" | "already" | "limited" }[]>`
    SELECT web.member_request_coach(${hash}, ${slaaId}, ${coachId}, ${replace}) AS r`;
  return row?.r ?? "unknown";
}

export async function cancelCoachRequest(slaaId: string, link: number) {
  const { hash, db } = await session();
  if (MOCK) return mock.cancelCoachRequest(hash, slaaId, link);
  const [row] = await db!<{ ok: boolean }[]>`SELECT web.member_cancel_coach_request(${hash}, ${slaaId}, ${link}) AS ok`;
  return row?.ok === true;
}

export async function decideLink(coachId: string, link: number, accept: boolean) {
  const { hash, db } = await session();
  if (MOCK) return mock.decideLink(hash, coachId, link, accept);
  const [row] = await db!<{ ok: boolean }[]>`SELECT web.coach_decide_link(${hash}, ${coachId}, ${link}, ${accept}) AS ok`;
  return row?.ok === true;
}

export async function decideMark(coachId: string, id: number, accept: boolean, note: string) {
  const { hash, db } = await session();
  if (MOCK) return mock.decideMark(hash, coachId, id, accept, note);
  const [row] = await db!<{ ok: boolean }[]>`
    SELECT web.coach_decide_mark(${hash}, ${coachId}, ${id}, ${accept}, ${note}) AS ok`;
  return row?.ok === true;
}

export async function confirmPb(coachId: string, athleteId: string, event: string) {
  const { hash, db } = await session();
  if (MOCK) return mock.confirmPb(hash, coachId, athleteId, event);
  const [row] = await db!<{ ok: boolean }[]>`
    SELECT web.coach_confirm_pb(${hash}, ${coachId}, ${athleteId}, ${event}) AS ok`;
  return row?.ok === true;
}

export type DirectoryEntry = {
  slaa_id: string; display_name: string; is_minor: boolean; birth_year: number | null; gender: "M" | "F";
  district: string; is_athlete: boolean; is_coach: boolean; club_name: string | null;
  events: { code: string; pb: string | null; verified: boolean }[]; total: number;
};

/** Verified athletes and coaches, as each member's privacy switches allow. */
export async function directorySearch(q: string, role: string, district: string, page: number, size = 24) {
  if (MOCK || !sql) return { rows: [] as DirectoryEntry[], total: 0 };
  const rows = await sql<DirectoryEntry[]>`
    SELECT * FROM web.directory_search(${q}, ${role}, ${district}, ${size}, ${(page - 1) * size})`;
  return { rows, total: Number(rows[0]?.total ?? 0) };
}
