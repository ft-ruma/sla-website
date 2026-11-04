import "server-only";
import { createHmac, randomBytes, randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { sql } from "./db";
import { derive, encodePassword } from "./password";
import * as mock from "./member-mock";
import { MOCK } from "./member-mock";

// Member sign-in by email, backed by the functions in db/member_auth.sql. The
// database decides who may sign in; this file only hashes secrets and keeps
// the cookies.

const PRODUCTION = process.env.NODE_ENV === "production";
const COOKIE = PRODUCTION ? "__Host-sla_member" : "sla_member";
// Set after a correct code; lets this browser choose the password.
const SETUP_COOKIE = PRODUCTION ? "__Host-sla_member_setup" : "sla_member_setup";
const SESSION_SECONDS = 7 * 24 * 60 * 60; // same as web_auth.open_session
const SETUP_SECONDS = 15 * 60; // same as web.member_password_set

export type MemberSession = { email: string; has_password: boolean };

export type MemberDetails = {
  full_name: string;
  name_with_initials: string | null;
  date_of_birth: string;
  gender: "M" | "F";
  district: string;
  phone: string | null;
  email: string | null;
  nic: string | null;
  postal_id: string | null;
  is_athlete: boolean;
  is_coach: boolean;
  club_name: string | null;
  academic_institution: string | null;
  license_no: string | null;
  license_level: string | null;
  registered_on: string;
};

/** One registration on the signed-in email. Details stay null until SLA verifies it. */
export type MemberRecord = {
  slaa_id: string;
  status: "pending" | "verified";
  display_name: string;
  details: MemberDetails | null;
};

function secret() {
  const value = process.env.MEMBER_AUTH_SECRET;
  if (value && value.length >= 32) return value;
  return MOCK ? "mock-mode-secret-for-local-testing-only" : null;
}

export const memberSignInAvailable = () => MOCK || (sql !== null && secret() !== null);

function db() {
  if (!sql || !secret()) throw new Error("Member sign-in needs WEB_DATABASE_URL and a MEMBER_AUTH_SECRET of 32+ characters");
  return sql;
}

const hmac = (...parts: string[]) => createHmac("sha256", secret()!).update(parts.join("\n")).digest("hex");

export const cleanEmail = (email: string) => email.trim().toLowerCase();
const otpHash = (email: string, code: string) => hmac("otp", cleanEmail(email), code);
const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");
const newToken = () => randomBytes(32).toString("base64url");

async function setCookie(name: string, value: string, maxAge: number) {
  (await cookies()).set(name, value, { httpOnly: true, secure: PRODUCTION, sameSite: "lax", path: "/", maxAge });
}

/** Rate-limit key for a connection: an HMAC, so the address itself is never stored. */
export const clientKey = (address: string) => hmac("client", address);

export { maskEmail } from "./mask";

export type Identified =
  | { result: "found"; email: string }
  | { result: "no_email" | "unknown" | "limited" };

/** The email on the registration with this NIC or Postal ID. Counted for rate limiting. */
export async function identify(identifier: string, client: string): Promise<Identified> {
  const row = MOCK
    ? mock.identify(identifier)
    : (await db()<{ result: Identified["result"]; email: string | null }[]>`
        SELECT result, email FROM web.member_identify(${identifier}, ${client})`)[0];
  if (row?.result === "found" && row.email) return { result: "found", email: row.email };
  return { result: row?.result === "found" ? "unknown" : (row?.result ?? "unknown") } as Identified;
}

export type EmailResetRequest = { identifier: string; fullName: string; phone: string; newEmail: string };

/** Files a request for staff to change the registered email after a phone call. */
export async function emailResetRequest(r: EmailResetRequest, client: string): Promise<"received" | "invalid" | "limited"> {
  if (MOCK) return mock.emailResetRequest(r);
  const [row] = await db()<{ result: "received" | "invalid" | "limited" }[]>`
    SELECT web.member_email_reset_request(${r.identifier}, ${r.fullName}, ${r.phone}, ${cleanEmail(r.newEmail)}, ${client}) AS result`;
  return row?.result ?? "invalid";
}

/** A code to email, or null when nothing should be sent (the screen looks the same either way). */
export type CodeToSend = { email: string; code: string } | null;

/**
 * First step of sign-in. An email that already has a password goes to the
 * password screen. Otherwise a setup code is stored if the email may sign in.
 */
export async function loginStart(email: string): Promise<{ next: "password" | "code"; send: CodeToSend }> {
  const code = newCode();
  const row = MOCK
    ? mock.loginStart(email, otpHash(email, code))
    : (await db()<{ next_step: "password" | "code"; send_to: string | null }[]>`
        SELECT next_step, send_to FROM web.member_login_start(${email}, ${otpHash(email, code)})`)[0];
  return { next: row?.next_step ?? "code", send: row?.send_to ? { email: row.send_to, code } : null };
}

/** Forgot password: stores a reset code if the email may sign in. */
export async function passwordResetRequest(email: string): Promise<CodeToSend> {
  const code = newCode();
  const to = MOCK
    ? mock.resetRequest(email, otpHash(email, code))
    : (await db()<{ send_to: string | null }[]>`
        SELECT web.member_password_reset_request(${email}, ${otpHash(email, code)}) AS send_to`)[0]?.send_to;
  return to ? { email: to, code } : null;
}

/** A correct code lets this browser set a password for the next 15 minutes. */
export async function verifyCode(email: string, code: string) {
  const ticket = newToken();
  const ticketHash = hmac("ticket", ticket);
  const ok = MOCK
    ? mock.codeVerify(email, otpHash(email, code), ticketHash)
    : (await db()<{ ok: boolean }[]>`
        SELECT web.member_code_verify(${email}, ${otpHash(email, code)}, ${ticketHash}) AS ok`)[0]?.ok === true;
  if (ok) await setCookie(SETUP_COOKIE, ticket, SETUP_SECONDS);
  return ok;
}

export async function hasSetupTicket() {
  return !!(await cookies()).get(SETUP_COOKIE)?.value;
}

/** Saves the password chosen after a correct code and signs in. */
export async function setPasswordWithTicket(password: string) {
  const ticket = (await cookies()).get(SETUP_COOKIE)?.value;
  if (!ticket) return false;
  const encoded = await encodePassword(password);
  const token = newToken();
  const tokenHash = hmac("session", token);
  const ticketHash = hmac("ticket", ticket);
  const ok = MOCK
    ? mock.passwordSet(ticketHash, encoded, tokenHash)
    : (await db()<{ ok: boolean }[]>`
        SELECT web.member_password_set(${ticketHash}, ${encoded}, ${tokenHash}) AS ok`)[0]?.ok === true;
  await setCookie(SETUP_COOKIE, "", 0);
  if (ok) await setCookie(COOKIE, token, SESSION_SECONDS);
  return ok;
}

export async function passwordSignIn(email: string, password: string) {
  const salt = MOCK
    ? mock.passwordSalt(email)
    : ((await db()<{ salt: string | null }[]>`SELECT web.member_password_salt(${email}) AS salt`)[0]?.salt ?? null);
  // Hash even without a salt so a missing password takes as long as a wrong one.
  const derived = await derive(password, salt ?? randomBytes(16).toString("hex"));
  if (!salt) return false;
  const token = newToken();
  const tokenHash = hmac("session", token);
  const ok = MOCK
    ? mock.passwordSignIn(email, derived, tokenHash)
    : (await db()<{ ok: boolean }[]>`
        SELECT web.member_password_sign_in(${email}, ${derived}, ${tokenHash}) AS ok`)[0]?.ok === true;
  if (ok) await setCookie(COOKIE, token, SESSION_SECONDS);
  return ok;
}

export async function sessionHash() {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? hmac("session", token) : null;
}

/** The signed-in user, or null. Users with no pending or verified record have no session. */
export async function currentMember(): Promise<MemberSession | null> {
  if (!memberSignInAvailable()) return null;
  const hash = await sessionHash();
  if (!hash) return null;
  if (MOCK) return mock.session(hash);
  const rows = await db()<MemberSession[]>`SELECT email, has_password FROM web.member_session(${hash})`;
  return rows[0] ?? null;
}

type RecordRow = Omit<MemberRecord, "details"> & Omit<MemberDetails, "registered_on"> & { registered_on: string };

/** Every pending or verified registration with the signed-in email. */
export async function memberRecords(): Promise<MemberRecord[]> {
  const hash = await sessionHash();
  if (!hash || !memberSignInAvailable()) return [];
  if (MOCK) return mock.records(hash);
  const rows = await db()<RecordRow[]>`
    SELECT slaa_id, status, display_name, full_name, name_with_initials, date_of_birth::text AS date_of_birth,
           gender, district, phone, email, nic::text AS nic, postal_id, is_athlete, is_coach, club_name,
           academic_institution, license_no, license_level,
           to_char(registered_at AT TIME ZONE 'Asia/Colombo', 'YYYY-MM-DD') AS registered_on
    FROM web.member_records(${hash})`;
  return rows.map(({ slaa_id, status, display_name, ...details }) => ({
    slaa_id, status, display_name, details: status === "verified" ? details : null,
  }));
}

export async function changePassword(password: string) {
  const hash = await sessionHash();
  if (!hash) return false;
  const encoded = await encodePassword(password);
  if (MOCK) return mock.changePassword(hash, encoded);
  const [row] = await db()<{ ok: boolean }[]>`SELECT web.member_change_password(${hash}, ${encoded}) AS ok`;
  return row?.ok === true;
}

export async function signOut() {
  const hash = await sessionHash();
  if (hash && MOCK) mock.signOut(hash);
  else if (hash && memberSignInAvailable()) await db()`SELECT web.member_sign_out(${hash})`;
  await setCookie(COOKIE, "", 0);
}
