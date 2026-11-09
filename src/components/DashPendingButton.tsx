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
  return (
    <button type={type} {...rest} disabled={pending || rest.disabled} aria-busy={pending || undefined} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
