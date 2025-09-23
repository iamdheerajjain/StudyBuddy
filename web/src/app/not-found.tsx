import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-black text-white">
      <div className="text-center">
        <div className="text-6xl font-semibold">404</div>
        <p className="mt-2 text-white/70">Page not found</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-white px-4 py-2 text-black"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
