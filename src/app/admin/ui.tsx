import { CircleAlert, CircleCheck } from "lucide-react";

// Small building blocks for the admin forms.

export const INPUT = "tap h-12 w-full border border-black/15 bg-white px-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 sm:h-11 sm:text-sm";
export const TEXTAREA = "w-full border border-black/15 bg-white px-3 py-2.5 text-base leading-relaxed outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm";
export const LABEL = "flex flex-col gap-1.5 text-sm font-semibold";

const MESSAGES: Record<string, [string, boolean]> = {
  saved: ["Saved. The website shows the change straight away.", true],
  savedWithErrors: ["Saved, but some lines could not be read and were left out. Fix them below and save again.", false],
  deleted: ["Deleted.", true],
  missing: ["Fill in the required fields (marked *) with valid values.", false],
  failed: ["That did not work. Refresh the page and try again.", false],
  passwordSaved: ["Password saved.", true],
  passwordLength: ["Use a password of 12 to 200 characters.", false],
  passwordMismatch: ["The two passwords are not the same.", false],
  editorCreated: ["Editor added. Give them the temporary password; they choose their own at first sign-in.", true],
  editorExists: ["An editor with that email already exists.", false],
  editorUpdated: ["Editor updated.", true],
  editorSelf: ["You cannot remove your own owner role or deactivate yourself.", false],
};

export function Flash({ msg, err }: { msg?: string; err?: string }) {
  const m = msg ? MESSAGES[msg] : undefined;
  if (!m) return null;
  const [text, good] = m;
  return (
    <div role={good ? "status" : "alert"}
      className={`rounded-2xl px-4 py-3 text-sm font-semibold ${good ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200" : "bg-red-50 text-red-800 ring-1 ring-red-200"}`}>
      <p className="flex items-center gap-2">
        {good ? <CircleCheck className="size-4" aria-hidden /> : <CircleAlert className="size-4" aria-hidden />} {text}
      </p>
      {err && <pre className="mt-2 font-mono text-xs font-normal whitespace-pre-wrap">{err}</pre>}
    </div>
  );
}

export function PageHead({ title, intro, action }: { title: string; intro?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        {intro && <p className="mt-1 max-w-2xl text-sm text-muted">{intro}</p>}
      </div>
      {action}
    </div>
  );
}

const LANG_NAMES = { en: "English", si: "සිංහල", ta: "தமிழ்" } as const;

/** One field in English, Sinhala and Tamil. Sinhala and Tamil fall back to English when empty. */
export function LangFields({ name, label, value, rows, required, max = 500 }: {
  name: string; label: string; value?: Partial<Record<"en" | "si" | "ta", string>>; rows?: number; required?: boolean; max?: number;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-semibold">{label}{required && " *"}</legend>
      <div className={`grid gap-2 ${rows ? "" : "lg:grid-cols-3"}`}>
        {(["en", "si", "ta"] as const).map((l) => {
          // a translation identical to the English is the English fallback: show it as empty
          const v = l !== "en" && value?.[l] === value?.en ? "" : value?.[l] ?? "";
          const placeholder = l === "en" ? undefined : "Uses the English text";
          return (
          <label key={l} className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-wider text-muted uppercase">{LANG_NAMES[l]}{l !== "en" && " (optional)"}</span>
            {rows ? (
              <textarea name={`${name}_${l}`} defaultValue={v} placeholder={placeholder} rows={rows} maxLength={max * 40} lang={l}
                required={required && l === "en"} className={TEXTAREA} />
            ) : (
              <input name={`${name}_${l}`} defaultValue={v} placeholder={placeholder} maxLength={max} lang={l}
                required={required && l === "en"} className={INPUT} />
            )}
          </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Section({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card flex flex-col gap-5 p-5 sm:p-6 ${className}`}>
      {title && <h2 className="text-lg font-extrabold">{title}</h2>}
      {children}
    </section>
  );
}

export function Toggle({ name, label, checked, hint }: { name: string; label: string; checked?: boolean; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" name={name} defaultChecked={checked} className="peer sr-only" />
        <span className="h-6 w-11 rounded-full bg-black/20 transition-colors peer-checked:bg-emerald-600 peer-focus-visible:outline-2 peer-focus-visible:outline-accent" />
        <span className="absolute top-1 left-1 size-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
      <span>
        <span className="font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function StatusPill({ published }: { published: boolean }) {
  return published
    ? <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">Published</span>
    : <span className="rounded-full bg-black/10 px-2.5 py-0.5 text-xs font-bold text-black/60">Draft</span>;
}

export const SAVE = "btn btn-primary";
export const DANGER = "inline-flex h-10 items-center rounded-full px-4 text-sm font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-50";
