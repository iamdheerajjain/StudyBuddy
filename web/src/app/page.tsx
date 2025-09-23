import ThreeHero from "@/components/ThreeHero";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-6xl px-6 pt-20">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
            Mentorae • AI Education Platform
          </div>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl">
            Learn faster with an AI tutor crafted for you
          </h1>
          <p className="mt-4 text-white/70">
            Research, explain, and practice with citations, retrieval, and
            multimedia understanding.
          </p>
        </div>
        <ThreeHero />
        <div className="mt-10 flex items-center justify-center gap-3">
          <a
            href="/auth"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 font-medium text-black transition hover:bg-emerald-400"
          >
            Get started
            <ArrowRight size={16} />
          </a>
          <a
            href="/pricing"
            className="rounded-lg border border-white/15 px-5 py-3 font-medium text-white/90 transition hover:bg-white/10"
          >
            View pricing
          </a>
        </div>
      </section>
      <section className="border-t border-white/10 bg-black/60">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-16 md:grid-cols-3">
          {[
            {
              title: "RAG + Citations",
              desc: "Grounded answers you can trust",
            },
            { title: "Multimodal", desc: "Understand images and videos" },
            { title: "Voice", desc: "Talk hands-free with TTS/STT" },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <div className="flex items-center gap-2 text-sm text-white/60">
                <CheckCircle2 size={16} className="text-emerald-400" />
                {f.title}
              </div>
              <div className="mt-2 text-lg font-medium">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
