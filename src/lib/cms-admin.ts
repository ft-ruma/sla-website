import "server-only";
import type { CmsItem, CmsKind } from "./cms";
import { tokenHash } from "./cms-auth";
import { sql } from "./db";

// What /admin reads and writes, through the functions in db/cms.sql. Every
// call passes the editor's session; the database checks it.

async function session() {
  const hash = await tokenHash();
  if (!hash || !sql) throw new Error("Not signed in");
  return { hash, db: sql };
}

/** Every item of a kind, drafts included. */
export async function listItems<T>(kind: CmsKind): Promise<CmsItem<T>[]> {
  const { hash, db } = await session();
  const [row] = await db<{ items: CmsItem<T>[] }[]>`SELECT web.cms_items(${kind}, ${hash}) AS items`;
  return row?.items ?? [];
}

export async function getItem<T>(kind: CmsKind, key: string) {
  return (await listItems<T>(kind)).find((i) => i.key === key) ?? null;
}

export async function saveItem(kind: CmsKind, key: string, doc: unknown,
  opts: { published?: boolean; sortDate?: string | null; sortOrder?: number } = {}) {
  const { hash, db } = await session();
  const [row] = await db<{ ok: boolean }[]>`
    SELECT web.cms_save(${hash}, ${kind}, ${key}, ${db.json(doc as never)}, ${opts.published ?? true},
                        ${opts.sortDate ?? null}::date, ${opts.sortOrder ?? 0}) AS ok`;
  return row?.ok === true;
}

export async function deleteItem(kind: CmsKind, key: string) {
  const { hash, db } = await session();
  const [row] = await db<{ ok: boolean }[]>`SELECT web.cms_delete(${hash}, ${kind}, ${key}) AS ok`;
  return row?.ok === true;
}

const LIMITS = { image: 5 * 1024 * 1024, pdf: 15 * 1024 * 1024 };

/** The file's real type from its first bytes, so a renamed file cannot pass as a photo or PDF. */
function sniff(bytes: Uint8Array) {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45) return "image/webp";
  if (starts(0x25, 0x50, 0x44, 0x46)) return "application/pdf";
  return null;
}

export type UploadResult = { id: string } | { error: "type" | "size" | "failed" };

/** Stores a photo (JPG, PNG, WebP up to 5 MB) or a PDF (up to 15 MB). */
export async function uploadFile(file: File, want: "image" | "pdf"): Promise<UploadResult> {
  if (file.size > LIMITS[want]) return { error: "size" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type || (want === "pdf") !== (type === "application/pdf")) return { error: "type" };
  const { hash, db } = await session();
  const [row] = await db<{ id: string | null }[]>`
    SELECT web.cms_upload(${hash}, ${file.name || "file"}, ${type}, ${Buffer.from(bytes)}) AS id`;
  return row?.id ? { id: row.id } : { error: "failed" };
}

export type AuditRow = { at: Date; actor: string; action: string; target: string | null };

export async function recentChanges(limit = 30): Promise<AuditRow[]> {
  const { hash, db } = await session();
  return db<AuditRow[]>`SELECT * FROM web.cms_audit(${hash}, ${limit})`;
}

export type EditorRow = {
  id: string; email: string; display_name: string; role: "owner" | "editor"; active: boolean;
  must_change_password: boolean; last_login_at: Date | null;
};

export async function listEditors(): Promise<EditorRow[]> {
  const { hash, db } = await session();
  return db<EditorRow[]>`SELECT * FROM web.cms_editors(${hash})`;
}

export async function createEditor(email: string, name: string, role: string, passwordHash: string) {
  const { hash, db } = await session();
  const [row] = await db<{ r: string }[]>`SELECT web.cms_editor_create(${hash}, ${email}, ${name}, ${role}, ${passwordHash}) AS r`;
  return row?.r ?? "failed";
}

export async function updateEditor(id: string, change: { role?: string; active?: boolean; passwordHash?: string }) {
  const { hash, db } = await session();
  const [row] = await db<{ r: string }[]>`
    SELECT web.cms_editor_update(${hash}, ${id}::uuid, ${change.role ?? null}, ${change.active ?? null},
                                 ${change.passwordHash ?? null}) AS r`;
  return row?.r ?? "failed";
}
