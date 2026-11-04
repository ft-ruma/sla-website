"use client";

/** A submit button that asks first. For deleting and deactivating. */
export function ConfirmButton({ question, className, children }: { question: string; className: string; children: React.ReactNode }) {
  return (
    <button className={className} onClick={(e) => { if (!window.confirm(question)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
