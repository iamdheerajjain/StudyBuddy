export default function PricingPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h1 className="text-center text-5xl font-semibold">Pricing</h1>
        <p className="mt-3 text-center text-white/70">
          Choose a plan that scales with you.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              name: "Free",
              price: "$0",
              features: ["Basic chat", "Limited searches"],
            },
            {
              name: "Pro",
              price: "$19",
              features: [
                "Retrieval + citations",
                "Image analysis",
                "Priority queue",
              ],
            },
            {
              name: "Team",
              price: "$49",
              features: ["Seats", "Team spaces", "Usage analytics"],
            },
          ].map((tier) => {
            const isPro = tier.name === "Pro";
            return (
              <div
                key={tier.name}
                className={
                  "relative rounded-2xl border border-white/10 bg-white/5 p-6 " +
                  (isPro ? "ring-1 ring-emerald-400/50" : "")
                }
              >
                {isPro && (
                  <div className="absolute -top-3 left-6 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                    Most popular
                  </div>
                )}
                <h3 className="text-xl font-medium">{tier.name}</h3>
                <div className="mt-2 text-3xl font-semibold">
                  {tier.price}
                  <span className="text-base text-white/60">/mo</span>
                </div>
                <ul className="mt-4 space-y-2 text-white/80">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="/auth"
                  className={
                    "mt-6 inline-block w-full rounded-lg px-4 py-3 text-center font-medium " +
                    (isPro
                      ? "bg-emerald-500 text-black hover:bg-emerald-400"
                      : "bg-white text-black hover:bg-white/90")
                  }
                >
                  Get started
                </a>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
