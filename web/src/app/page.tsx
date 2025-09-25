"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import Image from "next/image";
import { ArrowRight, CheckCircle2, BookOpen, Brain } from "lucide-react";
import HomeFinalCTA from "@/components/HomeFinalCTA";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function Home() {
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }: { data: any }) => {
      setIsAuthed(Boolean(data.user));
    });
  }, []);
  return (
    <main className="min-h-screen section-premium">
      {/* Hero */}
      <section className="container-balanced section-padding relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-[color:var(--accent)]/20 to-[color:var(--accent-alt)]/20 rounded-full blur-3xl animate-float-gentle" />
          <div
            className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-[color:var(--accent-alt)]/15 to-[color:var(--accent)]/15 rounded-full blur-3xl animate-float-gentle"
            style={{ animationDelay: "2s" }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-[color:var(--accent)]/5 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-stretch lg:gap-16">
          <div
            className="order-2 lg:order-1 slide-up relative z-10"
            data-animate
            suppressHydrationWarning
          >
            <div className="glass-panel p-6 mb-8 w-fit">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-[color:var(--success)] animate-glow-pulse" />
                <span className="text-sm font-semibold text-gradient-primary">
                  studybuddy • AI Education Platform
                </span>
              </div>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-balance leading-[1.08] mb-6">
              Learn 2x faster with a
              <span className="block text-gradient-primary animate-glow-pulse">
                personal AI tutor
              </span>
            </h1>

            <p className="text-xl text-[color:var(--muted)] text-balance leading-relaxed mb-8 max-w-2xl">
              Grounded answers with citations, step-by-step reasoning, and
              multimodal understanding. Ask, explore sources, and master
              concepts with practice.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-10">
              {isAuthed ? (
                <Link
                  href="/dashboard"
                  className="btn-primary hover-lift inline-flex items-center gap-3 text-lg px-8 py-4"
                >
                  Go to dashboard
                  <ArrowRight
                    size={20}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
              ) : (
                <Link
                  href="/auth"
                  className="btn-primary hover-lift inline-flex items-center gap-3 text-lg px-8 py-4"
                >
                  Start free
                  <ArrowRight
                    size={20}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
              )}
              <a href="#how" className="btn-ghost hover-lift text-lg px-8 py-4">
                See how it works
              </a>
            </div>

            {/* Quick stats removed per request */}
          </div>

          <div
            className="order-1 lg:order-2 scale-in flex justify-center relative self-stretch"
            data-animate
            suppressHydrationWarning
          >
            <div className="relative h-full w-full max-w-xl border border-[color:var(--surface-border)]/50 rounded-3xl bg-[color:var(--glass-bg)]/60 backdrop-blur-premium p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--accent)]/10 to-[color:var(--accent-alt)]/10 rounded-3xl blur-xl pointer-events-none" />
              <div className="relative w-full h-full flex items-center justify-center">
                <div className="w-full max-w-md space-y-3">
                  <div className="text-sm font-semibold text-[color:var(--muted)] mb-2">
                    Live tutor preview
                  </div>
                  <div className="space-y-3">
                    <div className="card-surface p-3">
                      <div className="text-xs text-[color:var(--muted)] mb-1">
                        You
                      </div>
                      <p className="text-sm">
                        Explain photosynthesis like I’m 12, with a quick
                        diagram.
                      </p>
                    </div>
                    <div className="card-surface p-3">
                      <div className="text-xs text-[color:var(--muted)] mb-1">
                        Tutor
                      </div>
                      <p className="text-sm">
                        Plants turn sunlight into food. Think of leaves as tiny
                        factories.
                      </p>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <div className="h-16 rounded-md bg-gradient-to-br from-[color:var(--accent)]/20 to-[color:var(--accent-alt)]/10" />
                        <div className="h-16 rounded-md bg-gradient-to-br from-[color:var(--accent)]/20 to-[color:var(--accent-alt)]/10" />
                        <div className="h-16 rounded-md bg-gradient-to-br from-[color:var(--accent)]/20 to-[color:var(--accent-alt)]/10" />
                      </div>
                    </div>
                    <div className="card-surface p-3">
                      <div className="text-xs text-[color:var(--muted)] mb-1">
                        Tutor
                      </div>
                      <p className="text-sm">
                        Sources: biology.org/photosynthesis,
                        khanacademy.org/science
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-t border-[color:var(--surface-border)]/30 bg-gradient-to-b from-transparent to-[color:var(--surface)]/30">
        <div className="container-balanced py-16">
          <div className="text-center">
            {/* Ratings removed per request */}
            <div
              className="grid grid-cols-2 place-items-center gap-12 opacity-60 sm:grid-cols-5 stagger"
              data-animate
              suppressHydrationWarning
            >
              {(
                [
                  { alt: "Next", src: "/next.svg", w: 120, h: 24 },
                  { alt: "Vercel", src: "/vercel.svg", w: 120, h: 24 },
                  { alt: "Globe", src: "/globe.svg", w: 120, h: 24 },
                  { alt: "Window", src: "/window.svg", w: 120, h: 24 },
                  { alt: "File", src: "/file.svg", w: 120, h: 24 },
                ] as const
              ).map((l, i) => (
                <div key={l.alt} className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--accent)]/10 to-[color:var(--accent-alt)]/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Image
                    alt={l.alt}
                    src={l.src}
                    width={l.w}
                    height={l.h}
                    className="h-8 w-auto hover-lift transition-all duration-300 relative z-10"
                    style={
                      {
                        ["--stagger-index" as string]: String(i),
                      } as CSSProperties
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="border-t border-[color:var(--surface-border)]/30">
        <div className="container-balanced section-padding">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 glass-panel px-6 py-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-[color:var(--accent)] animate-glow-pulse" />
              <span className="text-sm font-semibold text-gradient-primary">
                Popular use cases
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance">
              Get help where it matters most
            </h2>
          </div>

          <div
            className="grid gap-6 stagger"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            }}
            data-animate
            suppressHydrationWarning
          >
            {[
              {
                title: "Exam prep",
                desc: "Practice problems with step-by-step solutions and targeted feedback.",
                emoji: "📝",
              },
              {
                title: "Coding help",
                desc: "Explain code, debug errors, and learn by example with citations.",
                emoji: "💻",
              },
              {
                title: "Research",
                desc: "Summarize papers, compare sources, and track references.",
                emoji: "🔎",
              },
              {
                title: "Language learning",
                desc: "Converse by voice, correct grammar, and build vocabulary.",
                emoji: "🗣️",
              },
            ].map((c, i) => (
              <div
                key={c.title}
                className="card-surface-premium p-6 hover-lift relative overflow-hidden"
                style={
                  { ["--stagger-index" as string]: String(i) } as CSSProperties
                }
              >
                <div className="text-3xl mb-3">{c.emoji}</div>
                <h3 className="text-xl font-bold mb-2 text-gradient-primary">
                  {c.title}
                </h3>
                <p className="text-[color:var(--muted)] leading-relaxed">
                  {c.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how"
        className="border-t border-[color:var(--surface-border)]/30 section-premium"
      >
        <div className="container-balanced section-padding relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 glass-panel px-6 py-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-[color:var(--accent)] animate-glow-pulse" />
              <span className="text-sm font-semibold text-gradient-primary">
                How it works
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance mb-6">
              Three simple steps to
              <span className="block text-gradient-primary">
                transform your learning
              </span>
            </h2>
            <p className="text-xl text-[color:var(--muted)] text-balance max-w-3xl mx-auto leading-relaxed">
              Experience the future of AI-powered education with our intuitive
              three-step process
            </p>
          </div>

          <div
            className="grid grid-cols-1 gap-8 sm:grid-cols-3 stagger"
            data-animate
            suppressHydrationWarning
          >
            {[
              {
                title: "Ask",
                desc: "Type or speak your question. Add files, links, or images for context-rich learning.",
                icon: BookOpen,
                gradient: "from-blue-400 to-blue-600",
                bgGlow: "from-blue-400/20 to-blue-600/20",
              },
              {
                title: "Ground",
                desc: "We search, retrieve, and cite sources for trustworthy, fact-based answers.",
                icon: CheckCircle2,
                gradient: "from-green-400 to-green-600",
                bgGlow: "from-green-400/20 to-green-600/20",
              },
              {
                title: "Master",
                desc: "Get guided explanations, examples, and practice until concepts truly stick.",
                icon: Brain,
                gradient: "from-purple-400 to-purple-600",
                bgGlow: "from-purple-400/20 to-purple-600/20",
              },
            ].map((s, i) => (
              <div
                key={s.title}
                className="card-surface-premium p-8 text-center hover-lift group relative overflow-hidden"
                style={
                  { ["--stagger-index" as string]: String(i) } as CSSProperties
                }
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${s.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                />
                <div className="relative z-10">
                  <div
                    className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${s.gradient} mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    <s.icon size={28} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-gradient-primary">
                    {s.title}
                  </h3>
                  <p className="text-[color:var(--muted)] text-balance leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ removed per request */}

      {/* Final CTA */}
      <section className="border-t border-[color:var(--surface-border)]/30 section-premium">
        <div className="container-balanced section-padding">
          <div className="relative">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--accent)]/5 via-[color:var(--accent-alt)]/5 to-[color:var(--accent)]/5 rounded-3xl blur-3xl" />

            <div className="card-surface-premium p-12 sm:p-16 text-center max-w-5xl mx-auto relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-[color:var(--accent)]/20 to-transparent rounded-full blur-2xl" />
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-br from-[color:var(--accent-alt)]/20 to-transparent rounded-full blur-2xl" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 glass-panel px-6 py-3 mb-8">
                  <div className="w-2 h-2 rounded-full bg-[color:var(--success)] animate-glow-pulse" />
                  <span className="text-sm font-semibold text-gradient-primary">
                    Ready to start?
                  </span>
                </div>

                <h3 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance mb-6">
                  Ready to
                  <span className="block text-gradient-primary">
                    learn faster?
                  </span>
                </h3>

                <p className="text-xl text-[color:var(--muted)] text-balance max-w-3xl mx-auto leading-relaxed mb-10">
                  Join thousands of learners who are already accelerating their
                  understanding with AI-powered education. Start free and
                  upgrade any time.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
                  <HomeFinalCTA />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
