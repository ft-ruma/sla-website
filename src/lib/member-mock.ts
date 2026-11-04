import "server-only";
import { checkDigit } from "./slaa-id";

// In-memory stand-in for db/member_auth.sql, for trying member sign-in
// without a database. Turned on by MEMBER_AUTH_MOCK=1 and never in production.
// The rules match the SQL functions; the data is fictional.

export const MOCK = process.env.NODE_ENV !== "production" && process.env.MEMBER_AUTH_MOCK === "1";

type Status = "pending" | "verified" | "suspended" | "merged";

type MockMember = {
  slaa_id: string;
  status: Status;
  nic: string | null;
  postal_id: string | null;
  email: string | null;
  full_name: string;
  name_with_initials: string;
  date_of_birth: string;
  gender: "M" | "F";
  district: string;
  phone: string;
  is_athlete: boolean;
  is_coach: boolean;
  club_name: string | null;
  academic_institution: string | null;
  license_no: string | null;
  license_level: string | null;
  registered_on: string;
  note: string;
};

const slaId = (serial: number) => {
  const body = `SL26-${String(serial).padStart(6, "0")}`;
  return `${body}-${checkDigit(body)}`;
};

const base = {
  is_athlete: true, is_coach: false, club_name: null, academic_institution: null,
  license_no: null, license_level: null, registered_on: "2026-09-14", postal_id: null,
};

export const MOCK_MEMBERS: MockMember[] = [
  {
    ...base, slaa_id: slaId(901), status: "verified", nic: "199512300111", email: "verified@example.com",
    full_name: "Kasun Tharaka Perera", name_with_initials: "K. T. Perera", date_of_birth: "1995-05-03", gender: "M",
    district: "Colombo", phone: "+94712345678", club_name: "Sri Lanka Army Sports Club",
    note: "Verified: sees private details",
  },
  {
    ...base, slaa_id: slaId(902), status: "pending", nic: "200556701234", email: "pending@example.com",
    full_name: "Nadeesha Dilhani Silva", name_with_initials: "N. D. Silva", date_of_birth: "2005-03-08", gender: "F",
    district: "Kandy", phone: "+94771234567", academic_institution: "University of Peradeniya",
    note: "Pending: waiting for SLA",
  },
  {
    ...base, slaa_id: slaId(903), status: "verified", nic: null, postal_id: "PO123456", email: "coach@example.com",
    full_name: "Ruwan Kumara Jayasinghe", name_with_initials: "R. K. Jayasinghe", date_of_birth: "1988-05-02",
    gender: "M", district: "Galle", phone: "+94712223344", is_athlete: false, is_coach: true,
    license_no: "SLA-C-0042", license_level: "Level 2", note: "Verified coach",
  },
  {
    ...base, slaa_id: slaId(907), status: "verified", nic: null, email: "parent@example.com",
    full_name: "Sahan Malith Fernando", name_with_initials: "S. M. Fernando", date_of_birth: "2012-02-11", gender: "M",
    district: "Gampaha", phone: "+94775550101", club_name: "Sri Lanka Police Sports Club",
    note: "One email, two children (1 of 2)",
  },
  {
    ...base, slaa_id: slaId(908), status: "pending", nic: null, email: "parent@example.com",
    full_name: "Dulani Hansika Fernando", name_with_initials: "D. H. Fernando", date_of_birth: "2014-08-23", gender: "F",
    district: "Gampaha", phone: "+94775550101", note: "One email, two children (2 of 2)",
  },
  {
    ...base, slaa_id: slaId(904), status: "suspended", nic: "198812301234", email: "suspended@example.com",
    full_name: "Suspended Test Member", name_with_initials: "S. T. Member", date_of_birth: "1988-05-02", gender: "M",
    district: "Matara", phone: "+94770000004", note: "Suspended: cannot sign in",
  },
  {
    ...base, slaa_id: slaId(905), status: "merged", nic: "199020001234", email: "merged@example.com",
    full_name: "Merged Test Member", name_with_initials: "M. T. Member", date_of_birth: "1990-07-19", gender: "M",
    district: "Jaffna", phone: "+94770000005", note: "Merged: cannot sign in",
  },
];

