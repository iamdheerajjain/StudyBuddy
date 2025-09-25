"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }: { data: any }) => {
      setIsAuthed(Boolean(data.user));
    });
  }, []);

  // Close on escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      window.addEventListener("keydown", onKeyDown);
    }
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  // Focus trap basic: focus first link when open, return focus to button on close
  useEffect(() => {
    const firstLink = menuRef.current?.querySelector<HTMLAnchorElement>("a");
    if (isOpen && firstLink) {
      firstLink.focus();
    } else if (!isOpen && toggleRef.current) {
      toggleRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="font-bold tracking-tight text-2xl sm:text-2xl hover-lift group transition-all duration-300"
        >
          <span className="text-gradient-primary group-hover:animate-glow-pulse">Mentorae</span>
        </Link>
        
        <nav className="hidden items-center gap-1 md:flex">
          <Link 
            href="/dashboard" 
            className="relative px-4 py-2 rounded-xl font-medium text-[color:var(--foreground)] hover:text-[color:var(--accent)] transition-all duration-300 group"
          >
            <span className="relative z-10">Dashboard</span>
            <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--accent)]/10 to-[color:var(--accent-alt)]/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
          
          {isAuthed ? (
            <Link
              href="/profile"
              className="btn-ghost hover-lift rounded-xl text-base px-6 py-2.5 ml-2"
            >
              Profile
            </Link>
          ) : (
            <Link href="/auth" className="btn-primary hover-lift ml-2">
              Sign in
            </Link>
          )}
        </nav>
        
        <button
          aria-label="Toggle menu"
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
          ref={toggleRef}
          className="md:hidden glass-panel p-3 hover-lift transition-all duration-300"
          onClick={() => setIsOpen((v) => !v)}
        >
          <div className="relative w-5 h-5">
            <span className={`absolute top-0 left-0 w-full h-0.5 bg-[color:var(--foreground)] transition-all duration-300 ${
              isOpen ? 'rotate-45 translate-y-2' : ''
            }`} />
            <span className={`absolute top-2 left-0 w-full h-0.5 bg-[color:var(--foreground)] transition-all duration-300 ${
              isOpen ? 'opacity-0' : ''
            }`} />
            <span className={`absolute top-4 left-0 w-full h-0.5 bg-[color:var(--foreground)] transition-all duration-300 ${
              isOpen ? '-rotate-45 -translate-y-2' : ''
            }`} />
          </div>
        </button>
      </div>
      
      <div
        id="mobile-menu"
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        className={`md:hidden absolute top-full left-0 right-0 mt-4 overflow-hidden transition-all duration-500 ease-out z-50 ${
          isOpen ? "max-h-96 opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-4"
        }`}
      >
        <div className="card-surface-premium p-6 space-y-4 backdrop-blur-premium">
          <Link
            href="/dashboard"
            className="block px-4 py-3 rounded-xl font-medium text-[color:var(--foreground)] hover:text-[color:var(--accent)] hover:bg-[color:var(--surface)]/50 transition-all duration-300"
            onClick={() => setIsOpen(false)}
          >
            Dashboard
          </Link>
          {isAuthed ? (
            <Link
              href="/profile"
              className="block btn-ghost text-center rounded-xl py-3"
              onClick={() => setIsOpen(false)}
            >
              Profile
            </Link>
          ) : (
            <Link
              href="/auth"
              className="block btn-primary text-center rounded-xl py-3"
              onClick={() => setIsOpen(false)}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
