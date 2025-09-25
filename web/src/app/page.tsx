import ThreeHero from "@/components/ThreeHeroClient";
import type { CSSProperties } from "react";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  BookOpen,
  Brain,
  Image as ImageIcon,
  Mic,
  Shield,
} from "lucide-react";

export default function Home() {
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
                  Mentorae • AI Education Platform
                </span>
              </div>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-balance leading-[1.1] mb-8">
              Your personal
              <span className="block text-gradient-primary animate-glow-pulse">
                AI tutor
              </span>
              for deep understanding
            </h1>

            <p className="text-xl text-[color:var(--muted)] text-balance leading-relaxed mb-10 max-w-2xl">
              Learn faster with retrieval-augmented answers, citations, and
              multimodal understanding. Ask anything, see the sources, and
              practice with guidance.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-12">
              <a
                href="/auth"
                className="btn-primary hover-lift inline-flex items-center gap-3 text-lg px-8 py-4"
              >
                Get started
                <ArrowRight
                  size={20}
                  className="transition-transform group-hover:translate-x-1"
                />
              </a>
              <a href="#how" className="btn-ghost hover-lift text-lg px-8 py-4">
                See how it works
              </a>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-lg">
              {[
                { label: "Citations & RAG", icon: "📚" },
                { label: "Multimodal inputs", icon: "🎭" },
                { label: "Voice (STT & TTS)", icon: "🎙️" },
                { label: "Privacy-first", icon: "🔒" },
              ].map((item, i) => (
                <div
                  key={item.label}
                  className="card-surface p-4 text-center hover-lift"
                >
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="text-sm font-medium">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="order-1 lg:order-2 scale-in flex justify-center relative self-stretch"
            data-animate
            suppressHydrationWarning
          >
            <div className="relative h-full w-full max-w-xl border border-[color:var(--surface-border)]/50 rounded-3xl bg-[color:var(--glass-bg)]/40 backdrop-blur-premium p-4">
              <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--accent)]/10 to-[color:var(--accent-alt)]/10 rounded-3xl blur-xl pointer-events-none" />
              <div className="relative w-full h-full flex items-center justify-center">
                <div className="relative w-full max-w-md">
                  <ThreeHero />
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
            <p className="text-sm text-[color:var(--muted)] mb-12 font-medium">
              Trusted by learners worldwide
            </p>
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

      {/* Features grid */}
      <section className="border-t border-[color:var(--surface-border)]/30 bg-gradient-to-b from-transparent via-[color:var(--surface)]/20 to-transparent">
        <div className="container-balanced section-padding">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 glass-panel px-6 py-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-[color:var(--success)] animate-glow-pulse" />
              <span className="text-sm font-semibold text-gradient-secondary">
                Powerful Features
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance mb-6">
              Everything you need to
              <span className="block text-gradient-primary">
                accelerate learning
              </span>
            </h2>
            <p className="text-xl text-[color:var(--muted)] text-balance max-w-3xl mx-auto leading-relaxed">
              Comprehensive tools designed to enhance your understanding and
              boost productivity
            </p>
          </div>

          <div
            className="grid gap-6 stagger"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            }}
            data-animate
            suppressHydrationWarning
          >
            {(() => {
              // Safelist Tailwind color utilities to avoid purging dynamic class names
              const colorToBgRing: Record<
                string,
                { bg: string; dot: string; icon: string }
              > = {
                emerald: {
                  bg: "bg-emerald-500/10",
                  dot: "bg-emerald-500",
                  icon: "text-emerald-600",
                },
                purple: {
                  bg: "bg-purple-500/10",
                  dot: "bg-purple-500",
                  icon: "text-purple-600",
                },
                blue: {
                  bg: "bg-blue-500/10",
                  dot: "bg-blue-500",
                  icon: "text-blue-600",
                },
                orange: {
                  bg: "bg-orange-500/10",
                  dot: "bg-orange-500",
                  icon: "text-orange-600",
                },
                indigo: {
                  bg: "bg-indigo-500/10",
                  dot: "bg-indigo-500",
                  icon: "text-indigo-600",
                },
                green: {
                  bg: "bg-green-500/10",
                  dot: "bg-green-500",
                  icon: "text-green-600",
                },
              };

              const items = [
                {
                  title: "RAG + Citations",
                  desc: "Grounded answers you can trust with transparent source attribution",
                  icon: CheckCircle2,
                  color: "emerald",
                  features: [
                    "Real-time fact checking",
                    "Source attribution",
                    "Confidence scoring",
                  ],
                },
                {
                  title: "Multimodal AI",
                  desc: "Understand images, videos, and complex multimedia content",
                  icon: ImageIcon,
                  color: "purple",
                  features: [
                    "Image analysis",
                    "Video processing",
                    "Audio transcription",
                  ],
                },
                {
                  title: "Voice Interface",
                  desc: "Talk hands-free with advanced speech recognition and synthesis",
                  icon: Mic,
                  color: "blue",
                  features: [
                    "Natural speech",
                    "Multi-language",
                    "Real-time response",
                  ],
                },
                {
                  title: "Smart Reasoning",
                  desc: "Structured thinking with step-by-step problem solving",
                  icon: Brain,
                  color: "orange",
                  features: ["Logic chains", "Step-by-step", "Concept mapping"],
                },
                {
                  title: "Concept Mastery",
                  desc: "Guided explanations and adaptive learning pathways",
                  icon: BookOpen,
                  color: "indigo",
                  features: [
                    "Adaptive learning",
                    "Progress tracking",
                    "Personalized paths",
                  ],
                },
                {
                  title: "Privacy Shield",
                  desc: "Your data is protected with enterprise-grade security",
                  icon: Shield,
                  color: "green",
                  features: [
                    "End-to-end encryption",
                    "Zero data retention",
                    "GDPR compliant",
                  ],
                },
              ] as const;

              return items.map((f, i) => {
                const classes = colorToBgRing[f.color];
                const centerThis =
                  f.title === "Concept Mastery" || f.title === "Privacy Shield";
                return (
                  <div
                    key={f.title}
                    className={`card-surface-premium p-8 hover-lift group relative overflow-hidden ${
                      centerThis ? "place-self-center" : ""
                    }`}
                    style={
                      {
                        ["--stagger-index" as string]: String(i),
                      } as CSSProperties
                    }
                  >
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-6">
                        <div
                          className={`w-12 h-12 rounded-xl ${classes.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                        >
                          <f.icon size={24} className={classes.icon} />
                        </div>
                        <h3 className="text-xl font-bold text-gradient-primary">
                          {f.title}
                        </h3>
                      </div>
                      <p className="text-[color:var(--muted)] text-balance leading-relaxed mb-6">
                        {f.desc}
                      </p>
                      <ul className="space-y-2">
                        {f.features.map((feature, idx) => (
                          <li
                            key={idx}
                            className="flex items-center gap-2 text-sm"
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${classes.dot}`}
                            />
                            <span className="text-[color:var(--foreground-secondary)]">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </section>

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
                  <a
                    href="/auth"
                    className="btn-primary hover-lift inline-flex items-center gap-3 text-lg px-10 py-4 shadow-premium"
                  >
                    Get started free
                    <ArrowRight
                      size={20}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </a>
                  <a
                    href="/dashboard"
                    className="btn-ghost hover-lift text-lg px-10 py-4"
                  >
                    Go to dashboard
                  </a>
                </div>

                <div className="flex items-center justify-center gap-8 text-sm text-[color:var(--muted)]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      size={16}
                      className="text-[color:var(--success)]"
                    />
                    <span>No credit card required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      size={16}
                      className="text-[color:var(--success)]"
                    />
                    <span>Free forever plan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      size={16}
                      className="text-[color:var(--success)]"
                    />
                    <span>Upgrade anytime</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
