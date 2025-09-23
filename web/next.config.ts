import type { NextConfig } from "next";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

// Load environment variables from the monorepo root .env (if present)
loadEnv({ path: resolve(__dirname, "../.env") });

const nextConfig: NextConfig = {
  // Expose required public env vars to the client as a fallback
  // (Next will inline these during build)
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
};

export default nextConfig;
