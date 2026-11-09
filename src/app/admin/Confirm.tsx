"use client";

import { useFormStatus } from "react-dom";

/** A submit button that asks first. For deleting and deactivating. */
export function ConfirmButton({ question, className, children }: { question: string; className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      className={`${className} cursor-pointer disabled:cursor-wait disabled:opacity-60`}
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={(e) => { if (!window.confirm(question)) e.preventDefault(); }}
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}
