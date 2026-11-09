export default function AdminLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-1 py-2" aria-busy="true" aria-live="polite">
      <div className="h-1 w-full overflow-hidden rounded-full bg-black/5">
        <div className="admin-progress h-full w-1/3 rounded-full bg-accent" />
      </div>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-black/5" />
      <div className="h-40 animate-pulse rounded-2xl bg-black/[0.04]" />
      <div className="h-40 animate-pulse rounded-2xl bg-black/[0.04]" />
      <p className="text-sm text-muted">Loading…</p>
    </div>
  );
}
