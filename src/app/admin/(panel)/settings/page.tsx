import { getDict } from "@/lib/i18n";
import { getSettings } from "@/lib/cms";
import { requireEditor } from "@/lib/cms-auth";
import { saveSettings } from "../../actions";
import { Flash, LangFields, PageHead, PendingButton, SAVE, Section, Toggle } from "../../ui";

export default async function Settings({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireEditor();
  const { msg } = await searchParams;
  const s = await getSettings();
  const built = { en: getDict("en"), si: getDict("si"), ta: getDict("ta") };
  const builtIn = (k: "heroKicker" | "heroTitle" | "heroText") => ({ en: built.en[k], si: built.si[k], ta: built.ta[k] });
  return (
    <>
      <PageHead title="Site settings" intro="Settings that apply to the whole website." />
      <Flash msg={msg} />
      <form action={saveSettings} className="flex flex-col gap-5">
        <Section title="Sample content notice">
          <Toggle name="sampleNotice" label="Show the “sample content” banner at the top of every page" checked={s.sampleNotice}
            hint="Turn it off once news, calendar, results, rankings and records are the official ones." />
        </Section>
        <Section title="Home page hero">
          <p className="-mt-2 text-sm text-muted">Leave a field empty to use the built-in text shown in the box.</p>
          <LangFields name="heroKicker" label="Small line above the title" value={s.heroKicker ?? builtIn("heroKicker")} max={120} />
          <LangFields name="heroTitle" label="Title" value={s.heroTitle ?? builtIn("heroTitle")} max={120} />
          <LangFields name="heroText" label="Text" value={s.heroText ?? builtIn("heroText")} rows={2} />
        </Section>
        <div><PendingButton className={SAVE}>Save settings</PendingButton></div>
      </form>
    </>
  );
}
