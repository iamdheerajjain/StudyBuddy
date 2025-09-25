export default function FeaturesPage() {
  return (
    <main className="min-h-screen">
      <section className="container-balanced section-padding">
        <div
          className="text-center mb-10"
          data-animate
          suppressHydrationWarning
        >
          <h1 className="text-4xl font-semibold tracking-tight text-balance">
            Features
          </h1>
          <p className="mt-3 text-lg text-muted text-balance max-w-2xl mx-auto">
            A modern toolkit for students and professionals to learn faster and
            better.
          </p>
        </div>

        <div className="card-grid" data-animate suppressHydrationWarning>
          {[
            {
              title: "AI Chat with RAG",
              desc: "Ask questions with grounded, cited answers you can trust.",
            },
            {
              title: "Document Indexing",
              desc: "Upload PDFs and build a study corpus for retrieval.",
            },
            {
              title: "Multimodal Understanding",
              desc: "Analyze images and videos and ask targeted questions.",
            },
            {
              title: "Voice In/Out",
              desc: "Speak your questions and listen to responses hands‑free.",
            },
            {
              title: "Enhanced Search",
              desc: "Educational results with engine fallback and summaries.",
            },
            {
              title: "Privacy First",
              desc: "Your data is protected and under your control.",
            },
          ].map((f, i) => (
            <div
              key={f.title}
              className="card-surface p-6 hover-bounce"
              style={
                {
                  ["--stagger-index" as string]: String(i),
                } as React.CSSProperties
              }
            >
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
