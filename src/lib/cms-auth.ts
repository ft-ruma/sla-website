import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "./db";
import { derive, encodePassword } from "./password";

// Sign-in for website editors (/admin). Separate from member sign-in and from
// the registration portal's staff. Sessions last 12 hours, are random tokens
// in an HttpOnly cookie, and are stored only as HMACs (db/cms.sql).

const PRODUCTION = process.env.NODE_ENV === "production";
const COOKIE = PRODUCTION ? "__Host-sla_cms" : "sla_cms";
const SESSION_SECONDS = 12 * 60 * 60;

export type Editor = { id: string; email: string; display_name: string; role: "owner" | "editor"; must_change_password: boolean };

function secret() {
  const value = process.env.CMS_SECRET || process.env.MEMBER_AUTH_SECRET;
  return value && value.length >= 32 ? value : null;
}

export const cmsAvailable = () => sql !== null && secret() !== null;

const hmac = (token: string) => createHmac("sha256", secret()!).update(`cms-session\n${token}`).digest("hex");

export async function tokenHash() {
  if (!cmsAvailable()) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? hmac(token) : null;
}

export async function currentEditor(): Promise<Editor | null> {
  const hash = await tokenHash();
  if (!hash || !sql) return null;
  const [row] = await sql<Editor[]>`SELECT * FROM web.cms_session(${hash})`.catch(() => []);
  return row ?? null;
}

/** The signed-in editor, or off to the sign-in page. New accounts must set a password first. */
export async function requireEditor(opts: { owner?: boolean; allowPasswordChange?: boolean } = {}) {
  const editor = await currentEditor();
  if (!editor) redirect("/admin/login");
  if (editor.must_change_password && !opts.allowPasswordChange) redirect("/admin/account?first=1");
  if (opts.owner && editor.role !== "owner") redirect("/admin");
  return { editor, hash: (await tokenHash())! };
}

export async function signIn(email: string, password: string) {
  if (!cmsAvailable() || !sql) return false;
  const [row] = await sql<{ salt: string | null }[]>`SELECT web.cms_password_salt(${email}) AS salt`;
  // hash even without a salt so an unknown email takes as long as a wrong password
  const derived = await derive(password, row?.salt ?? randomBytes(16).toString("hex"));
  if (!row?.salt) return false;
  const token = randomBytes(32).toString("base64url");
  const [ok] = await sql<{ ok: boolean }[]>`SELECT web.cms_sign_in(${email}, ${derived}, ${hmac(token)}) AS ok`;
  if (!ok?.ok) return false;
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: PRODUCTION, sameSite: "lax", path: "/", maxAge: SESSION_SECONDS });
  return true;
}

export async function signOut() {
  const hash = await tokenHash();
  if (hash && sql) await sql`SELECT web.cms_sign_out(${hash})`.catch(() => null);
  (await cookies()).set(COOKIE, "", { httpOnly: true, secure: PRODUCTION, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function changeOwnPassword(password: string) {
  const hash = await tokenHash();
  if (!hash || !sql) return false;
  const [row] = await sql<{ ok: boolean }[]>`SELECT web.cms_change_password(${hash}, ${await encodePassword(password)}) AS ok`;
  return row?.ok === true;
}

export { encodePassword };
