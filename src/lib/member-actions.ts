"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Dict } from "./dict/en";
import { DEFAULT_LANG, getDict, isLang } from "./i18n";
import { sendCode, type CodePurpose } from "./mail";
import * as auth from "./member-auth";
import { MOCK } from "./member-mock";

type Message = keyof Dict;

/** Shown on screen in mock mode only, since no real email is sent. */
type TestCode = { code: string; email: string } | null;

// The state goes to the browser, so it holds only what the member typed
// (`id`: an email, NIC or Postal ID) and what may be shown (`shown`: the
// email they typed, or the masked email on their registration). The full
// registered email is looked up again on the server at every step.
type Who = { id: string; shown: string; masked: boolean };

export type SignInState =
  | { step: "email"; error?: Message; id?: string }
  | ({ step: "password"; error?: Message } & Who)
  | ({ step: "code"; purpose: CodePurpose; error?: Message; resent?: boolean; test?: TestCode; sentAt?: number } & Who)
  | ({ step: "newPassword"; purpose: CodePurpose; error?: Message } & Who)
  | { step: "reset"; id: string; error?: Message; fullName?: string; phone?: string; newEmail?: string }
  | { step: "resetSent" };

export type FormState = { error?: Message; ok?: boolean };

const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Shape check only: NIC may include spaces; Postal ID must not. */
const NIC_SHAPE = /^([0-9]{9}[VX]|[0-9]{12})$/;
/** Postal ID: continuous English/Sinhala letters and digits (length not fixed). */
const POSTAL_SHAPE = /^[A-Z0-9\u0D80-\u0DFF]+$/u;

function langOf(form: FormData) {
  const lang = field(form, "lang");
  return isLang(lang) ? lang : DEFAULT_LANG;
}

async function guarded<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (e) {
    console.error("member sign-in failed", (e as Error).message);
    return fallback;
  }
}

function passwordProblem(password: string, confirm: string): Message | null {
  if (password.length < 10 || password.length > 200) return "passwordLength";
  if (password !== confirm) return "passwordMismatch";
  return null;
}

/** HMAC of the visitor's address, for counting NIC lookups per connection. */
async function client() {
  const h = await headers();
  const address = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  return auth.clientKey(address);
}

/**
 * The email to sign in with. An email is used as typed; a NIC or Postal ID
 * is looked up, and only a masked form of the result goes back to the screen.
 */
async function resolve(id: string): Promise<{ email: string; who: Who } | { error: Message }> {
  if (id.includes("@")) {
    const email = auth.cleanEmail(id);
    if (!EMAIL.test(email) || email.length > 254) return { error: "signInIdInvalid" };
    return { email, who: { id: email, shown: email, masked: false } };
  }
  const compact = id.replace(/\s/g, "").toUpperCase();
  if (compact.length < 5 || id.length > 40) return { error: "signInIdInvalid" };
  const asNic = NIC_SHAPE.test(compact);
  // Postal ID must be typed continuously (no spaces), e.g. CMT13021.
  // NIC may still include spaces. Reject a spaced non-NIC as invalid, not unknown.
  if (/\s/.test(id) && !asNic) return { error: "signInIdInvalid" };
  if (!asNic && !POSTAL_SHAPE.test(compact)) return { error: "signInIdInvalid" };
  const found = await auth.identify(id, await client());
  if (found.result === "found") return { email: found.email, who: { id, shown: auth.maskEmail(found.email), masked: true } };
  return { error: found.result === "no_email" ? "signInNoEmail" : found.result === "limited" ? "signInLimited" : "signInIdUnknown" };
}

/**
 * Emails the code when there is one. For an email typed in, the screen says
 * "check your email" either way, so nobody can use this form to find out
 * which addresses are registered.
 */
async function deliver(send: auth.CodeToSend, purpose: CodePurpose, lang: string): Promise<"sent" | "mailFailed"> {
  if (!send) return "sent";
  return (await sendCode(send.email, send.code, purpose, getDict(isLang(lang) ? lang : DEFAULT_LANG))) ? "sent" : "mailFailed";
}

