"use client";

import { ArrowLeft, CircleAlert, CircleCheck, Info, KeyRound, LifeBuoy, Mail } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import type { Dict } from "@/lib/dict/en";
import { fill } from "@/lib/i18n";
import { changePassword, signInStep, type FormState, type SignInState } from "@/lib/member-actions";

const INPUT = "tap h-12 w-full border border-line bg-white px-4 text-base outline-none focus:border-ink sm:text-sm";
const BUTTON = "tap inline-flex min-h-12 items-center justify-center gap-2 bg-night px-5 text-base font-bold text-white transition active:opacity-90 hover:bg-black disabled:opacity-60 sm:text-sm";
const LINK = "tap self-start py-2 text-base font-semibold underline underline-offset-4 hover:text-accent disabled:opacity-60 sm:text-sm";

function Field({ id, label, hint, ...input }: { id: string; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">{label}</label>
      <input id={id} name={id} aria-describedby={hint ? `${id}-hint` : undefined} className={INPUT} {...input} />
      {hint && <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Problem({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p role="alert" className="flex items-start gap-2.5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {text}
    </p>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <p role="status" className="flex items-start gap-2.5 border border-line bg-white px-4 py-3 text-sm">
      <CircleCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /> {text}
    </p>
  );
}

/**
 * NIC, Postal ID or email first. With a password: password, and "Forgot
 * password?". Without one (first visit after registering): a 6-digit code to
 * the registered email, shown masked for a NIC or Postal ID, then the member
 * must choose a password before reaching the dashboard. "Can't access this
 * email?" files a request that SLA staff confirm by phone.
 */
export function SignInFlow({ lang, t }: { lang: string; t: Dict }) {
  const [state, act, pending] = useActionState<SignInState, FormData>(signInStep, { step: "email" });
  const id = "id" in state ? state.id ?? "" : "";

  const hidden = (
    <>
      <input type="hidden" name="lang" value={lang} />
      {state.step !== "email" && state.step !== "reset" && <input type="hidden" name="identifier" value={id} />}
    </>
  );
  const back = (
    <button type="submit" name="intent" value="back" disabled={pending} className={`${LINK} inline-flex items-center gap-1.5`}>
      <ArrowLeft className="size-4" aria-hidden /> {t.signInDifferentEmail}
    </button>
  );
  const noAccess = (
    <button type="submit" name="intent" value="resetForm" disabled={pending} className={`${LINK} inline-flex items-center gap-1.5`}>
      <LifeBuoy className="size-4" aria-hidden /> {t.emailResetLink}
    </button>
  );
  const signedInAs = "shown" in state && (
    <p className="text-sm text-muted">{fill(t.signInAs, { email: state.shown })}</p>
  );

  if (state.step === "resetSent") {
    return (
      <form key="resetSent" action={act} className="flex flex-col gap-4">
        {hidden}
        <Notice text={t.emailResetDone} />
        {back}
      </form>
    );
  }

  if (state.step === "reset") {
    return (
      <form key="reset" action={act} noValidate className="flex flex-col gap-4">
        {hidden}
        <div>
          <h2 className="text-lg font-bold">{t.emailResetTitle}</h2>
          <p className="mt-1 text-sm text-muted">{t.emailResetIntro}</p>
        </div>
        <p role="note" className="flex items-start gap-2.5 border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          <Info className="mt-0.5 size-4 shrink-0 text-sky-700" aria-hidden />
          {t.emailResetIdHint}
        </p>
        <Field id="identifier" label={t.emailResetId} defaultValue={id} required autoFocus={!id}
          maxLength={40} autoComplete="off" spellCheck={false} />
        <Field id="fullName" label={t.emailResetName} defaultValue={state.fullName} required autoFocus={!!id}
          autoComplete="name" maxLength={150} />
        <Field id="phone" type="tel" label={t.emailResetPhone} hint={t.emailResetPhoneHint} defaultValue={state.phone}
          required autoComplete="tel" inputMode="tel" maxLength={30} />
        <Field id="newEmail" type="email" label={t.emailResetNew} defaultValue={state.newEmail} required
          autoComplete="email" inputMode="email" spellCheck={false} maxLength={254} />
        <Problem text={state.error && t[state.error]} />
        <button type="submit" name="intent" value="resetRequest" disabled={pending} className={BUTTON}>
          <LifeBuoy className="size-4" aria-hidden /> {t.emailResetSubmit}
        </button>
        {back}
      </form>
    );
  }

  if (state.step === "password") {
    return (
      <form key="password" action={act} noValidate className="flex flex-col gap-4">
        {hidden}
        {signedInAs}
        <Field id="password" type="password" label={t.signInPassword} required autoFocus
          autoComplete="current-password" maxLength={200} />
        <Problem text={state.error && t[state.error]} />
        <button type="submit" name="intent" value="password" disabled={pending} className={BUTTON}>
          <KeyRound className="size-4" aria-hidden /> {t.signInVerify}
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="submit" name="intent" value="forgot" disabled={pending} className={LINK}>
            {t.signInForgot}
          </button>
          {back}
        </div>
      </form>
    );
  }

  if (state.step === "code") {
    const sent = state.resent
      ? t.signInCodeResent
      : state.masked
        ? fill(state.purpose === "reset" ? t.signInResetSentTo : t.signInCodeSentTo, { email: state.shown })
        : state.purpose === "reset" ? t.signInResetSent : t.signInCodeSent;
    return (
      <form key={`code-${state.purpose}`} action={act} noValidate className="flex flex-col gap-4">
        {hidden}
        <Notice text={sent} />
        {state.test !== undefined && (
          <p data-testid="mock-code" className="border border-dashed border-amber-400 bg-amber-50 px-4 py-3 font-mono text-sm">
            {state.test ? `Test mode: code ${state.test.code} sent to ${state.test.email}` : "Test mode: no code was sent for this email."}
          </p>
        )}
        <Field id="code" label={t.signInCode} required autoFocus inputMode="numeric" autoComplete="one-time-code"
          maxLength={7} pattern="[0-9 ]*" className={`${INPUT} font-mono text-lg tracking-[0.4em]`} />
        <Problem text={state.error && t[state.error]} />
        <button type="submit" name="intent" value="code" disabled={pending} className={BUTTON}>{t.signInCheckCode}</button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ResendButton key={state.sentAt} pending={pending} label={t.signInResend} wait={t.signInResendWait} />
          {back}
        </div>
        {state.masked && <div className="border-t border-line pt-4">{noAccess}</div>}
      </form>
    );
  }

  if (state.step === "newPassword") {
    return (
      <form key="newPassword" action={act} noValidate className="flex flex-col gap-4">
        {hidden}
        <Notice text={state.purpose === "reset" ? t.signInChooseNew : t.signInChooseFirst} />
        {/* lets password managers save the login under what the member types to sign in */}
        <input type="text" name="username" value={id} autoComplete="username" readOnly hidden />
        <Field id="password" type="password" label={t.passwordNew} hint={t.passwordLength} required autoFocus
          autoComplete="new-password" minLength={10} maxLength={200} />
        <Field id="confirm" type="password" label={t.passwordConfirm} required autoComplete="new-password" maxLength={200} />
        <Problem text={state.error && t[state.error]} />
        <button type="submit" name="intent" value="setPassword" disabled={pending} className={BUTTON}>
          <KeyRound className="size-4" aria-hidden /> {t.signInSavePassword}
        </button>
      </form>
    );
  }

  return (
    <form key="email" action={act} noValidate className="flex flex-col gap-4">
      {hidden}
      <p role="note" className="flex items-start gap-2.5 border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        <Info className="mt-0.5 size-4 shrink-0 text-sky-700" aria-hidden />
        {t.signInPostalNote}
      </p>
      <Field id="identifier" label={t.signInIdentifier} hint={t.signInIdentifierHint} defaultValue={id} required
        autoFocus autoComplete="username" spellCheck={false} maxLength={254} />
      <Problem text={state.error && t[state.error]} />
      <button type="submit" name="intent" value="start" disabled={pending} className={BUTTON}>
        <Mail className="size-4" aria-hidden /> {t.signInContinue}
      </button>
      {state.error === "signInNoEmail" && noAccess}
    </form>
  );
}

/** "Send a new code", usable a minute after the last code (the server allows one a minute). */
function ResendButton({ pending, label, wait }: { pending: boolean; label: string; wait: string }) {
  const [left, setLeft] = useState(60);
  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);
  return (
    <button type="submit" name="intent" value="resend" disabled={pending || left > 0} className={LINK}>
      {left > 0 ? fill(wait, { seconds: String(left) }) : label}
    </button>
  );
}

export function ChangePassword({ lang, t }: { lang: string; t: Dict }) {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, {});
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="lang" value={lang} />
      <Field id="password" type="password" label={t.passwordNew} hint={t.passwordLength} required
        autoComplete="new-password" minLength={10} maxLength={200} />
      <Field id="confirm" type="password" label={t.passwordConfirm} required autoComplete="new-password" maxLength={200} />
      <Problem text={state.error && t[state.error]} />
      {state.ok && (
        <p role="status" className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <CircleCheck className="size-4" aria-hidden /> {t.passwordSaved}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${BUTTON} self-start`}>{t.passwordSave}</button>
    </form>
  );
}
