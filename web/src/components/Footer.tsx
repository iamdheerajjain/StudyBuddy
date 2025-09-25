"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[color:var(--surface-border)]/30 bg-gradient-to-t from-[color:var(--surface)]/50 to-transparent">
      <div className="container-balanced py-16">
        <div className="glass-panel p-8 rounded-2xl">
          <div className="grid gap-8 sm:grid-cols-3 sm:items-center text-sm">
            <div className="flex flex-col items-start gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gradient-primary tracking-tight">
                  Mentorae
                </span>
                <span className="px-2 py-1 bg-[color:var(--accent)]/10 text-[color:var(--accent)] rounded-md text-xs font-medium">
                  AI Education
                </span>
              </div>
              <p className="text-[color:var(--muted)] leading-relaxed">
                Accelerating learning with AI-powered tutoring, multimodal understanding, and intelligent assistance.
              </p>
              <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
                <span>© {new Date().getFullYear()}</span>
                <span>•</span>
                <span>Made with 💙 for learners</span>
              </div>
            </div>

            <nav
              className="flex flex-wrap justify-center gap-6"
              aria-label="Footer"
            >
              {[
                { href: "/", label: "Home" },
                { href: "/features", label: "Features" },
                { href: "/about", label: "About" },
                { href: "/contact", label: "Contact" },
                { href: "/dashboard", label: "Dashboard" },
              ].map((link) => (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className="text-[color:var(--muted)] hover:text-[color:var(--accent)] font-medium transition-all duration-300 hover-lift relative group"
                >
                  {link.label}
                  <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[color:var(--accent)] transition-all duration-300 group-hover:w-full" />
                </Link>
              ))}
            </nav>

            <div className="flex flex-col items-start sm:items-end gap-4">
              <div className="flex items-center gap-4">
                <a
                  href="mailto:hello@mentorae.app"
                  className="btn-ghost px-4 py-2 text-sm hover-lift"
                  aria-label="Contact us"
                >
                  Contact
                </a>
                <Link href="#" className="btn-ghost px-4 py-2 text-sm hover-lift">
                  Privacy
                </Link>
                <Link href="#" className="btn-ghost px-4 py-2 text-sm hover-lift">
                  Terms
                </Link>
              </div>
              <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
                <div className="w-2 h-2 rounded-full bg-[color:var(--success)] animate-glow-pulse" />
                <span>All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