export async function signInStep(state: SignInState, form: FormData): Promise<SignInState> {
  const lang = langOf(form);
  const intent = field(form, "intent");
  const id = (field(form, "identifier") || ("id" in state ? state.id ?? "" : "")).slice(0, 254);

  if (intent === "back") return { step: "email", id };
  if (intent === "resetForm") return { step: "reset", id: id.includes("@") ? "" : id };
  if (!auth.memberSignInAvailable()) return { step: "email", id, error: "signInUnavailable" };

  // "I cannot open this email": a request for staff to phone the member.
  if (intent === "resetRequest") {
    const request = {
      identifier: id,
      fullName: field(form, "fullName").slice(0, 150),
      phone: field(form, "phone").slice(0, 30),
      newEmail: auth.cleanEmail(field(form, "newEmail")).slice(0, 254),
    };
    const back = { step: "reset" as const, id, fullName: request.fullName, phone: request.phone, newEmail: request.newEmail };
    if (!id || id.includes("@") || !request.fullName || !request.phone || !EMAIL.test(request.newEmail))
      return { ...back, error: "emailResetInvalid" };
    const result = await guarded(async () => auth.emailResetRequest(request, await client()), null);
    if (!result) return { ...back, error: "signInUnavailable" };
    if (result === "invalid") return { ...back, error: "emailResetInvalid" };
    if (result === "limited") return { ...back, error: "signInLimited" };
    return { step: "resetSent" };
  }

  // Setting the password needs only the ticket cookie from a correct code.
  if (intent === "setPassword") {
    const who = state.step === "newPassword" ? { id: state.id, shown: state.shown, masked: state.masked } : null;
    const purpose: CodePurpose = state.step === "newPassword" ? state.purpose : "setup";
    if (!who) return { step: "email", id };
    const password = String(form.get("password") ?? "");
    const problem = passwordProblem(password, String(form.get("confirm") ?? ""));
    if (problem) return { step: "newPassword", purpose, ...who, error: problem };
    const ok = await guarded(() => auth.setPasswordWithTicket(password), false);
    if (!ok) return { step: "email", id, error: "signInSetupExpired" };
    redirect(`/${lang}/account`);
  }

  if (!id) return { step: "email", id, error: "signInIdInvalid" };
  const found = await guarded(() => resolve(id), { error: "signInUnavailable" as Message });
  if ("error" in found) return { step: "email", id, error: found.error };
  const { email, who } = found;

  // 1. Identified: password screen, or a setup code for first sign-in.
  if (intent === "start") {
    const result = await guarded(async () => {
      const r = await auth.loginStart(email);
      return { ...r, outcome: r.next === "code" ? await deliver(r.send, "setup", lang) : "sent" };
    }, null);
    if (!result) return { step: "email", id, error: "signInUnavailable" };
    if (result.outcome === "mailFailed") return { step: "email", id, error: "signInMailFailed" };
    if (result.next === "password") return { step: "password", ...who };
    return { step: "code", purpose: "setup", ...who, test: MOCK ? result.send : undefined, sentAt: Date.now() };
  }

  // Forgot password, or "send a new code" on the code screen.
  if (intent === "forgot" || intent === "resend") {
    const purpose: CodePurpose = intent === "forgot" || (state.step === "code" && state.purpose === "reset") ? "reset" : "setup";
    const result = await guarded(async () => {
      const send = purpose === "reset" ? await auth.passwordResetRequest(email) : (await auth.loginStart(email)).send;
      return { send, outcome: await deliver(send, purpose, lang) };
    }, null);
    if (!result) return { step: "email", id, error: "signInUnavailable" };
    if (result.outcome === "mailFailed") return { step: "email", id, error: "signInMailFailed" };
    return { step: "code", purpose, ...who, resent: intent === "resend", test: MOCK ? result.send : undefined, sentAt: Date.now() };
  }

  if (intent === "password") {
    const password = String(form.get("password") ?? "");
    if (!password) return { step: "password", ...who, error: "signInMissing" };
    const ok = await guarded(() => auth.passwordSignIn(email, password.slice(0, 200)), false);
    if (!ok) return { step: "password", ...who, error: "signInPasswordWrong" };
    redirect(`/${lang}/account`);
  }

  if (intent === "code") {
    const purpose: CodePurpose = state.step === "code" ? state.purpose : "setup";
    const code = field(form, "code").replace(/\s/g, "");
    const ok = /^\d{6}$/.test(code) && (await guarded(() => auth.verifyCode(email, code), false));
    if (!ok) return { step: "code", purpose, ...who, error: "signInCodeWrong" };
    return { step: "newPassword", purpose, ...who };
  }

  return { step: "email", id };
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  const problem = passwordProblem(password, String(form.get("confirm") ?? ""));
  if (problem) return { error: problem };
  const ok = await guarded(() => auth.changePassword(password), false);
  if (!ok) redirect(`/${langOf(form)}/sign-in`);
  return { ok: true };
}

export async function signOut(form: FormData) {
  await guarded(() => auth.signOut(), undefined);
  redirect(`/${langOf(form)}/sign-in`);
}
