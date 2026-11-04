"use server";

import { redirect } from "next/navigation";
import { DEFAULT_LANG, isLang } from "./i18n";
import * as d from "./member-dashboard";
import { isValidSlaaId } from "./slaa-id";

// Dashboard forms. Each one acts on one of the signed-in member's records
// (the database checks it is theirs), then returns to the dashboard with a
// short message that the page shows above that record.

export type DashMessage =
  | "privacySaved" | "markSent" | "markInvalid" | "markLimited" | "markWithdrawn"
  | "coachRequested" | "coachUnknown" | "coachSelf" | "coachAlready" | "coachLimited" | "coachCancelled"
  | "linkAccepted" | "linkDeclined" | "pastConfirmed" | "pastDeclined" | "markApproved" | "markRejected" | "pbConfirmed" | "failed";

const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

function back(form: FormData, message: DashMessage, slaaId: string): never {
  const lang = field(form, "lang");
  const target = `/${isLang(lang) ? lang : DEFAULT_LANG}/account?msg=${message}&r=${encodeURIComponent(slaaId)}#r-${slaaId}`;
  redirect(target);
}

/** The record this form is about, or back to the dashboard. */
function record(form: FormData) {
  const id = field(form, "slaaId").toUpperCase();
  if (!isValidSlaaId(id)) back(form, "failed", "");
  return id;
}

async function attempt<T>(form: FormData, slaaId: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    console.error("dashboard action failed", (e as Error).message);
    back(form, "failed", slaaId);
  }
}

export async function savePrivacy(form: FormData) {
  const id = record(form);
  const privacy = Object.fromEntries(d.PRIVACY_KEYS.map((k) => [k, form.get(k) === "on"]));
  const ok = await attempt(form, id, () => d.setPrivacy(id, privacy));
  back(form, ok ? "privacySaved" : "failed", id);
}

export async function sendMark(form: FormData) {
  const id = record(form);
  const mark = field(form, "mark").replace(",", ".");
  const year = Number(field(form, "year"));
  const result = await attempt(form, id, () =>
    d.submitMark(id, field(form, "event"), mark, Number.isInteger(year) ? year : 0, field(form, "competition").slice(0, 120)));
  back(form, result === "ok" ? "markSent" : result === "limited" ? "markLimited" : "markInvalid", id);
}

export async function withdrawMark(form: FormData) {
  const id = record(form);
  const ok = await attempt(form, id, () => d.withdrawMark(id, Number(field(form, "markId"))));
  back(form, ok ? "markWithdrawn" : "failed", id);
}

export async function requestCoach(form: FormData) {
  const id = record(form);
  const result = await attempt(form, id, () =>
    d.requestCoach(id, field(form, "coachId"), field(form, "mode") === "replace"));
  back(form, ({
    ok: "coachRequested", unknown: "coachUnknown", self: "coachSelf", already: "coachAlready", limited: "coachLimited",
  } as const)[result], id);
}

export async function cancelCoachRequest(form: FormData) {
  const id = record(form);
  const ok = await attempt(form, id, () => d.cancelCoachRequest(id, Number(field(form, "link"))));
  back(form, ok ? "coachCancelled" : "failed", id);
}

export async function decideLink(form: FormData) {
  const id = record(form);
  const accept = field(form, "decision") === "accept";
  const past = field(form, "past") === "1";
  const ok = await attempt(form, id, () => d.decideLink(id, Number(field(form, "link")), accept));
  back(form, !ok ? "failed" : past ? (accept ? "pastConfirmed" : "pastDeclined") : accept ? "linkAccepted" : "linkDeclined", id);
}

export async function decideMark(form: FormData) {
  const id = record(form);
  const accept = field(form, "decision") === "accept";
  const ok = await attempt(form, id, () =>
    d.decideMark(id, Number(field(form, "markId")), accept, field(form, "note").slice(0, 500)));
  back(form, !ok ? "failed" : accept ? "markApproved" : "markRejected", id);
}

export async function confirmPb(form: FormData) {
  const id = record(form);
  const ok = await attempt(form, id, () =>
    d.confirmPb(id, field(form, "athleteId").toUpperCase(), field(form, "event")));
  back(form, ok ? "pbConfirmed" : "failed", id);
}