type Code = {
  email: string; otp: string; purpose: "setup" | "reset"; attempts: number; expires: number;
  verified: number | null; ticket: string | null; used: boolean; created: number;
};

type Store = {
  users: Map<string, { password_hash: string | null }>;
  codes: Code[];
  sessions: Map<string, { email: string; expires: number }>;
  failures: { email: string; at: number }[];
};

const store: Store = ((globalThis as unknown as { memberMockV2?: Store }).memberMockV2 ??= {
  users: new Map(),
  codes: [],
  sessions: new Map(),
  failures: [],
} satisfies Store);

const HOUR = 3_600_000;
const clean = (email: string) => email.trim().toLowerCase();

// every mock record with an email is a user, as the trigger does for real registrations
for (const m of MOCK_MEMBERS) if (m.email && !store.users.has(m.email)) store.users.set(m.email, { password_hash: null });

const canSignIn = (email: string) =>
  store.users.has(email) && MOCK_MEMBERS.some((m) => m.email === email && (m.status === "pending" || m.status === "verified"));
const locked = (email: string) => store.failures.filter((f) => f.email === email && f.at > Date.now() - HOUR).length >= 10;
const fail = (email: string) => store.failures.push({ email, at: Date.now() });

function openSession(email: string, tokenHash: string) {
  store.sessions.set(tokenHash, { email, expires: Date.now() + 7 * 24 * HOUR });
}

function issueCode(email: string, otp: string, purpose: Code["purpose"]) {
  if (locked(email) || !canSignIn(email)) return false;
  if (store.codes.filter((c) => c.email === email && c.created > Date.now() - HOUR).length >= 5) return false;
  if (store.codes.some((c) => c.email === email && c.created > Date.now() - 60_000)) return false;
  for (const c of store.codes) if (c.email === email) c.used = true;
  store.codes.push({
    email, otp, purpose, attempts: 0, expires: Date.now() + 300_000, verified: null, ticket: null, used: false, created: Date.now(),
  });
  return true;
}

export function loginStart(raw: string, otp: string): { next_step: "password" | "code"; send_to: string | null } {
  const email = clean(raw);
  if (canSignIn(email) && store.users.get(email)?.password_hash) return { next_step: "password", send_to: null };
  return { next_step: "code", send_to: issueCode(email, otp, "setup") ? email : null };
}

export function resetRequest(raw: string, otp: string): string | null {
  const email = clean(raw);
  return issueCode(email, otp, "reset") ? email : null;
}

export function codeVerify(raw: string, otp: string, ticketHash: string): boolean {
  const email = clean(raw);
  if (locked(email)) return false;
  const c = store.codes.filter((x) => x.email === email && !x.used && !x.verified && x.expires > Date.now()).at(-1);
  if (!c || c.attempts >= 5) return false;
  if (c.otp !== otp) {
    c.attempts++;
    fail(email);
    return false;
  }
  if (!canSignIn(email)) return false;
  c.verified = Date.now();
  c.ticket = ticketHash;
  return true;
}

export function passwordSet(ticketHash: string, encoded: string, tokenHash: string): boolean {
  const c = store.codes.find((x) => x.ticket === ticketHash && !x.used && (x.verified ?? 0) > Date.now() - 15 * 60_000);
  if (!c) return false;
  c.used = true;
  if (!canSignIn(c.email)) return false;
  store.users.get(c.email)!.password_hash = encoded;
  for (const [token, s] of store.sessions) if (s.email === c.email) store.sessions.delete(token);
  openSession(c.email, tokenHash);
  return true;
}

export function passwordSalt(raw: string): string | null {
  const email = clean(raw);
  const hash = store.users.get(email)?.password_hash;
  return hash && canSignIn(email) && !locked(email) ? hash.split("$")[1] : null;
}

export function passwordSignIn(raw: string, derived: string, tokenHash: string): boolean {
  const email = clean(raw);
  if (locked(email) || !canSignIn(email)) return false;
  if (store.users.get(email)?.password_hash?.split("$")[2] !== derived) {
    fail(email);
    return false;
  }
  openSession(email, tokenHash);
  return true;
}

