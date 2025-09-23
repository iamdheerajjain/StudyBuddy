"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const supabase = supabaseBrowser();
  const [message, setMessage] = useState<string>("Completing sign-in…");

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      setMessage(`Auth error: ${error}`);
      return;
    }

    if (!code) {
      setMessage("Missing code. Returning to sign in…");
      const t = setTimeout(() => (window.location.href = "/auth"), 1000);
      return () => clearTimeout(t);
    }

    (async () => {
      const { error: exchError } = await supabase.auth.exchangeCodeForSession({
        code,
      });
      if (exchError) {
        setMessage(`Auth error: ${exchError.message}`);
        return;
      }
      window.location.replace("/dashboard");
    })();
  }, [supabase]);

  return (
    <main className="grid min-h-[60vh] place-items-center bg-black text-white">
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
        <span className="text-white/80">{message}</span>
      </div>
    </main>
  );
}
