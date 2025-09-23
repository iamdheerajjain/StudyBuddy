"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function AuthPage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [debug, setDebug] = useState<string | null>(null);

  const projectInfo = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    try {
      const u = new URL(url);
      const host = u.hostname;
      const ref = host.endsWith("supabase.co") ? host.split(".")[0] : host;
      return { url: u.origin, host, ref };
    } catch {
      return { url, host: "", ref: "" };
    }
  }, []);

  const signIn = async () => {
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setMessage(error.message);
    else {
      setMessage("Signed in");
      window.location.href = "/dashboard";
    }
  };

  const signUp = async () => {
    setMessage(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined,
      },
    });
    if (error) {
      setMessage(`Signup error: ${error.message}`);
      setDebug(null);
    } else {
      const uid = data?.user?.id || "unknown";
      setMessage(`Sign up initiated. User: ${uid}. Check email to confirm.`);
      setDebug(
        JSON.stringify(
          {
            projectRef: projectInfo.ref,
            user: {
              id: data?.user?.id,
              email: data?.user?.email,
              confirmed_at: data?.user?.confirmed_at,
              created_at: data?.user?.created_at,
            },
          },
          null,
          2
        )
      );
    }
  };

  const checkUser = async () => {
    setMessage(null);
    const { data, error } = await supabase.auth.getUser();
    if (error) setMessage(`Session error: ${error.message}`);
    else
      setDebug(
        JSON.stringify(
          {
            projectRef: projectInfo.ref,
            user: data.user
              ? {
                  id: data.user.id,
                  email: data.user.email,
                  confirmed_at: (data.user as any).confirmed_at,
                  created_at: data.user.created_at,
                }
              : null,
          },
          null,
          2
        )
      );
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-md px-6 py-24">
        <h1 className="text-3xl font-semibold">Welcome to Mentorae</h1>
        <p className="mt-2 text-white/70">Sign in or create an account</p>
        <div className="mt-8 space-y-3">
          <input
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 outline-none"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 outline-none"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex gap-3">
            <button
              onClick={signIn}
              className="rounded-lg bg-emerald-500 px-5 py-3 font-medium text-black"
            >
              Sign in
            </button>
            <button
              onClick={signUp}
              className="rounded-lg border border-white/15 px-5 py-3 font-medium"
            >
              Sign up
            </button>
            <button
              onClick={checkUser}
              className="rounded-lg border border-white/15 px-5 py-3 font-medium"
            >
              Check current user
            </button>
          </div>
          <a href="/" className="inline-block text-sm text-white/60 underline">
            Back to home
          </a>
          {message && <p className="text-sm text-white/70">{message}</p>}
          <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-3 text-white/70">
            <div className="text-xs">
              Supabase project: {projectInfo.ref || "unknown"}
            </div>
            <div className="text-xs">
              Project URL: {projectInfo.url || "not set"}
            </div>
            {debug && (
              <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-white/70">
                {debug}
              </pre>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
