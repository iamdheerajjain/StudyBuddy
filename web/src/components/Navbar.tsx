"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mx-auto max-w-6xl px-6 py-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold">
          Mentorae
        </Link>
        <nav className="hidden items-center gap-4 text-sm md:flex">
          <Link href="/pricing" className="text-white/80 hover:text-white">
            Pricing
          </Link>
          <Link href="/dashboard" className="text-white/80 hover:text-white">
            Dashboard
          </Link>
          <Link
            href="/auth"
            className="rounded-lg bg-white px-3 py-1.5 text-black"
          >
            Sign in
          </Link>
        </nav>
        <button
          aria-label="Toggle menu"
          className="md:hidden rounded-md border border-white/15 p-2 text-white/80 hover:text-white"
          onClick={() => setIsOpen((v) => !v)}
        >
          {isOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {isOpen && (
        <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-white/5 p-3 md:hidden">
          <Link
            href="/pricing"
            className="block rounded px-2 py-2 hover:bg-white/10"
          >
            Pricing
          </Link>
          <Link
            href="/dashboard"
            className="block rounded px-2 py-2 hover:bg-white/10"
          >
            Dashboard
          </Link>
          <Link
            href="/auth"
            className="block rounded bg-white px-2 py-2 text-black"
          >
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
}
