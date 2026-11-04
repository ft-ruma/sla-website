"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { PageKey } from "@/content";
import type { InfoPage } from "@/content/pages";
import type {
  Competition, CompetitionCategory, Download, EventResults, NationalRecord, NewsCategory, NewsItem, RankingList, SiteSettings,
} from "@/content/types";
import * as cms from "@/lib/cms-admin";
import { changeOwnPassword, encodePassword, requireEditor, signIn, signOut } from "@/lib/cms-auth";
import { DISTRICTS } from "@/lib/districts";
import { EVENTS } from "@/lib/events";
import type { L10n } from "@/lib/i18n";
import { parseMarkInput, parseRows } from "@/lib/mark-input";

// Every form in /admin. Each one checks the editor, validates, saves through
// the database functions, refreshes the public site and returns with a
// message (?msg=…, and ?err=… listing anything that could not be read).

const field = (form: FormData, name: string, max = 500) => String(form.get(name) ?? "").trim().slice(0, max);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EVENT_CODES = EVENTS.map((e) => e.code);

/** The three languages of a field. Sinhala and Tamil fall back to English when left empty. */
function l10n(form: FormData, name: string, max = 500): L10n {
  const en = field(form, `${name}_en`, max);
  return { en, si: field(form, `${name}_si`, max) || en, ta: field(form, `${name}_ta`, max) || en };
}

const slugify = (text: string) =>
  text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || `item-${Date.now().toString(36)}`;

function back(path: string, msg: string, errors: string[] = []): never {
  const q = new URLSearchParams({ msg });
  if (errors.length) q.set("err", errors.slice(0, 12).join("\n").slice(0, 1500));
  redirect(`${path}${path.includes("?") ? "&" : "?"}${q}`);
}

function refresh() {
  revalidateTag("cms");
  revalidatePath("/[lang]", "layout");
}

async function upload(form: FormData, name: string, want: "image" | "pdf", errors: string[]) {
  const file = form.get(name);
  if (!(file instanceof File) || file.size === 0) return undefined;
  const result = await cms.uploadFile(file, want);
  if ("id" in result) return result.id;
  errors.push(result.error === "size"
    ? `${file.name}: too large (${want === "pdf" ? "PDFs up to 15 MB" : "photos up to 5 MB"}).`
    : result.error === "type" ? `${file.name}: not a ${want === "pdf" ? "PDF" : "JPG, PNG or WebP photo"}.` : `${file.name}: upload failed.`);
  return undefined;
}

// ---------------------------------------------------------------------
// Signing in
// ---------------------------------------------------------------------

export async function login(form: FormData) {
  const ok = await signIn(field(form, "email", 254).toLowerCase(), String(form.get("password") ?? "").slice(0, 200))
    .catch(() => false);
  if (!ok) redirect("/admin/login?error=1");
  redirect("/admin");
}

export async function logout() {
  await signOut();
  redirect("/admin/login");
}

export async function changePassword(form: FormData) {
  await requireEditor({ allowPasswordChange: true });
  const password = String(form.get("password") ?? "");
  if (password.length < 12 || password.length > 200) back("/admin/account", "passwordLength");
  if (password !== String(form.get("confirm") ?? "")) back("/admin/account", "passwordMismatch");
  back("/admin/account", (await changeOwnPassword(password)) ? "passwordSaved" : "failed");
}

// ---------------------------------------------------------------------
// News
// ---------------------------------------------------------------------

const NEWS_CATEGORIES: NewsCategory[] = ["news", "press", "development", "integrity"];

export async function saveNews(form: FormData) {
  await requireEditor();
  const errors: string[] = [];
  const existing = field(form, "key", 120);
  const title = l10n(form, "title", 200);
  const date = field(form, "date", 10);
  const category = field(form, "category") as NewsCategory;
  if (!title.en || !DATE.test(date) || !NEWS_CATEGORIES.includes(category)) back(`/admin/news/${existing || "new"}`, "missing");
  const key = existing || slugify(field(form, "slug", 80) || title.en);
  const paragraphs = (lang: keyof L10n) =>
    field(form, `body_${lang}`, 20000).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const body = { en: paragraphs("en"), si: paragraphs("si"), ta: paragraphs("ta") };
  if (!body.si.length) body.si = body.en;
  if (!body.ta.length) body.ta = body.en;
  const image = form.get("removeImage") === "on" ? undefined
    : (await upload(form, "image", "image", errors)) ?? (field(form, "currentImage", 40) || undefined);
  const doc: NewsItem = { slug: key, date, category, title, summary: l10n(form, "summary", 400), body, ...(image ? { image } : {}) };
  const ok = await cms.saveItem("news", key, doc, { published: form.get("published") === "on", sortDate: date });
  refresh();
  back(`/admin/news/${key}`, ok ? "saved" : "failed", errors);
}

export async function deleteNews(form: FormData) {
  await requireEditor();
  await cms.deleteItem("news", field(form, "key", 120));
  refresh();
  back("/admin/news", "deleted");
}