function sessionEmail(tokenHash: string) {
  const s = store.sessions.get(tokenHash);
  return s && s.expires > Date.now() && canSignIn(s.email) ? s.email : null;
}

export function session(tokenHash: string) {
  const email = sessionEmail(tokenHash);
  return email ? { email, has_password: !!store.users.get(email)?.password_hash } : null;
}

export function records(tokenHash: string) {
  const email = sessionEmail(tokenHash);
  return MOCK_MEMBERS
    .filter((m) => email && m.email === email && (m.status === "pending" || m.status === "verified"))
    .map((m) => ({
      slaa_id: m.slaa_id,
      status: m.status as "pending" | "verified",
      display_name: m.name_with_initials,
      details: m.status !== "verified" ? null : {
        full_name: m.full_name, name_with_initials: m.name_with_initials, date_of_birth: m.date_of_birth,
        gender: m.gender, district: m.district, phone: m.phone, email: m.email, nic: m.nic, postal_id: m.postal_id,
        is_athlete: m.is_athlete, is_coach: m.is_coach, club_name: m.club_name,
        academic_institution: m.academic_institution, license_no: m.license_no, license_level: m.license_level,
        registered_on: m.registered_on,
      },
    }));
}

export function changePassword(tokenHash: string, encoded: string): boolean {
  const email = sessionEmail(tokenHash);
  if (!email) return false;
  store.users.get(email)!.password_hash = encoded;
  for (const [token, s] of store.sessions) if (s.email === email && token !== tokenHash) store.sessions.delete(token);
  return true;
}

export function signOut(tokenHash: string) {
  store.sessions.delete(tokenHash);
}

const normId = (raw: string) => raw.replace(/\s/g, "").toUpperCase();
const NIC_SHAPE = /^([0-9]{9}[VX]|[0-9]{12})$/;
/** Mirrors web_auth.id_key: NIC may have spaces; Postal ID must be continuous. */
function idKey(raw: string): string | null {
  const id = normId(raw);
  if (!id || id.includes("@") || id.length > 40) return null;
  if (NIC_SHAPE.test(id)) return `nic:${id}`;
  if (/\s/.test(raw)) return null;
  if (!/^[A-Z0-9\u0D80-\u0DFF]+$/u.test(id)) return null;
  return `postal:${id}`;
}
const lookups: { key: string; at: number }[] = [];
export const MOCK_RESET_REQUESTS: { identifier: string; fullName: string; phone: string; newEmail: string; at: string }[] = [];

/** Same answers as web.member_identify: found, no_email, unknown or limited. */
export function identify(raw: string): { result: "found" | "no_email" | "unknown" | "limited"; email: string | null } {
  const key = idKey(raw);
  if (!key) return { result: "unknown", email: null };
  const id = key.startsWith("nic:") ? key.slice(4) : key.slice(7);
  if (lookups.filter((l) => l.key === id && l.at > Date.now() - HOUR).length >= 20) return { result: "limited", email: null };
  lookups.push({ key: id, at: Date.now() });
  const m = MOCK_MEMBERS.find(
    (x) =>
      (x.status === "pending" || x.status === "verified") &&
      (key.startsWith("nic:") ? x.nic === id : x.postal_id?.toUpperCase() === id),
  );
  if (!m) return { result: "unknown", email: null };
  return m.email ? { result: "found", email: m.email } : { result: "no_email", email: null };
}

export function emailResetRequest(r: { identifier: string; fullName: string; phone: string; newEmail: string }) {
  const phone = r.phone.replace(/[\s()-]/g, "");
  if (!idKey(r.identifier) || r.fullName.trim().length < 2 || !/^\+?[0-9]{9,15}$/.test(phone) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.newEmail))
    return "invalid" as const;
  MOCK_RESET_REQUESTS.push({ ...r, phone, at: new Date().toISOString() });
  return "received" as const;
}

// ─── Dashboard (in-memory) ───────────────────────────────────────────
// Enough sample data for /account after a mock sign-in. Mutations update
// this store until the server restarts.

