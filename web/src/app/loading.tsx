export default function GlobalLoading() {
  return (
    <div className="grid min-h-[60vh] place-items-center bg-black text-white">
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
        <span className="text-white/80">Loading…</span>
      </div>
    </div>
  );
}
