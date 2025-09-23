import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mentorae — AI Learning Platform",
  description:
    "Research, explain, and practice with retrieval, citations, and multimodal AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full bg-black text-white`}
      >
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur">
          <Navbar />
        </header>
        {children}
        <footer className="border-t border-white/10">
          <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-white/60 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              © {new Date().getFullYear()} Mentorae. All rights reserved.
            </div>
            <nav className="flex gap-4">
              <a href="/pricing" className="hover:text-white">
                Pricing
              </a>
              <a href="/dashboard" className="hover:text-white">
                Dashboard
              </a>
              <a href="/auth" className="hover:text-white">
                Sign in
              </a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
