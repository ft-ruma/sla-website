import { listEditors } from "@/lib/cms-admin";
import { requireEditor } from "@/lib/cms-auth";
import { createEditor, updateEditor } from "../../actions";
import { Flash, INPUT, LABEL, PageHead, PendingButton, SAVE, Section } from "../../ui";

const SMALL = "rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-black/15 hover:ring-ink";

export default async function Editors({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { editor: me } = await requireEditor({ owner: true });
  const { msg } = await searchParams;
  const editors = await listEditors();
  const op = (id: string, value: string, label: string, cls = SMALL) => (
    <form action={updateEditor}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="op" value={value} />
      <button className={cls}>{label}</button>
    </form>
  );
  return (
    <>
      <PageHead title="Editors" intro="People who can change the website. Owners can also manage editors. These accounts cannot see the member register." />
      <Flash msg={msg} />
      <form action={createEditor}>
        <Section title="Add an editor">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={LABEL}>Name *<input name="name" required maxLength={120} className={INPUT} /></label>
            <label className={LABEL}>Email *<input name="email" type="email" required className={INPUT} /></label>
            <label className={LABEL}>
              Temporary password * (12+ characters)
              <input name="password" type="text" required minLength={12} autoComplete="off" className={`${INPUT} font-mono`} />
            </label>
            <label className={LABEL}>
              Role
              <select name="role" className={INPUT}><option value="editor">Editor</option><option value="owner">Owner</option></select>
            </label>
          </div>
          <p className="text-xs text-muted">Give them the temporary password in person or by phone. They must choose their own at first sign-in.</p>
          <div><PendingButton className={SAVE}>Add editor</PendingButton></div>
        </Section>
      </form>
      <div className="card overflow-hidden">
        <ul className="divide-y divide-line">
          {editors.map((e) => (
            <li key={e.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{e.display_name} {e.id === me.id && <span className="text-xs font-normal text-muted">(you)</span>}</span>
                <span className="block text-xs text-muted">
                  {e.email} · {e.role} · {e.active ? "active" : "deactivated"}
                  {e.must_change_password ? " · must set a password" : ""}
                  {e.last_login_at ? ` · last sign-in ${new Date(e.last_login_at).toLocaleDateString("en-GB")}` : ""}
                </span>
              </span>
              {e.id !== me.id && (
                <span className="flex flex-wrap items-center gap-2">
                  {op(e.id, e.role === "owner" ? "editor" : "owner", e.role === "owner" ? "Make editor" : "Make owner")}
                  {op(e.id, e.active ? "deactivate" : "activate", e.active ? "Deactivate" : "Activate",
                    e.active ? "rounded-full px-3 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-50" : SMALL)}
                  <form action={updateEditor} className="flex gap-1.5">
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="op" value="reset" />
                    <input name="password" minLength={12} required placeholder="New temporary password" autoComplete="off"
                      className="h-8 w-48 border border-black/15 px-2 font-mono text-xs" />
                    <button className={SMALL}>Reset</button>
                  </form>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
