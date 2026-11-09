import { requireEditor } from "@/lib/cms-auth";
import { changePassword } from "../../actions";
import { Flash, INPUT, LABEL, PageHead, PendingButton, SAVE, Section } from "../../ui";

export default async function Account({ searchParams }: { searchParams: Promise<{ msg?: string; first?: string }> }) {
  const { editor } = await requireEditor({ allowPasswordChange: true });
  const { msg, first } = await searchParams;
  return (
    <>
      <PageHead title="Your account" intro={`${editor.display_name} · ${editor.email} · ${editor.role}`} />
      {(first || editor.must_change_password) && msg !== "passwordSaved" && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">
          Choose your own password before you continue. It replaces the temporary one you were given.
        </p>
      )}
      <Flash msg={msg} />
      <form action={changePassword}>
        <Section title="Change password">
          <div className="grid max-w-xl gap-4">
            <label className={LABEL}>New password (12–200 characters)<input type="password" name="password" required minLength={12} maxLength={200} autoComplete="new-password" className={INPUT} /></label>
            <label className={LABEL}>Repeat it<input type="password" name="confirm" required maxLength={200} autoComplete="new-password" className={INPUT} /></label>
          </div>
          <p className="text-xs text-muted">Saving signs you out on your other devices.</p>
          <div><PendingButton className={SAVE}>Save password</PendingButton></div>
        </Section>
      </form>
    </>
  );
}
