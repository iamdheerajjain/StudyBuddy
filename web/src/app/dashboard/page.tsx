"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { api } from "@/lib/api";

export default function Dashboard() {
  const supabase = supabaseBrowser();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [ragUploading, setRagUploading] = useState(false);
  const [imageAnalysis, setImageAnalysis] = useState<any>(null);
  const [imageQuestion, setImageQuestion] = useState("");
  const [imageAnswer, setImageAnswer] = useState<string | null>(null);
  const [videoAnalysis, setVideoAnalysis] = useState<any>(null);
  const [videoQuestion, setVideoQuestion] = useState("");
  const [videoAnswer, setVideoAnswer] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? null;
      setUserEmail(email);
      if (!email) {
        // soft gate: redirect to auth
        window.location.href = "/auth";
      }
    });
  }, [supabase]);

  useEffect(() => {
    api
      .get("status")
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const canSend = useMemo(
    () => input.trim().length > 0 && !loading,
    [input, loading]
  );

  const send = async () => {
    if (!canSend) return;
    const text = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await api.postJson("ask", { query: text });
      const content = res?.response ?? "No response";
      setMessages((m) => [...m, { role: "assistant", content }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: e?.message || "Something went wrong" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-sm text-white/60">
              Ask, analyze, and manage your study workspace.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">
              {userEmail ?? "Not signed in"}
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium">Ask Mentorae</h2>
                <p className="text-xs text-white/60">
                  Chat with retrieval and citations.
                </p>
              </div>
              <div className="text-xs text-white/60">
                Store: {status?.store_type || "—"}
              </div>
            </div>
            <div className="mt-4 h-72 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-3 text-sm">
              {messages.length === 0 ? (
                <div className="grid h-full place-items-center text-white/50">
                  <div className="text-center">
                    <div className="text-sm">No messages yet</div>
                    <div className="text-xs">Ask anything to get started.</div>
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className="mb-3">
                    <div className="mb-1 text-[11px] uppercase tracking-wide text-white/50">
                      {m.role}
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {m.content}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 outline-none placeholder:text-white/40 focus:border-emerald-400/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                placeholder="Ask a question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
              />
              <button
                onClick={send}
                disabled={!canSend}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-black transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {loading ? "Thinking..." : "Send"}
              </button>
              <button
                onClick={async () => {
                  try {
                    const stt = await api.postJson("speech-to-text", {});
                    if (stt?.query) setInput(stt.query);
                  } catch {}
                }}
                className="rounded-lg border border-white/15 px-3 py-2 text-white/80 hover:bg-white/10"
              >
                🎤 STT
              </button>
              <button
                onClick={async () => {
                  const last = [...messages]
                    .reverse()
                    .find((m) => m.role === "assistant");
                  if (!last) return;
                  try {
                    await api.postJson("text-to-speech", {
                      text: last.content,
                    });
                  } catch {}
                }}
                className="rounded-lg border border-white/15 px-3 py-2 text-white/80 hover:bg-white/10"
              >
                🔊 TTS
              </button>
            </div>
            <div className="mt-2 flex gap-2 text-xs">
              <button
                onClick={async () => {
                  try {
                    await api.postJson("stop-speech", {});
                  } catch {}
                }}
                className="rounded border border-white/15 px-2 py-1 text-white/70 hover:bg-white/10"
              >
                Stop Speech
              </button>
              <button
                onClick={async () => {
                  try {
                    await api.postJson("stop-listening", {});
                  } catch {}
                }}
                className="rounded border border-white/15 px-2 py-1 text-white/70 hover:bg-white/10"
              >
                Stop Listening
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <h2 className="text-lg font-medium">Analyze Image</h2>
            <p className="mt-1 text-white/60">Upload an image to analyze.</p>
            <form
              className="mt-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const fileInput =
                  (e.currentTarget.elements.namedItem(
                    "image"
                  ) as HTMLInputElement) ?? null;
                if (
                  !fileInput ||
                  !fileInput.files ||
                  fileInput.files.length === 0
                )
                  return;
                const data = new FormData();
                data.append("image", fileInput.files[0]);
                try {
                  const res = await api.postForm("process-image", data);
                  setImageAnalysis(res?.data || null);
                } catch (err) {
                  setImageAnalysis(null);
                }
              }}
            >
              <input
                name="image"
                type="file"
                accept="image/*"
                className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-black"
              />
              <button className="mt-3 rounded-lg bg-emerald-500 px-4 py-2 text-black transition hover:bg-emerald-400">
                Upload
              </button>
            </form>
            {imageAnalysis && (
              <div className="mt-4 text-sm">
                <div className="text-white/60">
                  Image ready. Ask a question:
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 outline-none placeholder:text-white/40 focus:border-emerald-400/30 focus:ring-2 focus:ring-emerald-400/30"
                    value={imageQuestion}
                    onChange={(e) => setImageQuestion(e.target.value)}
                    placeholder="What does this image show?"
                  />
                  <button
                    className="rounded-lg bg-emerald-500 px-4 py-2 text-black transition hover:bg-emerald-400"
                    onClick={async () => {
                      try {
                        const res = await api.postJson("ask-image", {
                          query: imageQuestion,
                          image_analysis: imageAnalysis,
                        });
                        setImageAnswer(res?.response || null);
                      } catch {}
                    }}
                  >
                    Ask
                  </button>
                </div>
                {imageAnswer && (
                  <div className="mt-3 rounded border border-white/10 bg-black/30 p-3 text-sm">
                    {imageAnswer}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <h2 className="text-lg font-medium">RAG Initialization</h2>
            <p className="mt-1 text-white/60">Upload PDFs to index.</p>
            <form
              className="mt-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const input =
                  (e.currentTarget.elements.namedItem(
                    "pdfs"
                  ) as HTMLInputElement) ?? null;
                if (!input || !input.files || input.files.length === 0) return;
                const data = new FormData();
                for (const f of Array.from(input.files))
                  data.append("files", f);
                setRagUploading(true);
                try {
                  await api.postForm("initialize-rag", data);
                  const s = await api.get("status");
                  setStatus(s);
                } catch {
                } finally {
                  setRagUploading(false);
                }
              }}
            >
              <input
                name="pdfs"
                type="file"
                accept="application/pdf"
                multiple
                className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-black"
              />
              <div className="mt-3 flex gap-2">
                <button
                  disabled={ragUploading}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-black transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {ragUploading ? "Indexing..." : "Index PDFs"}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-white/15 px-4 py-2 text-white/80 hover:bg-white/10"
                  onClick={async () => {
                    try {
                      await api.postJson("clear-session", {});
                      const s = await api.get("status");
                      setStatus(s);
                    } catch {}
                  }}
                >
                  Clear Session
                </button>
              </div>
            </form>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <h2 className="text-lg font-medium">Analyze Video</h2>
            <p className="mt-1 text-white/60">
              Upload a video to analyze (≤100MB).
            </p>
            <form
              className="mt-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const fileInput =
                  (e.currentTarget.elements.namedItem(
                    "video"
                  ) as HTMLInputElement) ?? null;
                if (
                  !fileInput ||
                  !fileInput.files ||
                  fileInput.files.length === 0
                )
                  return;
                const data = new FormData();
                data.append("video", fileInput.files[0]);
                try {
                  const res = await api.postForm("process-video", data);
                  setVideoAnalysis(res?.data || null);
                } catch {
                  setVideoAnalysis(null);
                }
              }}
            >
              <input
                name="video"
                type="file"
                accept="video/*"
                className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-black"
              />
              <button className="mt-3 rounded-lg bg-emerald-500 px-4 py-2 text-black transition hover:bg-emerald-400">
                Upload
              </button>
            </form>
            {videoAnalysis && (
              <div className="mt-4 text-sm">
                <div className="text-white/60">
                  Video ready. Ask a question:
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 outline-none placeholder:text-white/40 focus:border-emerald-400/30 focus:ring-2 focus:ring-emerald-400/30"
                    value={videoQuestion}
                    onChange={(e) => setVideoQuestion(e.target.value)}
                    placeholder="What happens in the video?"
                  />
                  <button
                    className="rounded-lg bg-emerald-500 px-4 py-2 text-black transition hover:bg-emerald-400"
                    onClick={async () => {
                      try {
                        const res = await api.postJson("ask-video", {
                          query: videoQuestion,
                          video_analysis: videoAnalysis,
                        });
                        setVideoAnswer(res?.response || null);
                      } catch {}
                    }}
                  >
                    Ask
                  </button>
                </div>
                {videoAnswer && (
                  <div className="mt-3 rounded border border-white/10 bg-black/30 p-3 text-sm">
                    {videoAnswer}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <h2 className="text-lg font-medium">Enhanced Web Search</h2>
            <p className="mt-1 text-white/60">
              Educational search with engine fallback.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 outline-none placeholder:text-white/40 focus:border-emerald-400/30 focus:ring-2 focus:ring-emerald-400/30"
                placeholder="Search the web..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                className="rounded-lg bg-emerald-500 px-4 py-2 text-black transition hover:bg-emerald-400"
                onClick={async () => {
                  try {
                    const res = await api.postJson("enhanced-search", {
                      query: searchQuery,
                      search_type: "educational",
                    });
                    setSearchResult(res);
                  } catch {}
                }}
              >
                Search
              </button>
            </div>
            {searchResult && (
              <div className="mt-4 text-sm">
                <div className="text-white/60">
                  Engine: {searchResult.engine_used}
                </div>
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-black/30 p-3 text-xs">
                  {JSON.stringify(searchResult.search_data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