// ---------------------------------------------------------------------
// Competitions and results
// ---------------------------------------------------------------------

const COMP_CATEGORIES: CompetitionCategory[] = ["national", "provincial", "schools", "university", "forces", "club", "road"];

export async function saveCompetition(form: FormData) {
  await requireEditor();
  const errors: string[] = [];
  const existing = field(form, "key", 120);
  const name = l10n(form, "name", 200);
  const start = field(form, "start", 10);
  const end = field(form, "end", 10) || start;
  const category = field(form, "category") as CompetitionCategory;
  const district = field(form, "district");
  const deadline = field(form, "entryDeadline", 10);
  if (!name.en || !DATE.test(start) || !DATE.test(end) || end < start || !COMP_CATEGORIES.includes(category)
      || !(DISTRICTS as readonly string[]).includes(district) || (deadline && !DATE.test(deadline))) {
    back(`/admin/competitions/${existing || "new"}`, "missing");
  }
  const key = existing || slugify(`${name.en} ${start.slice(0, 4)}`);

  const results: EventResults[] = [];
  const blocks = Math.min(60, Number(field(form, "blocks", 3)) || 0);
  for (let i = 0; i < blocks; i++) {
    const event = field(form, `r_event_${i}`);
    const text = field(form, `r_rows_${i}`, 20000);
    if (!event || !text) continue;
    if (!EVENT_CODES.includes(event)) { errors.push(`Unknown event ${event}`); continue; }
    const parsed = parseRows(event, text, "result");
    errors.push(...parsed.errors.map((e) => `${event}: ${e}`));
    if (parsed.rows.length) {
      results.push({
        event,
        gender: field(form, `r_gender_${i}`) === "F" ? "F" : "M",
        stage: field(form, `r_stage_${i}`) === "provisional" ? "provisional" : "official",
        rows: parsed.rows,
      });
    }
  }
  const circular = form.get("removeCircular") === "on" ? undefined
    : (await upload(form, "circular", "pdf", errors)) ?? (field(form, "currentCircular", 40) || undefined);
  const doc: Competition = {
    id: key, name, category, district, start, end,
    venue: field(form, "venue", 150),
    ...(deadline ? { entryDeadline: deadline } : {}),
    ...(results.length ? { results } : {}),
    ...(circular ? { circular } : {}),
  };
  const ok = await cms.saveItem("competition", key, doc, { published: form.get("published") === "on", sortDate: start });
  refresh();
  back(`/admin/competitions/${key}`, ok ? (errors.length ? "savedWithErrors" : "saved") : "failed", errors);
}

export async function deleteCompetition(form: FormData) {
  await requireEditor();
  await cms.deleteItem("competition", field(form, "key", 120));
  refresh();
  back("/admin/competitions", "deleted");
}

// ---------------------------------------------------------------------
// Rankings and records
// ---------------------------------------------------------------------

export async function saveRanking(form: FormData) {
  await requireEditor();
  const event = field(form, "event");
  const gender = field(form, "gender") === "F" ? "F" : "M";
  const season = Number(field(form, "season", 4));
  if (!EVENT_CODES.includes(event) || !Number.isInteger(season) || season < 1950 || season > 2100) back("/admin/rankings", "missing");
  const { rows, errors } = parseRows(event, field(form, "rows", 40000), "ranking");
  rows.sort((a, b) => (["TIME"].includes(EVENTS.find((e) => e.code === event)!.measurement) ? a.mark - b.mark : b.mark - a.mark));
  const key = `${event}-${gender}-${season}`.toLowerCase();
  const old = field(form, "key", 120);
  if (old && old !== key) await cms.deleteItem("ranking", old);
  const doc: RankingList = { event, gender, season, rows };
  const ok = await cms.saveItem("ranking", key, doc, { sortDate: `${season}-01-01` });
  refresh();
  back(`/admin/rankings?edit=${key}`, ok ? (errors.length ? "savedWithErrors" : "saved") : "failed", errors);
}

export async function deleteRanking(form: FormData) {
  await requireEditor();
  await cms.deleteItem("ranking", field(form, "key", 120));
  refresh();
  back("/admin/rankings", "deleted");
}

export async function saveRecord(form: FormData) {
  await requireEditor();
  const event = field(form, "event");
  const mark = EVENT_CODES.includes(event) ? parseMarkInput(event, field(form, "mark")) : null;
  const year = Number(field(form, "year", 4));
  const windText = field(form, "wind", 6);
  const wind = windText ? Number(windText.replace(",", ".")) : undefined;
  if (mark === null || !field(form, "athlete") || !Number.isInteger(year) || year < 1900 || year > 2100
      || (wind !== undefined && Number.isNaN(wind))) {
    back("/admin/records", "missing");
  }
  const key = field(form, "key", 120) || `r-${Date.now().toString(36)}${randomBytes(2).toString("hex")}`;
  const doc: NationalRecord = {
    category: field(form, "category") === "junior" ? "junior" : "senior",
    event, gender: field(form, "gender") === "F" ? "F" : "M",
    athlete: field(form, "athlete", 120), club: field(form, "club", 120), mark: mark!, year,
    venue: field(form, "venue", 120), ...(wind !== undefined ? { wind } : {}),
  };
  const ok = await cms.saveItem("record", key, doc, { sortDate: `${year}-01-01` });
  refresh();
  back("/admin/records", ok ? "saved" : "failed");
}

