"use client";

import { useFormStatus } from "react-dom";

/** Submit control that disables and shows progress while a server action runs. */
export function PendingButton({
  className,
  children,
  pendingLabel = "Please wait…",
  type = "submit",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type={type}
      {...rest}
      disabled={pending || rest.disabled}
      aria-busy={pending || undefined}
      className={`${className ?? ""} ${pending ? "opacity-70" : ""}`.trim()}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
