import Link from "next/link";

export default function NotFound() {
  return (
    <main
      className="grid min-h-[70vh] place-items-center fade-in"
      data-animate
      suppressHydrationWarning
    >
      <div
        className="text-center slide-up"
        data-animate
        suppressHydrationWarning
      >
        <div className="text-6xl font-semibold">404</div>
        <p className="mt-2 text-muted">Page not found</p>
        <Link href="/" className="mt-6 inline-block btn-primary">
          Go home
        </Link>
      </div>
    </main>
  );
}