type MockPrivacy = Partial<Record<"hide_profile" | "hide_club" | "hide_birth_year" | "hide_results", boolean>>;
type MockEvent = {
  code: string; priority: number; pb: string | null; pb_year: number | null;
  competition: string | null; verified: boolean; place: number | null; field: number | null;
  dist?: number[] | null;
};
type MockMark = {
  id: number; event: string; mark: string; year: number; competition: string | null;
  status: "pending" | "approved" | "rejected" | "withdrawn"; note: string | null; at: string;
};
type MockCoachLink = {
  link: number; coach_id: string; name: string; district: string;
  state: "active" | "awaiting" | "past"; primary: boolean; replaces: boolean;
  start_year: number | null; end_year: number | null;
};
type MockCoachView = {
  requests: {
    link: number; athlete_id: string; name: string; district: string; birth_year: number;
    replaces: boolean; since: string; events: string | null;
  }[];
  athletes: {
    link: number; athlete_id: string; full_name: string; name: string; date_of_birth: string; gender: "M" | "F";
    district: string; phone: string | null; email: string | null; status: string; primary: boolean;
    school: string | null; events: MockEvent[]; start_year?: number | null;
  }[];
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
export type MockDashboard = {
  slaa_id: string; is_athlete: boolean; is_coach: boolean; privacy: MockPrivacy;
  events: MockEvent[]; marks: MockMark[]; coaches: MockCoachLink[]; coach: MockCoachView | null;
};

const athleteId = slaId(901);
const pendingId = slaId(902);
const coachId = slaId(903);

const dashboards: Map<string, MockDashboard> = ((globalThis as unknown as { memberMockDash?: Map<string, MockDashboard> }).memberMockDash ??= new Map([
  [athleteId, {
    slaa_id: athleteId, is_athlete: true, is_coach: false, privacy: {},
    events: [
      { code: "100m", priority: 1, pb: "10.72", pb_year: 2025, competition: "National Trials", verified: true, place: 3, field: 18, dist: [10.55, 10.64, 10.72, 10.81, 10.88, 10.93, 11.02, 11.05, 11.1, 11.18, 11.24, 11.3, 11.41, 11.47, 11.56, 11.62, 11.8, 12.04] },
      { code: "200m", priority: 2, pb: "21.90", pb_year: 2024, competition: "Provincial Meet", verified: false, place: 7, field: 11, dist: [21.2, 21.45, 21.52, 21.6, 21.71, 21.84, 21.9, 22.15, 22.3, 22.62, 23.1] },
    ],
    marks: [
      { id: 1, event: "100m", mark: "10.68", year: 2026, competition: "Club Meet", status: "pending", note: null, at: "2026-10-12" },
      { id: 2, event: "100m", mark: "10.88", year: 2024, competition: "Junior Nationals", status: "approved", note: null, at: "2024-08-02" },
      { id: 3, event: "100m", mark: "11.05", year: 2023, competition: "Schools Meet", status: "approved", note: null, at: "2023-07-15" },
      { id: 4, event: "200m", mark: "22.40", year: 2023, competition: "Schools Meet", status: "approved", note: null, at: "2023-07-15" },
    ],
    coaches: [
      { link: 11, coach_id: coachId, name: "R. K. Jayasinghe", district: "Galle", state: "active", primary: true, replaces: false, start_year: 2024, end_year: null },
    ],
    coach: null,
  }],
  [pendingId, {
    slaa_id: pendingId, is_athlete: true, is_coach: false, privacy: { hide_profile: true },
    events: [], marks: [], coaches: [], coach: null,
  }],
  [coachId, {
    slaa_id: coachId, is_athlete: false, is_coach: true, privacy: {},
    events: [], marks: [], coaches: [],
    coach: {
      requests: [
        { link: 21, athlete_id: pendingId, name: "N. D. Silva", district: "Kandy", birth_year: 2005, replaces: false, since: "2026-10-20", events: "800m" },
      ],
      athletes: ([
        {
          link: 11, athlete_id: athleteId, full_name: "Kasun Tharaka Perera", name: "K. T. Perera",
          date_of_birth: "1995-05-03", gender: "M", district: "Colombo", phone: "+94712345678",
          email: "verified@example.com", status: "verified", primary: true, school: null, start_year: 2021,
          events: [
            { code: "100m", priority: 1, pb: "10.72", pb_year: 2025, competition: "National Trials", verified: true, place: 3, field: 18 },
          ],
        },
      ] as MockCoachView["athletes"]).concat(([
        ["SL26-000911-0", "Imesha Kaushalya Fernando", "I. K. Fernando", "2004-02-11", "F", "Galle", "LJ", "6.12", 2, 14],
        ["SL26-000912-8", "Tharindu Lakshan Silva", "T. L. Silva", "2006-07-21", "M", "Matara", "400m", "48.90", 5, 16],
        ["SL26-000913-6", "Dilshan Madushanka", "D. Madushanka", "2003-11-02", "M", "Galle", "JT", "68.40", 1, 9],
        ["SL26-000914-4", "Nethmi Sandunika Perera", "N. S. Perera", "2007-05-30", "F", "Colombo", "100m", "12.08", 9, 20],
        ["SL26-000915-1", "Ravindu Hasaranga", "R. Hasaranga", "2005-09-14", "M", "Kalutara", "800m", "1:53.80", 4, 12],
      ] as const).map(([id, full, short, dob, gender, district, code, pb, place, field], i) => ({
        link: 40 + i, athlete_id: id, full_name: full, name: short, date_of_birth: dob, gender, district,
        phone: null, email: null, status: "verified", primary: true, school: null, start_year: 2022 + (i % 4),
        events: [{ code, priority: 1, pb, pb_year: 2025, competition: null, verified: i % 2 === 0, place, field }],
      }))),
      marks: [
        { id: 1, athlete_id: athleteId, name: "K. T. Perera", event: "100m", mark: "10.68", year: 2026, competition: "Club Meet", previous: "10.72" },
      ],
      past: [
        { link: 60, athlete_id: "SL26-000921-9", name: "S. Wijesinghe", district: "Galle", start_year: 2022, end_year: null,
          confirmed: false, listed_by: "athlete", events: [{ code: "200m", pb: "22.10", verified: false }] },
        { link: 61, athlete_id: "SL26-000922-7", name: "A. M. Bandara", district: "Galle", start_year: 2016, end_year: 2021,
          confirmed: true, listed_by: "coach", events: [{ code: "LJ", pb: "7.21", verified: true }, { code: "TJ", pb: "15.02", verified: true }] },
        { link: 62, athlete_id: "SL26-000923-5", name: "H. D. Rathnayake", district: "Matara", start_year: 2018, end_year: 2023,
          confirmed: true, listed_by: "athlete", events: [{ code: "400m", pb: "47.85", verified: true }] },
      ],
      past_count: 3,
    },
  }],
]));

let nextMarkId = 100;
let nextLinkId = 100;

function ownedBoard(tokenHash: string, slaaId: string) {
  const email = sessionEmail(tokenHash);
  if (!email) return null;
  const member = MOCK_MEMBERS.find((m) => m.slaa_id === slaaId && m.email === email && (m.status === "pending" || m.status === "verified"));
  if (!member) return null;
  return dashboards.get(slaaId) ?? null;
}

export function dashboard(tokenHash: string, slaaId: string): MockDashboard | null {
  return ownedBoard(tokenHash, slaaId);
}

export function setPrivacy(tokenHash: string, slaaId: string, privacy: MockPrivacy) {
  const d = ownedBoard(tokenHash, slaaId);
  if (!d) return false;
  d.privacy = { ...privacy };
  return true;
}

export function submitMark(tokenHash: string, slaaId: string, event: string, mark: string, year: number, competition: string) {
  const d = ownedBoard(tokenHash, slaaId);
  if (!d?.is_athlete || !event || !mark || year < 1990) return "invalid" as const;
  const id = ++nextMarkId;
  d.marks.unshift({
    id, event, mark, year, competition: competition || null, status: "pending", note: null,
    at: new Date().toISOString().slice(0, 10),
  });
  return "ok" as const;
}

export function withdrawMark(tokenHash: string, slaaId: string, id: number) {
  const d = ownedBoard(tokenHash, slaaId);
  const row = d?.marks.find((m) => m.id === id && m.status === "pending");
  if (!row) return false;
  row.status = "withdrawn";
  return true;
}

export function coachSearch(tokenHash: string, query: string) {
  if (!sessionEmail(tokenHash) || query.trim().length < 2) return [];
  const q = query.trim().toLowerCase();
  return MOCK_MEMBERS
    .filter((m) => m.is_coach && (m.status === "pending" || m.status === "verified")
      && (m.slaa_id.toLowerCase().includes(q) || m.full_name.toLowerCase().includes(q) || m.name_with_initials.toLowerCase().includes(q)))
    .map((m) => ({
      slaa_id: m.slaa_id, name: m.name_with_initials, district: m.district,
      disciplines: ["100m", "200m"], verified: m.status === "verified",
    }));
}

export function requestCoach(tokenHash: string, slaaId: string, coachSlaaId: string, replace: boolean) {
  const d = ownedBoard(tokenHash, slaaId);
  if (!d?.is_athlete) return "unknown" as const;
  if (slaaId === coachSlaaId) return "self" as const;
  const coach = MOCK_MEMBERS.find((m) => m.slaa_id === coachSlaaId && m.is_coach);
  if (!coach) return "unknown" as const;
  if (d.coaches.some((c) => c.coach_id === coachSlaaId && c.state !== "past")) return "already" as const;
  const link = ++nextLinkId;
  d.coaches.push({
    link, coach_id: coachSlaaId, name: coach.name_with_initials, district: coach.district,
    state: "awaiting", primary: replace || d.coaches.every((c) => c.state === "past"), replaces: replace,
    start_year: null, end_year: null,
  });
  return "ok" as const;
}

export function cancelCoachRequest(tokenHash: string, slaaId: string, link: number) {
  const d = ownedBoard(tokenHash, slaaId);
  if (!d) return false;
  const before = d.coaches.length;
  d.coaches = d.coaches.filter((c) => !(c.link === link && c.state === "awaiting"));
  return d.coaches.length < before;
}

export function decideLink(tokenHash: string, coachSlaaId: string, link: number, accept: boolean) {
  const d = ownedBoard(tokenHash, coachSlaaId);
  const past = d?.coach?.past?.find((p) => p.link === link && !p.confirmed);
  if (d?.coach && past) {
    if (accept) past.confirmed = true;
    else d.coach.past = d.coach.past!.filter((p) => p.link !== link);
    return true;
  }
  const req = d?.coach?.requests.find((r) => r.link === link);
  if (!d?.coach || !req) return false;
  d.coach.requests = d.coach.requests.filter((r) => r.link !== link);
  if (accept) {
    d.coach.athletes.push({
      link, athlete_id: req.athlete_id, full_name: req.name, name: req.name,
      date_of_birth: `${req.birth_year}-01-01`, gender: "F", district: req.district,
      phone: null, email: null, status: "pending", primary: true, school: null, events: [],
    });
  }
  return true;
}

export function decideMark(tokenHash: string, coachSlaaId: string, id: number, accept: boolean, note: string) {
  const d = ownedBoard(tokenHash, coachSlaaId);
  if (!d?.coach) return false;
  const before = d.coach.marks.length;
  d.coach.marks = d.coach.marks.filter((m) => m.id !== id);
  if (d.coach.marks.length === before) return false;
  const athlete = dashboards.get(athleteId);
  const mark = athlete?.marks.find((m) => m.id === id);
  if (mark) {
    mark.status = accept ? "approved" : "rejected";
    mark.note = note || null;
  }
  return true;
}

export function confirmPb(tokenHash: string, coachSlaaId: string, athleteSlaaId: string, event: string) {
  const d = ownedBoard(tokenHash, coachSlaaId);
  if (!d?.coach?.athletes.some((a) => a.athlete_id === athleteSlaaId)) return false;
  const athlete = dashboards.get(athleteSlaaId);
  const row = athlete?.events.find((e) => e.code === event);
  if (!row) return false;
  row.verified = true;
  return true;
}
