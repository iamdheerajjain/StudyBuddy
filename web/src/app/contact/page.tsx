"use client";

export default function ContactPage() {
  return (
    <main className="min-h-screen">
      <section className="container-balanced section-padding">
        <div
          className="max-w-2xl mx-auto"
          data-animate
          suppressHydrationWarning
        >
          <h1 className="text-4xl font-semibold tracking-tight text-balance">
            Contact
          </h1>
          <p className="mt-3 text-lg text-muted text-balance">
            Have questions or feedback? Send us a note and we’ll get back to
            you.
          </p>

          <form
            className="mt-8 card-surface p-8 grid gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget as HTMLFormElement;
              const data = new FormData(form);
              const subject = encodeURIComponent(
                String(data.get("subject") || "")
              );
              const body = encodeURIComponent(
                String(data.get("message") || "")
              );
              window.location.href = `mailto:hello@studybuddy.app?subject=${subject}&body=${body}`;
            }}
          >
            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-medium text-muted mb-2"
              >
                Subject
              </label>
              <input
                id="subject"
                name="subject"
                className="w-full rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--surface)] px-4 py-3 outline-none placeholder:text-muted focus:ring-focus"
                placeholder="How can we help?"
                required
              />
            </div>
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-muted mb-2"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={6}
                className="w-full rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--surface)] px-4 py-3 outline-none placeholder:text-muted focus:ring-focus"
                placeholder="Share details so we can assist"
                required
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <a href="mailto:hello@studybuddy.app" className="btn-ghost">
                Email directly
              </a>
              <button className="btn-primary">Send</button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
