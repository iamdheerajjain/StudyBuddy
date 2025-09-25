export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <section className="container-balanced section-padding">
        <div
          className="max-w-3xl mx-auto"
          data-animate
          suppressHydrationWarning
        >
          <h1 className="text-4xl font-semibold tracking-tight text-balance">
            About Mentorae
          </h1>
          <p className="mt-4 text-lg text-muted text-balance">
            Mentorae is an AI‑powered learning platform that blends
            retrieval‑augmented generation, multimodal understanding, and
            thoughtful UX to help students and professionals learn efficiently.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="card-surface p-6">
              <h2 className="text-xl font-semibold">For Students</h2>
              <p className="mt-2 text-muted">
                Master concepts faster with grounded explanations, examples, and
                practice.
              </p>
            </div>
            <div className="card-surface p-6">
              <h2 className="text-xl font-semibold">For Professionals</h2>
              <p className="mt-2 text-muted">
                Accelerate research, summarize docs, and extract insights from
                multimedia.
              </p>
            </div>
          </div>

          <div className="mt-10 card-surface p-8">
            <h3 className="text-lg font-semibold">Our Principles</h3>
            <ul className="mt-3 list-disc pl-5 space-y-2 text-muted">
              <li>Grounded, cited answers over guesswork</li>
              <li>Privacy and user control by default</li>
              <li>Accessibility and inclusive design</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
