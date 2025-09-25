import type { Metadata } from "next";
import Link from "next/link";
import {
  Plus_Jakarta_Sans,
  Space_Grotesk,
  IBM_Plex_Mono,
} from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollAnimate from "./ScrollAnimate";
import PageTransition from "./PageTransition";

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const fontDisplay = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fontMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Mentorae — AI Learning Platform",
  description:
    "Research, explain, and practice with retrieval, citations, and multimodal AI.",
  metadataBase:
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
      : undefined,
  openGraph: {
    title: "Mentorae — AI Learning Platform",
    description:
      "Research, explain, and practice with retrieval, citations, and multimodal AI.",
    type: "website",
    siteName: "Mentorae",
    images: [
      {
        url: "/vercel.svg",
        width: 1200,
        height: 630,
        alt: "Mentorae",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mentorae — AI Learning Platform",
    description:
      "Research, explain, and practice with retrieval, citations, and multimodal AI.",
    images: ["/vercel.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable} antialiased h-full`}
      >
        <header className="sticky top-0 z-50 border-b border-[color:var(--surface-border)]/30 bg-[color:var(--glass-bg)] backdrop-blur-premium shadow-soft">
          <div className="container-balanced py-4">
            <Navbar />
          </div>
        </header>
        <PageTransition>
          <div
            className="min-h-[calc(100dvh-200px)] fade-in"
            data-animate
            suppressHydrationWarning
          >
            {children}
          </div>
        </PageTransition>
        <ScrollAnimate />
        <Footer />
      </body>
    </html>
  );
}