export async function deleteRecord(form: FormData) {
  await requireEditor();
  await cms.deleteItem("record", field(form, "key", 120));
  refresh();
  back("/admin/records", "deleted");
}

// ---------------------------------------------------------------------
// Pages, downloads and settings
// ---------------------------------------------------------------------

const PAGE_KEYS: PageKey[] = ["about", "development", "antiDoping", "downloads", "privacy", "terms"];

export async function savePage(form: FormData) {
  await requireEditor();
  const key = field(form, "key") as PageKey;
  if (!PAGE_KEYS.includes(key)) back("/admin/pages", "missing");
  const sections: InfoPage["sections"] = [];
  const count = Math.min(40, Number(field(form, "sections", 3)) || 0);
  for (let i = 0; i < count; i++) {
    const heading = l10n(form, `s${i}_heading`, 200);
    const body = l10n(form, `s${i}_body`, 10000);
    if (heading.en && body.en) sections.push({ heading, body });
  }
  const doc: InfoPage & { key: PageKey } = {
    key, title: l10n(form, "title", 200), intro: l10n(form, "intro", 600), sections,
    ...(form.get("legalDraft") === "on" ? { legalDraft: true } : {}),
  };
  if (!doc.title.en) back(`/admin/pages/${key}`, "missing");
  const ok = await cms.saveItem("page", key.toLowerCase(), doc);
  refresh();
  back(`/admin/pages/${key}`, ok ? "saved" : "failed");
}

export async function saveDownload(form: FormData) {
  await requireEditor();
  const errors: string[] = [];
  const title = l10n(form, "title", 200);
  const date = field(form, "date", 10);
  const file = form.get("file");
  if (!title.en || !DATE.test(date) || !(file instanceof File) || !file.size) back("/admin/downloads", "missing");
  const id = await upload(form, "file", "pdf", errors);
  if (!id) back("/admin/downloads", "failed", errors);
  const key = `dl-${Date.now().toString(36)}${randomBytes(2).toString("hex")}`;
  const doc: Download = { id: key, title, file: id!, name: (file as File).name.slice(0, 200), date };
  const ok = await cms.saveItem("download", key, doc, { sortDate: date });
  refresh();
  back("/admin/downloads", ok ? "saved" : "failed");
}

export async function deleteDownload(form: FormData) {
  await requireEditor();
  await cms.deleteItem("download", field(form, "key", 120));
  refresh();
  back("/admin/downloads", "deleted");
}

export async function saveSettings(form: FormData) {
  await requireEditor();
  const optional = (name: string) => {
    const v = l10n(form, name, 300);
    return v.en ? v : undefined;
  };
  const doc: SiteSettings = {
    sampleNotice: form.get("sampleNotice") === "on",
    heroKicker: optional("heroKicker"), heroTitle: optional("heroTitle"), heroText: optional("heroText"),
  };
  const ok = await cms.saveItem("setting", "site", JSON.parse(JSON.stringify(doc)));
  refresh();
  back("/admin/settings", ok ? "saved" : "failed");
}

// ---------------------------------------------------------------------
// Editors (owners only)
// ---------------------------------------------------------------------

export async function createEditor(form: FormData) {
  await requireEditor({ owner: true });
  const email = field(form, "email", 254).toLowerCase();
  const name = field(form, "name", 120);
  const password = String(form.get("password") ?? "");
  const role = field(form, "role") === "owner" ? "owner" : "editor";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || password.length < 12) back("/admin/editors", "missing");
  const r = await cms.createEditor(email, name, role, await encodePassword(password));
  back("/admin/editors", r === "ok" ? "editorCreated" : r === "exists" ? "editorExists" : "failed");
}

export async function updateEditor(form: FormData) {
  await requireEditor({ owner: true });
  const id = field(form, "id", 40);
  const op = field(form, "op");
  const password = String(form.get("password") ?? "");
  if (op === "reset" && password.length < 12) back("/admin/editors", "passwordLength");
  const r = await cms.updateEditor(id, {
    ...(op === "deactivate" ? { active: false } : op === "activate" ? { active: true } : {}),
    ...(op === "owner" ? { role: "owner" } : op === "editor" ? { role: "editor" } : {}),
    ...(op === "reset" ? { passwordHash: await encodePassword(password) } : {}),
  });
  back("/admin/editors", r === "ok" ? "editorUpdated" : r === "self" ? "editorSelf" : "failed");
}
