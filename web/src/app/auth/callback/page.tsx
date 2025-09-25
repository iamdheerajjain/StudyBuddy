"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser, refreshSupabaseSession } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const supabase = supabaseBrowser();
  const [message, setMessage] = useState<string>("Completing sign-in…");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Processing auth callback...');
        
        // Let Supabase handle the callback automatically
        // This will parse the URL and handle the PKCE flow
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          
          // If session fetch fails, try refreshing
          if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
            console.log('Network error detected, attempting manual refresh...');
            const refreshResult = await refreshSupabaseSession();
            if (refreshResult.success) {
              setMessage('Sign-in successful! Redirecting...');
              setTimeout(() => window.location.replace('/dashboard'), 1000);
              return;
            }
          }
          
          setMessage(`Auth error: ${error.message}`);
          
          // Handle specific PKCE errors
          if (error.message.includes('code verifier') || error.message.includes('auth code')) {
            setMessage('OAuth flow error: Please try signing in again. The authorization may have expired.');
            setTimeout(() => window.location.href = '/auth', 2000);
          }
          return;
        }
        
        if (data.session) {
          console.log('Auth successful:', data.session.user.email);
          setMessage('Sign-in successful! Redirecting...');
          setTimeout(() => window.location.replace('/dashboard'), 1000);
        } else {
          console.log('No session found, checking URL parameters...');
          // Fallback: check URL parameters manually
          const url = new URL(window.location.href);
          const error = url.searchParams.get('error');
          const errorDescription = url.searchParams.get('error_description');
          
          if (error) {
            setMessage(`Auth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`);
          } else {
            setMessage('No active session. Returning to sign in...');
            setTimeout(() => window.location.href = '/auth', 2000);
          }
        }
      } catch (err) {
        console.error('Unexpected error during auth callback:', err);
        setMessage(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };
    
    handleAuthCallback();
  }, [supabase]);

  return (
    <main
      className="grid min-h-[60vh] place-items-center bg-black text-white fade-in"
      data-animate
      suppressHydrationWarning
    >
      <div
        className="flex items-center gap-3 slide-up"
        data-animate
        suppressHydrationWarning
      >
        <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
        <span className="text-white/80">{message}</span>
      </div>
    </main>
  );
}
