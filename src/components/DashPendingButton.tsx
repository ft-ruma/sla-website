"use client";

import { useFormStatus } from "react-dom";

/** Dashboard submit button with immediate pending feedback. */
export function DashPendingButton({
  className,
  children,
  pendingLabel = "Please wait…",
  type = "submit",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  const busy = pending || !!rest.disabled;
  return (
    <button type={type} {...rest} disabled={busy} aria-busy={pending || undefined}
      className={`${className ?? ""} ${pending ? "portal-btn-pending" : ""}`.trim()}>
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span className="portal-spinner" aria-hidden />
          <span>{pendingLabel}</span>
        </span>
      ) : children}
    </button>
  );
}
