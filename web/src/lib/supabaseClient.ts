"use client";

import { createBrowserClient } from "@supabase/ssr";

export const supabaseBrowser = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as
    | string
    | undefined;

  if (!url || !anonKey) {
    const missing = [
      !url ? "NEXT_PUBLIC_SUPABASE_URL" : null,
      !anonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
    ]
      .filter(Boolean)
      .join(", ");
    throw new Error(
      `Missing Supabase env vars: ${missing}. Set them in your environment or a web/.env.local file.`
    );
  }

  return createBrowserClient(url, anonKey);
};
