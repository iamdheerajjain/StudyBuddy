"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { UserResponse } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { ArrowRight } from "lucide-react";

export default function HomeFinalCTA() {
  const [isAuthed, setIsAuthed] = useState<boolean>(false);

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }: UserResponse) => {
      setIsAuthed(Boolean(data?.user));
    });
  }, []);

  if (isAuthed) {
    return (
      <Link
        href="/dashboard"
        className="btn-ghost hover-lift text-lg px-10 py-4"
      >
        Go to dashboard
      </Link>
    );
  }

  return (
    <Link
      href="/auth"
      className="btn-primary hover-lift inline-flex items-center gap-3 text-lg px-10 py-4 shadow-premium"
    >
      Get started free
      <ArrowRight
        size={20}
        className="transition-transform group-hover:translate-x-1"
      />
    </Link>
  );
}
