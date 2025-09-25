"use client";

import { createBrowserClient } from "@supabase/ssr";

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export const supabaseBrowser = () => {
  // Return cached instance if available
  if (supabaseInstance) {
    return supabaseInstance;
  }

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

  // Add debugging only in development
  if (process.env.NODE_ENV === "development") {
    console.log("Supabase config:", {
      url,
      anonKey: anonKey?.substring(0, 20) + "...",
    });
  }

  try {
    // Use minimal configuration to prevent token refresh issues
    // Based on experience: autoRefreshToken can cause "Failed to fetch" errors
    supabaseInstance = createBrowserClient(url, anonKey, {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: false, // Temporarily disable to prevent fetch errors
        debug: process.env.NODE_ENV === "development",
      },
      global: {
        fetch: (url, options = {}) => {
          // Add retry logic for fetch failures
          return fetchWithRetry(url, options);
        },
      },
    });

    return supabaseInstance;
  } catch (error) {
    console.error("Failed to create Supabase client:", error);
    throw error;
  }
};

// Custom fetch with retry logic for handling network issues
async function fetchWithRetry(
  url: RequestInfo | URL,
  options: RequestInit = {},
  maxRetries = 2
): Promise<Response> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Respect any incoming AbortSignal while also supporting a timeout
    const originalSignal: AbortSignal | undefined = options.signal as
      | AbortSignal
      | undefined;
    const controller = new AbortController();

    // If the caller provided a signal, mirror its aborts into our controller
    const onAbort = () => controller.abort((originalSignal as any).reason);
    if (originalSignal) {
      if (originalSignal.aborted) {
        controller.abort((originalSignal as any).reason);
      } else {
        originalSignal.addEventListener("abort", onAbort, { once: true });
      }
    }

    // Implement a manual timeout (10s)
    const timeoutMs = 10000;
    const timeoutId = setTimeout(() => controller.abort("timeout"), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        // Use our composed signal that respects both original aborts and timeout
        signal: controller.signal,
      });

      // Cleanup listeners and timers
      clearTimeout(timeoutId);
      if (originalSignal) {
        originalSignal.removeEventListener("abort", onAbort as any);
      }

      // If successful or non-5xx, return the response without retrying
      if (response.ok || response.status < 500) {
        return response;
      }

      // For server errors, retry when attempts remain
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1))
        );
        continue;
      }

      return response;
    } catch (error) {
      // Cleanup on error too
      clearTimeout(timeoutId);
      if (originalSignal) {
        originalSignal.removeEventListener("abort", onAbort as any);
      }

      lastError =
        error instanceof Error ? error : new Error("Unknown fetch error");

      // If aborted (by caller or timeout) or out of retries, rethrow
      if (lastError.name === "AbortError" || attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw lastError!;
}

// Manual token refresh function for controlled refresh attempts
export const refreshSupabaseSession = async () => {
  const supabase = supabaseBrowser();
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.warn("Manual session refresh failed:", error.message);
      return { success: false, error: error.message };
    }
    console.log("Session refreshed successfully");
    return { success: true, session: data.session };
  } catch (error) {
    console.warn("Manual session refresh error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown refresh error",
    };
  }
};

// Check if current session is valid or needs refresh
export const checkSessionValidity = async () => {
  const supabase = supabaseBrowser();
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) {
      return { valid: false, needsRefresh: true, error: error.message };
    }
    if (!session) {
      return { valid: false, needsRefresh: false, error: "No session" };
    }

    // Check if token expires soon (within 5 minutes)
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const needsRefresh = expiresAt ? expiresAt - now < 300 : false;

    return { valid: true, needsRefresh, session };
  } catch (error) {
    return {
      valid: false,
      needsRefresh: true,
      error: error instanceof Error ? error.message : "Unknown session error",
    };
  }
};
