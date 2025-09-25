"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  supabaseBrowser,
  checkSessionValidity,
  refreshSupabaseSession,
} from "@/lib/supabaseClient";
import { api } from "@/lib/api";

export default function Dashboard() {
  const supabase = supabaseBrowser();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const tabs = ["Chat", "Media", "RAG", "Search"] as const;
  type Tab = (typeof tabs)[number];
  const [activeTab, setActiveTab] = useState<Tab>("Chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [speechToTextLoading, setSpeechToTextLoading] = useState(false);
  const [textToSpeechLoading, setTextToSpeechLoading] = useState(false);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [imageQuestionLoading, setImageQuestionLoading] = useState(false);
  const [videoUploadLoading, setVideoUploadLoading] = useState(false);
  const [videoQuestionLoading, setVideoQuestionLoading] = useState(false);
  type Status = { store_type?: string } | null;
  const [status, setStatus] = useState<Status>(null);
  const [ragUploading, setRagUploading] = useState(false);
  const [imageAnalysis, setImageAnalysis] = useState<unknown>(null);
  const [imageQuestion, setImageQuestion] = useState("");
  const [imageAnswer, setImageAnswer] = useState<string | null>(null);
  const [imageSessionId, setImageSessionId] = useState<string | null>(null);
  const [imageMessages, setImageMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [videoAnalysis, setVideoAnalysis] = useState<unknown>(null);
  const [videoQuestion, setVideoQuestion] = useState("");
  const [videoAnswer, setVideoAnswer] = useState<string | null>(null);
  const [videoSessionId, setVideoSessionId] = useState<string | null>(null);
  const [videoMessages, setVideoMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<{
    engine_used?: string;
    search_data?: unknown;
  } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"info" | "success" | "error">(
    "info"
  );
  const samplePrompts = useMemo(() => {
    const basePrompts = [
      "Create 5 quiz questions",
      "Explain this image like I'm 12",
      "Outline key ideas from the video",
    ];

    const ragPrompts = [
      "Summarize my indexed PDFs",
      "What are the main topics in my documents?",
      "Find information about [specific topic] in my uploads",
      "Create study notes from my indexed materials",
    ];

    return status?.store_type ? ragPrompts : basePrompts;
  }, [status?.store_type]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: any }) => {
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

  // Persist selected tab
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dashboardTab") as Tab | null;
      if (saved && (tabs as readonly string[]).includes(saved))
        setActiveTab(saved as Tab);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("dashboardTab", activeTab);
    } catch {}
  }, [activeTab]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-hide status messages
  useEffect(() => {
    if (statusMessage && messageType !== "info") {
      const timer = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage, messageType]);

  // Status message utility
  const showStatus = (
    message: string,
    type: "info" | "success" | "error" = "info"
  ) => {
    setStatusMessage(message);
    setMessageType(type);
  };

  const canSend = useMemo(
    () => input.trim().length > 0 && !loading,
    [input, loading]
  );

  // Simple session id generator for media chats
  const generateSessionId = () =>
    `media_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;

  // Create or reuse the most recent chat session for the current user
  const getOrCreateSessionId = async (userId: string): Promise<string> => {
    const { data: existing } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) return existing.id;

    const { data: created, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: userId, title: "New Chat" })
      .select("id")
      .single();

    if (error || !created?.id) throw new Error("Failed to create session");
    return created.id;
  };

  const send = async () => {
    if (!canSend) return;
    const text = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      // Ensure we have a valid session (refresh if expiring)
      const validity = await checkSessionValidity();
      if (!validity.valid || validity.needsRefresh) {
        const refreshed = await refreshSupabaseSession();
        if (!refreshed.success) {
          showStatus("Your session expired. Please sign in again.", "error");
        }
      }

      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id as string | undefined;
      if (!userId) {
        window.location.href = "/auth";
        return;
      }

      // Ensure a chat session exists
      const sessionId = await getOrCreateSessionId(userId);

      // Insert user message (surface any RLS/auth errors)
      {
        const { error: insertUserMsgError } = await supabase
          .from("chat_messages")
          .insert({
            session_id: sessionId,
            user_id: userId,
            role: "user",
            content: text,
            metadata: null,
          });
        if (insertUserMsgError) {
          console.warn(
            "chat_messages insert (user) failed:",
            insertUserMsgError
          );
          showStatus(
            `Could not save your message (RLS/Auth): ${insertUserMsgError.message}`,
            "error"
          );
        }
      }

      // Call backend for AI response
      const requestData: any = { query: text };

      // Include web search results if available
      if (
        searchResult &&
        searchResult.search_data &&
        (searchResult.search_data as any)?.results
      ) {
        console.log("🔍 Including web search results in chat request:", {
          resultsCount: (searchResult.search_data as any).results.length,
          hasAnswer: !!(searchResult.search_data as any).answer,
          engine: searchResult.engine_used,
        });
        requestData.web_search_results = {
          results: (searchResult.search_data as any).results,
          answer: (searchResult.search_data as any).answer,
          engine_used: searchResult.engine_used,
        };
      } else {
        console.log("❌ No web search results available for chat request");
      }

      const res = await api.postJson("ask", requestData);
      const content = (res?.response as string) ?? "No response";

      // Insert assistant message
      {
        const { error: insertAssistantMsgError } = await supabase
          .from("chat_messages")
          .insert({
            session_id: sessionId,
            user_id: userId,
            role: "assistant",
            content,
            metadata: {
              hasRetrieval: !!res?.hasRetrieval,
              retrievedPreview:
                (res?.retrieved as string | undefined)?.slice?.(0, 500) ?? null,
              hasScraping: !!res?.hasScraping,
            },
          });
        if (insertAssistantMsgError) {
          console.warn(
            "chat_messages insert (assistant) failed:",
            insertAssistantMsgError
          );
          showStatus(
            `Could not save assistant reply (RLS/Auth): ${insertAssistantMsgError.message}`,
            "error"
          );
        }
      }

      setMessages((m) => [...m, { role: "assistant", content }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: e instanceof Error ? e.message : "Something went wrong",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen section-premium">
      {/* Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-gradient-to-br from-[color:var(--accent)]/10 to-[color:var(--accent-alt)]/10 rounded-full blur-3xl animate-float-gentle" />
        <div
          className="absolute bottom-20 -right-20 w-[500px] h-[500px] bg-gradient-to-br from-[color:var(--accent-alt)]/8 to-[color:var(--accent)]/8 rounded-full blur-3xl animate-float-gentle"
          style={{ animationDelay: "3s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-[color:var(--accent)]/5 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Status Message Toast */}
      {statusMessage && (
        <div
          className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-premium border backdrop-blur-premium transition-all duration-500 transform ${
            messageType === "success"
              ? "bg-[color:var(--success)]/10 border-[color:var(--success)]/20 text-[color:var(--success)]"
              : messageType === "error"
              ? "bg-[color:var(--error)]/10 border-[color:var(--error)]/20 text-[color:var(--error)]"
              : "bg-[color:var(--info)]/10 border-[color:var(--info)]/20 text-[color:var(--info)]"
          }`}
        >
          <div className="flex items-center gap-3">
            {messageType === "success" && (
              <div className="w-6 h-6 rounded-full bg-[color:var(--success)]/20 flex items-center justify-center">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            )}
            {messageType === "error" && (
              <div className="w-6 h-6 rounded-full bg-[color:var(--error)]/20 flex items-center justify-center">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            )}
            {messageType === "info" && (
              <div className="w-6 h-6 rounded-full bg-[color:var(--info)]/20 flex items-center justify-center">
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <div className="flex-1">
              <span className="font-semibold text-sm">{statusMessage}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="ml-2 text-current/60 hover:text-current transition-colors p-1 rounded-md hover:bg-current/10"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
      <div
        className="container-balanced section-padding fade-in relative z-10"
        data-animate
        suppressHydrationWarning
      >
        <div className="max-w-7xl mx-auto">
          {/* Enhanced Header */}
          <div className="relative mb-16">
            <div className="card-surface-premium p-10 overflow-hidden">
              {/* Decorative background */}
              <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--accent)]/5 via-[color:var(--accent-alt)]/5 to-[color:var(--accent)]/5 opacity-50" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[color:var(--accent)]/10 to-transparent rounded-full blur-3xl" />

              <div className="relative z-10">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-strong)] flex items-center justify-center shadow-premium hover:scale-110 transition-transform duration-300">
                        <svg
                          className="w-8 h-8 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h1 className="text-5xl font-bold tracking-tight text-balance">
                          <span className="text-gradient-primary">
                            AI Tutor
                          </span>
                          <span className="block text-2xl text-[color:var(--foreground)] font-medium mt-1">
                            Dashboard
                          </span>
                        </h1>
                        <p className="text-[color:var(--muted)] font-medium text-lg">
                          Your intelligent learning companion
                        </p>
                      </div>
                    </div>

                    <p className="text-xl text-[color:var(--muted)] text-balance max-w-3xl leading-relaxed">
                      Chat with AI, analyze media, manage your knowledge base,
                      and search the web - all in one integrated workspace
                      designed for professional learning.
                    </p>
                  </div>

                  <div className="flex flex-col gap-6">
                    <div className="glass-panel p-6 min-w-[280px]">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[color:var(--success)]/20 to-[color:var(--success)]/10 flex items-center justify-center">
                          <div className="w-3 h-3 rounded-full bg-[color:var(--success)] animate-glow-pulse" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-[color:var(--muted)] mb-1">
                            Welcome back
                          </div>
                          <div className="font-bold text-lg text-[color:var(--foreground)]">
                            {userEmail?.split("@")[0] || "Guest"}
                          </div>
                          <div className="text-xs text-[color:var(--muted)]">
                            {userEmail ? "Active session" : "Not signed in"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="glass-panel p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[color:var(--info)]/10 flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-[color:var(--info)]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[color:var(--foreground)]">
                            Knowledge Store
                          </div>
                          <div className="text-xs text-[color:var(--muted)]">
                            {status?.store_type || "Not connected"}
                          </div>
                        </div>
                        <div
                          className={`w-2 h-2 rounded-full ml-auto ${
                            status?.store_type
                              ? "bg-[color:var(--success)] animate-pulse"
                              : "bg-[color:var(--muted)]"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Tabs Navigation */}
          <div className="mb-12" data-animate suppressHydrationWarning>
            <div className="card-surface p-2 bg-[color:var(--surface)]/50 backdrop-blur-sm">
              <div
                role="tablist"
                aria-label="Dashboard sections"
                className="stagger grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                {tabs.map((t, index) => {
                  const selected = activeTab === t;
                  const icons = {
                    Chat: (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    ),
                    Media: (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    ),
                    RAG: (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    ),
                    Search: (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    ),
                  };
                  return (
                    <button
                      key={t}
                      role="tab"
                      aria-selected={selected}
                      aria-controls={`panel-${t}`}
                      className={
                        "group relative flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-medium transition-all duration-300 " +
                        (selected
                          ? "bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-strong)] text-white shadow-lg transform scale-[1.02]"
                          : "hover:bg-[color:var(--surface)] hover:shadow-md hover:transform hover:scale-[1.01] text-[color:var(--muted)] hover:text-[color:var(--foreground)]")
                      }
                      onClick={() => setActiveTab(t)}
                    >
                      <div
                        className={`transition-transform group-hover:scale-110 ${
                          selected ? "scale-110" : ""
                        }`}
                      >
                        {icons[t]}
                      </div>
                      <span className="hidden sm:inline font-semibold">
                        {t}
                      </span>
                      {selected && (
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[color:var(--accent)]/20 to-[color:var(--accent-strong)]/20 animate-pulse"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Panels */}
            {/* Enhanced Chat Panel */}
            {activeTab === "Chat" && (
              <section
                id="panel-Chat"
                role="tabpanel"
                aria-labelledby="Chat"
                className="mt-8 fade-in"
              >
                <div className="max-w-5xl mx-auto">
                  <div className="card-surface overflow-hidden bg-gradient-to-br from-[color:var(--surface)] to-[color:var(--surface)]/60 backdrop-blur-sm shadow-2xl">
                    {/* Chat Header */}
                    <div className="border-b border-[color:var(--surface-border)] bg-gradient-to-r from-[color:var(--surface)]/80 to-[color:var(--surface)]/40 p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-strong)] flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                              />
                            </svg>
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-[color:var(--foreground)]">
                              studybuddy AI Assistant
                              {status?.store_type && (
                                <span className="ml-2 text-sm bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-strong)] text-white px-2 py-1 rounded-md font-medium">
                                  📚 RAG Enabled
                                </span>
                              )}
                            </h2>
                            <p className="text-sm text-[color:var(--muted)]">
                              {status?.store_type
                                ? "Chat with your indexed documents + web search + AI assistance"
                                : "Intelligent chat with web search and AI assistance"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[color:var(--accent)]/10 border border-[color:var(--accent)]/20">
                          <div className="w-2 h-2 rounded-full bg-[color:var(--accent)] animate-pulse"></div>
                          <span className="text-xs font-medium text-[color:var(--accent-strong)]">
                            Connected
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Chat Messages */}
                    <div className="p-6">
                      <div className="h-96 overflow-y-auto rounded-xl border border-[color:var(--surface-border)] bg-gradient-to-b from-[color:var(--background)]/50 to-[color:var(--surface)]/30 p-4 scrollbar-thin scrollbar-thumb-[color:var(--accent)]/20 scrollbar-track-transparent">
                        {messages.length === 0 ? (
                          <div className="grid h-full place-items-center">
                            <div className="text-center space-y-4">
                              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[color:var(--accent)]/20 to-[color:var(--accent-alt)]/20 flex items-center justify-center">
                                <svg
                                  className="w-8 h-8 text-[color:var(--accent)]"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                  />
                                </svg>
                              </div>
                              <div>
                                <div className="text-lg font-semibold text-[color:var(--foreground)] mb-2">
                                  Start a conversation
                                </div>
                                <div className="text-sm text-[color:var(--muted)]">
                                  Ask me anything to begin your learning journey
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {messages.map((m, i) => {
                              const isAssistant = m.role === "assistant";
                              return (
                                <div
                                  key={i}
                                  className={`flex items-start gap-3 animate-in slide-in-from-bottom duration-500 ${
                                    isAssistant ? "" : "flex-row-reverse"
                                  }`}
                                >
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                      isAssistant
                                        ? "bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-strong)]"
                                        : "bg-gradient-to-br from-[color:var(--accent-alt)] to-[color:var(--muted)]"
                                    }`}
                                  >
                                    {isAssistant ? (
                                      <svg
                                        className="w-4 h-4 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                        />
                                      </svg>
                                    ) : (
                                      <svg
                                        className="w-4 h-4 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                  <div
                                    className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                                      isAssistant
                                        ? "bg-white/80 border border-[color:var(--surface-border)] text-[color:var(--foreground)]"
                                        : "bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-strong)] text-white"
                                    }`}
                                  >
                                    <div className="text-xs font-medium uppercase tracking-wide opacity-70 mb-2">
                                      {isAssistant ? "AI Assistant" : "You"}
                                    </div>
                                    <div className="whitespace-pre-wrap leading-relaxed text-sm">
                                      {m.content}
                                    </div>
                                    {isAssistant && (
                                      <div className="mt-3 flex items-center gap-2">
                                        <button
                                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[color:var(--surface)] hover:bg-[color:var(--surface-border)] transition-colors text-xs font-medium text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                                          onClick={async () => {
                                            try {
                                              await navigator.clipboard.writeText(
                                                m.content
                                              );
                                            } catch {}
                                          }}
                                          title="Copy message"
                                        >
                                          <svg
                                            className="w-3 h-3"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                            />
                                          </svg>
                                          Copy
                                        </button>
                                        <button
                                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[color:var(--surface)] hover:bg-[color:var(--surface-border)] transition-colors text-xs font-medium text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                                          onClick={async () => {
                                            try {
                                              await api.postJson(
                                                "text-to-speech",
                                                { text: m.content }
                                              );
                                            } catch {}
                                          }}
                                          title="Read aloud"
                                        >
                                          <svg
                                            className="w-3 h-3"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                                            />
                                          </svg>
                                          Speak
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            {loading && (
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-strong)] flex items-center justify-center">
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                </div>
                                <div className="bg-white/80 border border-[color:var(--surface-border)] rounded-2xl px-4 py-3 shadow-sm">
                                  <div className="flex items-center gap-1 text-[color:var(--muted)]">
                                    <div className="w-2 h-2 bg-[color:var(--accent)] rounded-full animate-bounce"></div>
                                    <div
                                      className="w-2 h-2 bg-[color:var(--accent)] rounded-full animate-bounce"
                                      style={{ animationDelay: "0.1s" }}
                                    ></div>
                                    <div
                                      className="w-2 h-2 bg-[color:var(--accent)] rounded-full animate-bounce"
                                      style={{ animationDelay: "0.2s" }}
                                    ></div>
                                    <span className="ml-2 text-sm">
                                      AI is thinking...
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                      {/* Enhanced Input Area */}
                      <div className="mt-6 space-y-4">
                        <div className="flex gap-3">
                          <div className="relative flex-1">
                            <input
                              className="w-full rounded-xl border border-[color:var(--surface-border)] bg-white/50 backdrop-blur-sm px-4 py-3 pr-12 text-[color:var(--foreground)] placeholder:text-[color:var(--muted)]/60 focus:ring-2 focus:ring-[color:var(--accent)]/30 focus:border-[color:var(--accent)] transition-all shadow-sm"
                              placeholder="Ask me anything..."
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  send();
                                }
                              }}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]/40">
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                              </svg>
                            </div>
                          </div>
                          <button
                            onClick={send}
                            disabled={!canSend}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-strong)] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-[1.02] transition-all duration-200 flex items-center gap-2"
                          >
                            {loading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Thinking...</span>
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                  />
                                </svg>
                                <span>Send</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={async () => {
                              setSpeechToTextLoading(true);
                              showStatus("Listening for your voice...", "info");
                              try {
                                const stt = await api.postJson(
                                  "speech-to-text",
                                  {}
                                );
                                if (stt?.query) {
                                  setInput(stt.query);
                                  showStatus(
                                    "Speech recognized successfully!",
                                    "success"
                                  );
                                  // Persist transcript
                                  try {
                                    const { data: userData } =
                                      await supabase.auth.getUser();
                                    const userId = userData.user?.id ?? null;
                                    const { error: transcriptError } =
                                      await supabase
                                        .from("voice_transcripts")
                                        .insert({
                                          user_id: userId,
                                          transcript: stt.query,
                                          duration_seconds:
                                            stt?.duration_seconds ?? null,
                                          metadata: stt ?? null,
                                        });
                                    if (transcriptError) {
                                      console.warn(
                                        "voice_transcripts insert failed:",
                                        transcriptError
                                      );
                                    }
                                  } catch {}
                                } else {
                                  showStatus(
                                    "No speech detected. Please try again.",
                                    "error"
                                  );
                                }
                              } catch {
                                showStatus(
                                  "Failed to recognize speech. Please try again.",
                                  "error"
                                );
                              } finally {
                                setSpeechToTextLoading(false);
                              }
                            }}
                            disabled={speechToTextLoading}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[color:var(--surface)] hover:bg-[color:var(--surface-border)] border border-[color:var(--surface-border)] text-sm font-medium text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {speechToTextLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-[color:var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                                <span>Listening...</span>
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                                  />
                                </svg>
                                <span>Speech to Text</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={async () => {
                              const last = [...messages]
                                .reverse()
                                .find((m) => m.role === "assistant");
                              if (!last) return;
                              setTextToSpeechLoading(true);
                              showStatus(
                                "Converting text to speech...",
                                "info"
                              );
                              try {
                                await api.postJson("text-to-speech", {
                                  text: last.content,
                                });
                                showStatus(
                                  "Text converted to speech successfully!",
                                  "success"
                                );
                              } catch {
                                showStatus(
                                  "Failed to convert text to speech.",
                                  "error"
                                );
                              } finally {
                                setTextToSpeechLoading(false);
                              }
                            }}
                            disabled={
                              textToSpeechLoading ||
                              !messages.some((m) => m.role === "assistant")
                            }
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[color:var(--surface)] hover:bg-[color:var(--surface-border)] border border-[color:var(--surface-border)] text-sm font-medium text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {textToSpeechLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-[color:var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                                <span>Speaking...</span>
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                                  />
                                </svg>
                                <span>Text to Speech</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={async () => {
                              // Stop any ongoing speech/listening
                              try {
                                await api.postJson("stop-speech", {});
                                await api.postJson("stop-listening", {});
                              } catch {}
                              // Clear chat messages
                              setMessages([]);
                            }}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-sm font-medium text-red-600 hover:text-red-700 transition-all hover:scale-[1.02]"
                            title="Clear chat history"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            Clear Chat
                          </button>
                        </div>

                        {/* Control Buttons */}
                        <div className="flex gap-2 text-xs">
                          <button
                            onClick={async () => {
                              try {
                                await api.postJson("stop-speech", {});
                              } catch {}
                            }}
                            className="px-2 py-1 rounded bg-[color:var(--surface)] hover:bg-[color:var(--surface-border)] border border-[color:var(--surface-border)] text-[color:var(--muted)] hover:text-[color:var(--accent)] transition-colors"
                          >
                            Stop Speech
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await api.postJson("stop-listening", {});
                              } catch {}
                            }}
                            className="px-2 py-1 rounded bg-[color:var(--surface)] hover:bg-[color:var(--surface-border)] border border-[color:var(--surface-border)] text-[color:var(--muted)] hover:text-[color:var(--accent)] transition-colors"
                          >
                            Stop Listening
                          </button>
                        </div>

                        {/* Quick Prompts */}
                        <div className="border-t border-[color:var(--surface-border)] pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-[color:var(--foreground)]">
                              Quick Prompts
                            </h3>
                            {status?.store_type && (
                              <div className="flex items-center gap-1 text-xs text-[color:var(--accent)]">
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                                <span>Knowledge Base Active</span>
                              </div>
                            )}
                          </div>
                          {status?.store_type && (
                            <div className="mb-3 p-3 rounded-lg bg-gradient-to-r from-[color:var(--accent)]/5 to-[color:var(--accent-alt)]/5 border border-[color:var(--accent)]/20">
                              <div className="flex items-start gap-2">
                                <svg
                                  className="w-4 h-4 text-[color:var(--accent)] mt-0.5 flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <div className="text-xs text-[color:var(--accent-strong)]">
                                  <p className="font-medium mb-1">
                                    Your knowledge base is ready!
                                  </p>
                                  <p>
                                    Ask questions about your uploaded documents.
                                    The AI will search through your indexed
                                    content and provide cited answers.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Web Sources from Search - shown when results are available */}
                          {searchResult &&
                            searchResult.search_data &&
                            (searchResult.search_data as any)?.results && (
                              <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                    <svg
                                      className="w-4 h-4 text-white"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                      />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-blue-900 mb-2">
                                      Available Web Sources
                                    </h4>
                                    <p className="text-sm text-blue-800 mb-3">
                                      Use these search results in your chat by
                                      referencing them in your questions.
                                    </p>
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                      {(
                                        (searchResult.search_data as any)
                                          .results as any[]
                                      )
                                        .slice(0, 3)
                                        .map((result: any, index: number) => (
                                          <div
                                            key={index}
                                            className="flex items-center gap-2 p-2 bg-white/50 rounded text-xs"
                                          >
                                            <span className="font-semibold text-blue-700">
                                              {index + 1}.
                                            </span>
                                            <div className="flex-1 min-w-0">
                                              <p className="font-medium text-blue-900 truncate">
                                                {result.title}
                                              </p>
                                              <p className="text-blue-600 truncate">
                                                {result.domain}
                                              </p>
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                    <button
                                      onClick={() => setActiveTab("Search")}
                                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                    >
                                      <span>View all results</span>
                                      <svg
                                        className="w-3 h-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9 5l7 7-7 7"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                          <div className="flex flex-wrap gap-2">
                            {samplePrompts.map((p, i) => (
                              <button
                                key={i}
                                className="px-3 py-2 rounded-lg bg-gradient-to-r from-[color:var(--accent)]/10 to-[color:var(--accent-alt)]/10 border border-[color:var(--accent)]/20 text-sm font-medium text-[color:var(--accent-strong)] hover:bg-gradient-to-r hover:from-[color:var(--accent)]/20 hover:to-[color:var(--accent-alt)]/20 hover:scale-[1.02] transition-all"
                                onClick={() => setInput(p)}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Enhanced Media Panel */}
            {activeTab === "Media" && (
              <section
                id="panel-Media"
                role="tabpanel"
                aria-labelledby="Media"
                className="mt-8 fade-in"
              >
                <div className="max-w-7xl mx-auto">
                  <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
                    {/* Image Analysis Card */}
                    <div className="card-surface overflow-hidden bg-gradient-to-br from-[color:var(--surface)] to-[color:var(--surface)]/60 backdrop-blur-sm shadow-xl h-fit">
                      <div className="border-b border-[color:var(--surface-border)] bg-gradient-to-r from-[color:var(--accent)]/5 to-[color:var(--accent-alt)]/5 p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-[color:var(--accent)]/10 flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-[color:var(--accent)]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h2 className="text-xl font-bold text-[color:var(--foreground)]">
                              Image Analysis
                            </h2>
                            <p className="text-sm text-[color:var(--muted)]">
                              Upload and analyze images with AI
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="space-y-6">
                          <form
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
                              setImageUploadLoading(true);
                              showStatus(
                                "Analyzing image... This may take a moment.",
                                "info"
                              );
                              try {
                                const res = await api.postForm(
                                  "process-image",
                                  data
                                );
                                if (res?.data) {
                                  setImageAnalysis(res.data);
                                  // Reset image chat thread and create a new session id for this image
                                  setImageMessages([]);
                                  setImageAnswer(null);
                                  // Log media job (image) success
                                  try {
                                    const { data: userData } =
                                      await supabase.auth.getUser();
                                    const userId = userData.user?.id ?? null;
                                    const { error: mediaJobError } =
                                      await supabase.from("media_jobs").insert({
                                        user_id: userId,
                                        job_type: "image",
                                        input_ref: null,
                                        output_ref: null,
                                        status: "succeeded",
                                        metadata: res?.data ?? null,
                                      });
                                    if (mediaJobError) {
                                      console.warn(
                                        "media_jobs insert (image) failed:",
                                        mediaJobError
                                      );
                                    }
                                  } catch {}
                                  setImageSessionId(generateSessionId());
                                  showStatus(
                                    "Image analyzed successfully!",
                                    "success"
                                  );
                                } else {
                                  showStatus(
                                    "Image analysis completed but no data received.",
                                    "error"
                                  );
                                }
                              } catch {
                                setImageAnalysis(null);
                                showStatus(
                                  "Failed to analyze image. Please try again.",
                                  "error"
                                );
                              } finally {
                                setImageUploadLoading(false);
                              }
                            }}
                            className="space-y-4"
                          >
                            <div className="relative">
                              <input
                                name="image"
                                type="file"
                                accept="image/*"
                                className="w-full p-4 border-2 border-dashed border-[color:var(--surface-border)] rounded-xl bg-[color:var(--background)]/50 hover:border-[color:var(--accent)]/30 transition-colors file:mr-4 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-[color:var(--accent)] file:to-[color:var(--accent-strong)] file:px-4 file:py-2 file:text-white file:font-medium hover:file:shadow-lg file:transition-all"
                              />
                              <div className="absolute top-2 right-2 text-[color:var(--muted)]/60">
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                  />
                                </svg>
                              </div>
                            </div>
                            <button
                              type="submit"
                              disabled={imageUploadLoading}
                              className="w-full px-6 py-3 rounded-xl bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-white font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                              {imageUploadLoading ? (
                                <>
                                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Analyzing Image...</span>
                                </>
                              ) : (
                                <>
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                    />
                                  </svg>
                                  <span>Upload & Analyze Image</span>
                                </>
                              )}
                            </button>
                          </form>

                          {!!imageAnalysis && (
                            <div className="space-y-4 p-4 rounded-xl bg-[color:var(--surface)]/50 border border-[color:var(--surface-border)]">
                              <div className="flex items-center gap-2 text-[color:var(--accent)]">
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span className="font-semibold">
                                  Image processed successfully!
                                </span>
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-[color:var(--foreground)] mb-2">
                                    Ask a question about this image:
                                  </label>
                                  <div className="space-y-2">
                                    <input
                                      className="w-full rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--surface)] px-3 py-2 text-[color:var(--foreground)] placeholder:text-[color:var(--muted)]/60 focus:ring-2 focus:ring-[color:var(--accent)]/30 focus:border-[color:var(--accent)] transition-all"
                                      value={imageQuestion}
                                      onChange={(e) =>
                                        setImageQuestion(e.target.value)
                                      }
                                      placeholder="What does this image show?"
                                    />
                                    <button
                                      onClick={async () => {
                                        setImageQuestionLoading(true);
                                        showStatus(
                                          "Processing your question about the image...",
                                          "info"
                                        );
                                        try {
                                          // Resolve or create a stable session id for this ask
                                          const sid =
                                            imageSessionId ||
                                            generateSessionId();
                                          if (!imageSessionId)
                                            setImageSessionId(sid);

                                          const requestData: any = {
                                            query: imageQuestion,
                                            image_analysis: imageAnalysis,
                                          };

                                          // Include web search results if available
                                          if (
                                            searchResult &&
                                            searchResult.search_data &&
                                            (searchResult.search_data as any)
                                              ?.results
                                          ) {
                                            requestData.web_search_results = {
                                              results: (
                                                searchResult.search_data as any
                                              ).results,
                                              answer: (
                                                searchResult.search_data as any
                                              ).answer,
                                              engine_used:
                                                searchResult.engine_used,
                                            };
                                          }

                                          const res = await api.postJson(
                                            "ask-image",
                                            { ...requestData, session_id: sid }
                                          );
                                          if (res?.response) {
                                            // Persist image question/answer
                                            try {
                                              const { data: userData } =
                                                await supabase.auth.getUser();
                                              const userId =
                                                userData.user?.id ?? null;
                                              const { error: imageQaError } =
                                                await supabase
                                                  .from("image_questions")
                                                  .insert({
                                                    user_id: userId,
                                                    question: imageQuestion,
                                                    image_ref: null,
                                                    answer: res.response,
                                                    metadata: res?.data ?? null,
                                                  });
                                              if (imageQaError) {
                                                console.warn(
                                                  "image_questions insert failed:",
                                                  imageQaError
                                                );
                                              }
                                            } catch {}

                                            // Append to thread
                                            setImageMessages((m) => [
                                              ...m,
                                              {
                                                role: "user",
                                                content: imageQuestion,
                                              },
                                              {
                                                role: "assistant",
                                                content: res.response,
                                              },
                                            ]);
                                            setImageQuestion("");
                                            setImageAnswer(res.response);
                                            showStatus(
                                              "Question answered successfully!",
                                              "success"
                                            );
                                          } else {
                                            showStatus(
                                              "No response received. Please try again.",
                                              "error"
                                            );
                                          }
                                        } catch {
                                          showStatus(
                                            "Failed to process question. Please try again.",
                                            "error"
                                          );
                                        } finally {
                                          setImageQuestionLoading(false);
                                        }
                                      }}
                                      disabled={
                                        imageQuestionLoading ||
                                        !imageQuestion.trim()
                                      }
                                      className="w-full px-4 py-2 rounded-lg bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-white font-medium hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                                    >
                                      {imageQuestionLoading ? (
                                        <>
                                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                          <span>Thinking...</span>
                                        </>
                                      ) : (
                                        <span>Ask Question</span>
                                      )}
                                    </button>
                                  </div>
                                </div>
                                {imageMessages.length > 0 && (
                                  <div className="mt-4 p-4 rounded-lg bg-white border border-[color:var(--surface-border)] shadow-sm">
                                    <div className="space-y-3">
                                      {imageMessages.map((m, idx) => (
                                        <div
                                          key={idx}
                                          className={
                                            m.role === "user"
                                              ? "text-[color:var(--foreground)]"
                                              : "text-[color:var(--foreground)]/90"
                                          }
                                        >
                                          <div className="text-xs font-medium text-[color:var(--muted)] mb-1">
                                            {m.role === "user" ? "You" : "AI"}
                                          </div>
                                          <div className="leading-relaxed whitespace-pre-wrap">
                                            {m.content}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Video Analysis Card */}
                    <div className="card-surface overflow-hidden bg-gradient-to-br from-[color:var(--surface)] to-[color:var(--surface)]/60 backdrop-blur-sm shadow-xl h-fit">
                      <div className="border-b border-[color:var(--surface-border)] bg-gradient-to-r from-[color:var(--accent)]/5 to-[color:var(--accent-alt)]/5 p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-[color:var(--accent)]/10 flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-[color:var(--accent)]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h2 className="text-xl font-bold text-[color:var(--foreground)]">
                              Video Analysis
                            </h2>
                            <p className="text-sm text-[color:var(--muted)]">
                              Upload videos up to 100MB for AI analysis
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="space-y-6">
                          <form
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
                              setVideoUploadLoading(true);
                              showStatus(
                                "Analyzing video... This may take several minutes for large files.",
                                "info"
                              );
                              try {
                                const res = await api.postForm(
                                  "process-video",
                                  data
                                );
                                if (res?.data) {
                                  setVideoAnalysis(res.data);
                                  // Reset video chat thread and create a new session id for this video
                                  setVideoMessages([]);
                                  setVideoAnswer(null);
                                  setVideoSessionId(generateSessionId());
                                  showStatus(
                                    "Video analyzed successfully!",
                                    "success"
                                  );
                                  // Log media job (video) success
                                  try {
                                    const { data: userData } =
                                      await supabase.auth.getUser();
                                    const userId = userData.user?.id ?? null;
                                    const { error: mediaJobError } =
                                      await supabase.from("media_jobs").insert({
                                        user_id: userId,
                                        job_type: "video",
                                        input_ref: null,
                                        output_ref: null,
                                        status: "succeeded",
                                        metadata: res?.data ?? null,
                                      });
                                    if (mediaJobError) {
                                      console.warn(
                                        "media_jobs insert (video) failed:",
                                        mediaJobError
                                      );
                                    }
                                  } catch {}
                                } else {
                                  showStatus(
                                    "Video analysis completed but no data received.",
                                    "error"
                                  );
                                }
                              } catch {
                                setVideoAnalysis(null);
                                showStatus(
                                  "Failed to analyze video. Please try again.",
                                  "error"
                                );
                              } finally {
                                setVideoUploadLoading(false);
                              }
                            }}
                            className="space-y-4"
                          >
                            <div className="relative">
                              <input
                                name="video"
                                type="file"
                                accept="video/*"
                                className="w-full p-4 border-2 border-dashed border-[color:var(--surface-border)] rounded-xl bg-[color:var(--background)]/50 hover:border-[color:var(--accent)]/30 transition-colors file:mr-4 file:rounded-lg file:border-0 file:bg-[color:var(--accent)] file:px-4 file:py-2 file:text-white file:font-medium hover:file:shadow-lg file:transition-all"
                              />
                              <div className="absolute top-2 right-2 text-[color:var(--muted)]/60">
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                  />
                                </svg>
                              </div>
                            </div>
                            <div className="text-xs text-[color:var(--muted)] bg-[color:var(--surface)]/50 border border-[color:var(--surface-border)] rounded-lg p-3">
                              <svg
                                className="w-4 h-4 inline mr-2 text-[color:var(--accent)]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                />
                              </svg>
                              Maximum file size: 100MB. Supported formats: MP4,
                              AVI, MOV, WMV
                            </div>
                            <button
                              type="submit"
                              disabled={videoUploadLoading}
                              className="w-full px-6 py-3 rounded-xl bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-white font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                              {videoUploadLoading ? (
                                <>
                                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Analyzing Video...</span>
                                </>
                              ) : (
                                <>
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                    />
                                  </svg>
                                  <span>Upload & Analyze Video</span>
                                </>
                              )}
                            </button>
                          </form>

                          {!!videoAnalysis && (
                            <div className="space-y-4 p-4 rounded-xl bg-[color:var(--surface)]/50 border border-[color:var(--surface-border)]">
                              <div className="flex items-center gap-2 text-[color:var(--accent)]">
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span className="font-semibold">
                                  Video processed successfully!
                                </span>
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-[color:var(--foreground)] mb-2">
                                    Ask a question about this video:
                                  </label>
                                  <div className="space-y-2">
                                    <input
                                      className="w-full rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--surface)] px-3 py-2 text-[color:var(--foreground)] placeholder:text-[color:var(--muted)]/60 focus:ring-2 focus:ring-[color:var(--accent)]/30 focus:border-[color:var(--accent)] transition-all"
                                      value={videoQuestion}
                                      onChange={(e) =>
                                        setVideoQuestion(e.target.value)
                                      }
                                      placeholder="What happens in the video?"
                                    />
                                    <button
                                      onClick={async () => {
                                        setVideoQuestionLoading(true);
                                        showStatus(
                                          "Processing your question about the video...",
                                          "info"
                                        );
                                        try {
                                          // Resolve or create a stable session id for this ask
                                          const sid =
                                            videoSessionId ||
                                            generateSessionId();
                                          if (!videoSessionId)
                                            setVideoSessionId(sid);

                                          const requestData: any = {
                                            query: videoQuestion,
                                            video_analysis: videoAnalysis,
                                          };

                                          // Include web search results if available
                                          if (
                                            searchResult &&
                                            searchResult.search_data &&
                                            (searchResult.search_data as any)
                                              ?.results
                                          ) {
                                            requestData.web_search_results = {
                                              results: (
                                                searchResult.search_data as any
                                              ).results,
                                              answer: (
                                                searchResult.search_data as any
                                              ).answer,
                                              engine_used:
                                                searchResult.engine_used,
                                            };
                                          }

                                          const res = await api.postJson(
                                            "ask-video",
                                            { ...requestData, session_id: sid }
                                          );
                                          if (res?.response) {
                                            // Append to thread
                                            setVideoMessages((m) => [
                                              ...m,
                                              {
                                                role: "user",
                                                content: videoQuestion,
                                              },
                                              {
                                                role: "assistant",
                                                content: res.response,
                                              },
                                            ]);
                                            setVideoQuestion("");
                                            setVideoAnswer(res.response);
                                            showStatus(
                                              "Question answered successfully!",
                                              "success"
                                            );
                                          } else {
                                            showStatus(
                                              "No response received. Please try again.",
                                              "error"
                                            );
                                          }
                                        } catch {
                                          showStatus(
                                            "Failed to process question. Please try again.",
                                            "error"
                                          );
                                        } finally {
                                          setVideoQuestionLoading(false);
                                        }
                                      }}
                                      disabled={
                                        videoQuestionLoading ||
                                        !videoQuestion.trim()
                                      }
                                      className="w-full px-4 py-2 rounded-lg bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-white font-medium hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                                    >
                                      {videoQuestionLoading ? (
                                        <>
                                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                          <span>Thinking...</span>
                                        </>
                                      ) : (
                                        <span>Ask Question</span>
                                      )}
                                    </button>
                                  </div>
                                </div>
                                {videoMessages.length > 0 && (
                                  <div className="mt-4 p-4 rounded-lg bg-white border border-[color:var(--surface-border)] shadow-sm">
                                    <div className="space-y-3">
                                      {videoMessages.map((m, idx) => (
                                        <div
                                          key={idx}
                                          className={
                                            m.role === "user"
                                              ? "text-[color:var(--foreground)]"
                                              : "text-[color:var(--foreground)]/90"
                                          }
                                        >
                                          <div className="text-xs font-medium text-[color:var(--muted)] mb-1">
                                            {m.role === "user" ? "You" : "AI"}
                                          </div>
                                          <div className="leading-relaxed whitespace-pre-wrap">
                                            {m.content}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Enhanced RAG Panel */}
            {activeTab === "RAG" && (
              <section
                id="panel-RAG"
                role="tabpanel"
                aria-labelledby="RAG"
                className="mt-8 fade-in"
              >
                <div className="max-w-5xl mx-auto">
                  <div className="card-surface overflow-hidden bg-gradient-to-br from-[color:var(--surface)] to-[color:var(--surface)]/60 backdrop-blur-sm shadow-xl">
                    {/* RAG Header */}
                    <div className="border-b border-[color:var(--surface-border)] bg-gradient-to-r from-[color:var(--accent)]/5 to-[color:var(--accent-alt)]/5 p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-[color:var(--accent)]/10 flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-[color:var(--accent)]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-[color:var(--foreground)]">
                              Knowledge Base (RAG)
                            </h2>
                            <p className="text-sm text-[color:var(--muted)]">
                              Upload and index PDF documents for intelligent
                              retrieval
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[color:var(--surface)] border border-[color:var(--surface-border)]">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              status?.store_type
                                ? "bg-[color:var(--accent)] animate-pulse"
                                : "bg-gray-400"
                            }`}
                          ></div>
                          <span className="text-xs font-medium text-[color:var(--muted)]">
                            Store: {status?.store_type || "Not connected"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Upload Form */}
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const input =
                            (e.currentTarget.elements.namedItem(
                              "pdfs"
                            ) as HTMLInputElement) ?? null;
                          if (
                            !input ||
                            !input.files ||
                            input.files.length === 0
                          )
                            return;
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
                        className="space-y-4"
                      >
                        <div className="relative">
                          <input
                            name="pdfs"
                            type="file"
                            accept="application/pdf"
                            multiple
                            className="w-full p-6 border-2 border-dashed border-[color:var(--surface-border)] rounded-xl bg-[color:var(--background)]/50 hover:border-[color:var(--accent)]/30 transition-colors file:mr-4 file:rounded-lg file:border-0 file:bg-[color:var(--accent)] file:px-4 file:py-2 file:text-white file:font-medium hover:file:shadow-lg file:transition-all"
                          />
                          <div className="absolute top-3 right-3 text-[color:var(--muted)]/60">
                            <svg
                              className="w-6 h-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        </div>

                        <div className="text-sm text-[color:var(--muted)] bg-[color:var(--surface)]/50 border border-[color:var(--surface-border)] rounded-lg p-4">
                          <div className="flex items-start gap-2">
                            <svg
                              className="w-5 h-5 text-[color:var(--accent)] mt-0.5 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <div>
                              <div className="font-medium text-[color:var(--foreground)] mb-1">
                                How it works:
                              </div>
                              <ul className="text-[color:var(--muted)] space-y-1 text-xs">
                                <li>
                                  • Upload multiple PDF files to create your
                                  knowledge base
                                </li>
                                <li>
                                  • Documents are processed and indexed for fast
                                  retrieval
                                </li>
                                <li>
                                  • Ask questions and get answers with citations
                                  from your documents
                                </li>
                                <li>
                                  • Supports academic papers, textbooks, notes,
                                  and more
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="submit"
                            disabled={ragUploading}
                            className="flex-1 px-6 py-3 rounded-xl bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
                          >
                            {ragUploading ? (
                              <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Processing Documents...</span>
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                  />
                                </svg>
                                <span>Index Documents</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            className="px-6 py-3 rounded-xl bg-[color:var(--surface)] hover:bg-[color:var(--surface)]/80 border border-[color:var(--surface-border)] text-[color:var(--foreground)] hover:text-[color:var(--accent)] font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-200 flex items-center gap-2"
                            onClick={async () => {
                              // Stop any ongoing speech/listening
                              try {
                                await api.postJson("stop-speech", {});
                                await api.postJson("stop-listening", {});
                              } catch {}
                              // Clear RAG session
                              try {
                                await api.postJson("clear-session", {});
                                const s = await api.get("status");
                                setStatus(s);
                              } catch {}
                            }}
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            Clear Session
                          </button>
                        </div>
                      </form>

                      {/* Status Display */}
                      {status?.store_type && (
                        <div className="p-4 rounded-xl bg-[color:var(--surface)]/50 border border-[color:var(--surface-border)]">
                          <div className="flex items-center gap-2 text-[color:var(--accent)]">
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span className="font-semibold">
                              Knowledge base is active and ready!
                            </span>
                          </div>
                          <p className="text-sm text-[color:var(--muted)] mt-2">
                            Your documents have been indexed and are ready for
                            intelligent retrieval.
                          </p>
                          <div className="mt-4 flex gap-3">
                            <button
                              onClick={() => setActiveTab("Chat")}
                              className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-strong)] text-white font-medium hover:shadow-lg hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                              </svg>
                              Start Chatting with Your Documents
                            </button>
                          </div>
                          <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                            <div className="flex items-start gap-2">
                              <svg
                                className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <div className="text-sm text-blue-800">
                                <p className="font-medium mb-1">
                                  How to use your knowledge base:
                                </p>
                                <p className="text-xs">
                                  Go to the{" "}
                                  <span className="font-semibold">
                                    Chat tab
                                  </span>{" "}
                                  and ask questions about your uploaded
                                  documents. The AI will search through your
                                  indexed content and provide answers with
                                  citations.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Enhanced Search Panel */}
            {activeTab === "Search" && (
              <section
                id="panel-Search"
                role="tabpanel"
                aria-labelledby="Search"
                className="mt-8 fade-in"
              >
                <div className="max-w-5xl mx-auto">
                  <div className="card-surface overflow-hidden bg-gradient-to-br from-[color:var(--surface)] to-[color:var(--surface)]/60 backdrop-blur-sm shadow-xl">
                    {/* Search Header */}
                    <div className="border-b border-[color:var(--surface-border)] bg-gradient-to-r from-[color:var(--accent)]/5 to-[color:var(--accent-alt)]/5 p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[color:var(--accent)]/10 flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-[color:var(--accent)]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-[color:var(--foreground)]">
                            Enhanced Web Search
                          </h2>
                          <p className="text-sm text-[color:var(--muted)]">
                            Educational search with intelligent engine fallback
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Search Input */}
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="relative flex-1">
                            <input
                              className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--surface)]/50 backdrop-blur-sm px-4 py-3 pr-12 text-[color:var(--foreground)] placeholder:text-[color:var(--muted)]/60 focus:ring-2 focus:ring-[color:var(--accent)]/30 focus:border-[color:var(--accent)] transition-all shadow-sm"
                              placeholder="Search the web for educational content..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !searchLoading) {
                                  e.preventDefault();
                                  // Trigger search
                                  const searchButton = document.querySelector(
                                    "[data-search-button]"
                                  ) as HTMLButtonElement;
                                  searchButton?.click();
                                }
                              }}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]/40">
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                              </svg>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              setSpeechToTextLoading(true);
                              showStatus("Listening for your voice...", "info");
                              try {
                                const stt = await api.postJson(
                                  "speech-to-text",
                                  {}
                                );
                                if (stt?.query) {
                                  setSearchQuery(stt.query);
                                  showStatus(
                                    "Speech recognized successfully!",
                                    "success"
                                  );
                                } else {
                                  showStatus(
                                    "No speech detected. Please try again.",
                                    "error"
                                  );
                                }
                              } catch {
                                showStatus(
                                  "Failed to recognize speech. Please try again.",
                                  "error"
                                );
                              } finally {
                                setSpeechToTextLoading(false);
                              }
                            }}
                            disabled={speechToTextLoading}
                            className="px-4 py-3 rounded-xl bg-[color:var(--surface)] hover:bg-[color:var(--surface-border)] border border-[color:var(--surface-border)] text-[color:var(--muted)] hover:text-[color:var(--accent)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            title="Voice to text"
                          >
                            {speechToTextLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-[color:var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-sm font-medium">
                                  Listening...
                                </span>
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                                  />
                                </svg>
                                <span className="text-sm font-medium hidden sm:inline">
                                  Voice
                                </span>
                              </>
                            )}
                          </button>
                          <button
                            data-search-button
                            className="px-6 py-3 rounded-xl bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-[1.02] transition-all duration-200 flex items-center gap-2"
                            onClick={async () => {
                              if (!searchQuery.trim() || searchLoading) return;
                              try {
                                setSearchLoading(true);
                                const res = await api.postJson(
                                  "enhanced-search",
                                  {
                                    query: searchQuery,
                                    search_type: "educational",
                                  }
                                );
                                setSearchResult(res);

                                // Log search to Supabase
                                const { data: userData } =
                                  await supabase.auth.getUser();
                                const userId = userData.user?.id ?? null;
                                {
                                  const { error: insertSearchLogError } =
                                    await supabase.from("search_logs").insert({
                                      user_id: userId,
                                      query: searchQuery,
                                      search_type: "educational",
                                      result: res,
                                    });
                                  if (insertSearchLogError) {
                                    console.warn(
                                      "search_logs insert failed:",
                                      insertSearchLogError
                                    );
                                    // Non-blocking notice
                                    showStatus(
                                      `Could not save search log (RLS/Auth): ${insertSearchLogError.message}`,
                                      "error"
                                    );
                                  }
                                }
                              } catch {
                              } finally {
                                setSearchLoading(false);
                              }
                            }}
                            disabled={!searchQuery.trim() || searchLoading}
                          >
                            {searchLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Searching...</span>
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                  />
                                </svg>
                                <span>Search</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Search Info */}
                        <div className="text-sm text-[color:var(--muted)] bg-[color:var(--surface)]/50 border border-[color:var(--surface-border)] rounded-lg p-4">
                          <div className="flex items-start gap-2">
                            <svg
                              className="w-5 h-5 text-[color:var(--accent)] mt-0.5 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <div>
                              <div className="font-medium text-[color:var(--foreground)] mb-1">
                                Smart Search Features:
                              </div>
                              <ul className="text-[color:var(--muted)] space-y-1 text-xs">
                                <li>
                                  • Optimized for educational and academic
                                  content
                                </li>
                                <li>
                                  • Automatic fallback between multiple search
                                  engines
                                </li>
                                <li>
                                  • Voice-to-text input support for hands-free
                                  searching
                                </li>
                                <li>
                                  • Filters for high-quality, reliable sources
                                </li>
                                <li>• Results saved to your search history</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Search Results */}
                      {searchResult && searchResult.search_data && (
                        <div className="space-y-6">
                          {/* Results Header */}
                          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-[color:var(--accent)]/10 to-[color:var(--accent-alt)]/10 border border-[color:var(--accent)]/20">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[color:var(--accent)] flex items-center justify-center">
                                <svg
                                  className="w-5 h-5 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </div>
                              <div>
                                <h3 className="font-bold text-[color:var(--foreground)] text-lg">
                                  Search Results
                                </h3>
                                <p className="text-sm text-[color:var(--muted)]">
                                  Found{" "}
                                  {(searchResult.search_data as any)
                                    ?.total_results ||
                                    (searchResult.search_data as any)?.results
                                      ?.length ||
                                    0}{" "}
                                  results
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/50 border border-[color:var(--surface-border)]">
                              <svg
                                className="w-4 h-4 text-[color:var(--accent)]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <span className="text-sm font-medium text-[color:var(--accent)]">
                                Engine: {searchResult.engine_used || "Unknown"}
                              </span>
                            </div>
                          </div>

                          {/* AI Answer Summary */}
                          {(searchResult.search_data as any)?.answer && (
                            <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                  <svg
                                    className="w-4 h-4 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                    />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-blue-900 mb-2">
                                    AI Summary
                                  </h4>
                                  <p className="text-blue-800 leading-relaxed">
                                    {(searchResult.search_data as any).answer}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Search Results Grid */}
                          {(searchResult.search_data as any)?.results &&
                            Array.isArray(
                              (searchResult.search_data as any).results
                            ) && (
                              <div className="space-y-4">
                                <h4 className="text-lg font-semibold text-[color:var(--foreground)] flex items-center gap-2">
                                  <svg
                                    className="w-5 h-5 text-[color:var(--accent)]"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                                    />
                                  </svg>
                                  Web Sources
                                </h4>
                                <div className="grid gap-4 md:grid-cols-1">
                                  {(
                                    (searchResult.search_data as any)
                                      .results as any[]
                                  )
                                    .slice(0, 6)
                                    .map((result: any, index: number) => (
                                      <div
                                        key={index}
                                        className="group bg-white rounded-xl border border-[color:var(--surface-border)] hover:border-[color:var(--accent)]/30 hover:shadow-lg transition-all duration-200 overflow-hidden"
                                      >
                                        <div className="p-5">
                                          <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[color:var(--accent)]/10 to-[color:var(--accent-alt)]/10 flex items-center justify-center flex-shrink-0">
                                              <span className="text-[color:var(--accent)] font-bold text-sm">
                                                {index + 1}
                                              </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <h5 className="font-semibold text-[color:var(--foreground)] group-hover:text-[color:var(--accent)] transition-colors line-clamp-2 mb-2">
                                                {result.title || "Untitled"}
                                              </h5>
                                              <div className="flex items-center gap-2 mb-3">
                                                <div className="flex items-center gap-1 text-xs text-[color:var(--muted)]">
                                                  <svg
                                                    className="w-3 h-3"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                  >
                                                    <path
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                      strokeWidth={2}
                                                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
                                                    />
                                                  </svg>
                                                  <span className="font-medium">
                                                    {result.domain ||
                                                      new URL(
                                                        result.url ||
                                                          "https://example.com"
                                                      ).hostname.replace(
                                                        "www.",
                                                        ""
                                                      )}
                                                  </span>
                                                </div>
                                                {result.score && (
                                                  <div className="flex items-center gap-1">
                                                    <div className="flex">
                                                      {Array.from(
                                                        { length: 5 },
                                                        (_, i) => (
                                                          <svg
                                                            key={i}
                                                            className={`w-3 h-3 ${
                                                              i <
                                                              Math.floor(
                                                                result.score * 5
                                                              )
                                                                ? "text-yellow-400"
                                                                : "text-gray-300"
                                                            }`}
                                                            fill="currentColor"
                                                            viewBox="0 0 20 20"
                                                          >
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                          </svg>
                                                        )
                                                      )}
                                                    </div>
                                                    <span className="text-xs text-[color:var(--muted)]">
                                                      {(
                                                        result.score * 100
                                                      ).toFixed(0)}
                                                      %
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                              <p className="text-sm text-[color:var(--muted)] leading-relaxed mb-4 line-clamp-3">
                                                {result.snippet ||
                                                  result.content?.substring(
                                                    0,
                                                    200
                                                  ) + "..." ||
                                                  "No description available"}
                                              </p>
                                              <div className="flex items-center justify-between">
                                                <a
                                                  href={result.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--accent)] hover:text-[color:var(--accent-strong)] transition-colors"
                                                >
                                                  <span>Read More</span>
                                                  <svg
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                  >
                                                    <path
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                      strokeWidth={2}
                                                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                    />
                                                  </svg>
                                                </a>
                                                {result.published_date && (
                                                  <span className="text-xs text-[color:var(--muted)] flex items-center gap-1">
                                                    <svg
                                                      className="w-3 h-3"
                                                      fill="none"
                                                      stroke="currentColor"
                                                      viewBox="0 0 24 24"
                                                    >
                                                      <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                      />
                                                    </svg>
                                                    {new Date(
                                                      result.published_date
                                                    ).toLocaleDateString()}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-3 pt-4 border-t border-[color:var(--surface-border)]">
                            <button
                              onClick={async () => {
                                // Stop any ongoing speech/listening
                                try {
                                  await api.postJson("stop-speech", {});
                                  await api.postJson("stop-listening", {});
                                } catch {}
                                // Clear search results
                                setSearchResult(null);
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[color:var(--surface)] hover:bg-[color:var(--surface-border)] border border-[color:var(--surface-border)] text-sm font-medium text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-all hover:scale-[1.02]"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                              Clear Results
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const data = searchResult.search_data as any;
                                  const answerSection = data?.answer
                                    ? `AI Summary: ${data.answer}\n\n`
                                    : "";
                                  const resultsSection =
                                    data?.results
                                      ?.map(
                                        (r: any, i: number) =>
                                          `${i + 1}. ${r.title}\n   ${
                                            r.url
                                          }\n   ${
                                            r.snippet ||
                                            r.content?.substring(0, 150) +
                                              "..." ||
                                            ""
                                          }\n`
                                      )
                                      .join("\n") || "";
                                  const summaryText = `Search Results for "${searchQuery}"\n\n${answerSection}${resultsSection}`;
                                  await navigator.clipboard.writeText(
                                    summaryText
                                  );
                                  showStatus(
                                    "Search results copied to clipboard!",
                                    "success"
                                  );
                                } catch {
                                  showStatus("Failed to copy results", "error");
                                }
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[color:var(--accent)]/10 hover:bg-[color:var(--accent)]/20 border border-[color:var(--accent)]/20 text-sm font-medium text-[color:var(--accent-strong)] transition-all hover:scale-[1.02]"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                              Copy Summary
                            </button>
                            <button
                              onClick={() => {
                                const query = encodeURIComponent(searchQuery);
                                window.open(
                                  `https://www.google.com/search?q=${query}`,
                                  "_blank"
                                );
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-sm font-medium text-blue-700 transition-all hover:scale-[1.02]"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                              </svg>
                              Search on Google
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
