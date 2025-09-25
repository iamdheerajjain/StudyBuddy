export default function GlobalLoading() {
  return (
    <div
      className="grid min-h-[60vh] place-items-center fade-in"
      data-animate
      suppressHydrationWarning
    >
      <div
        className="flex items-center gap-3 slide-up"
        data-animate
        suppressHydrationWarning
      >
        <span className="h-2 w-2 animate-ping rounded-full bg-[color:var(--accent)]" />
        <span className="text-muted">Loading…</span>
      </div>
    </div>
  );
}
