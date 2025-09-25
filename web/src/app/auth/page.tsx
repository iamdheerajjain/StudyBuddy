"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser, refreshSupabaseSession, checkSessionValidity } from "@/lib/supabaseClient";
import { testSupabaseConnection, testNetworkConnectivity, testOAuthProviders, testAPIKeyValidity } from "@/lib/connectionTest";

type TabKey = "email" | "oauth";

export default function AuthPage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [debug, setDebug] = useState<string | null>(null);
  const [active, setActive] = useState<TabKey>("email");
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  // Removed project info block

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check if we have a valid session
        const sessionCheck = await checkSessionValidity();
        
        if (sessionCheck.valid) {
          setUserEmail(sessionCheck.session?.user?.email ?? null);
        } else if (sessionCheck.needsRefresh) {
          // Try manual refresh if session exists but needs refresh
          console.log('Attempting manual session refresh...');
          const refreshResult = await refreshSupabaseSession();
          if (refreshResult.success) {
            setUserEmail(refreshResult.session?.user?.email ?? null);
          } else {
            console.warn('Manual refresh failed:', refreshResult.error);
            setUserEmail(null);
          }
        } else {
          setUserEmail(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setMessage('Connection error. Please check your internet connection.');
        setUserEmail(null);
      }
    };
    
    checkAuth();
  }, []);

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : undefined;

  const testConnection = async () => {
    setConnectionStatus('Testing connection...');
    
    // Test API key validity first
    const keyTest = testAPIKeyValidity();
    if (!keyTest.success) {
      setConnectionStatus(`❌ API Key Error: ${keyTest.error}`);
      return;
    }
    
    // Test internet connectivity
    const networkTest = await testNetworkConnectivity();
    if (!networkTest.success) {
      setConnectionStatus(`❌ Network Error: ${networkTest.error}`);
      return;
    }
    
    // Test Supabase connection
    const supabaseTest = await testSupabaseConnection();
    if (!supabaseTest.success) {
      setConnectionStatus(`❌ Supabase Error: ${supabaseTest.error}`);
      return;
    }
    
    // Test OAuth providers
    const oauthTest = await testOAuthProviders();
    if (oauthTest.success) {
      setConnectionStatus(`✅ Connection OK! ${keyTest.message} | ${oauthTest.message}`);
    } else {
      setConnectionStatus(`⚠️ OAuth Issue: ${oauthTest.error}`);
    }
  };

  const handleSignInEmail = async () => {
    setMessage(null);
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsLoading(false);
    if (error) {
      setMessage(error.message);
    } else {
      window.location.href = "/dashboard";
    }
  };

  const handleSignUpEmail = async () => {
    setMessage(null);
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { full_name: fullName || null },
      },
    });
    setIsLoading(false);
    if (error) {
      setMessage(`Signup error: ${error.message}`);
      setDebug(null);
    } else {
      setMessage(
        `Sign up started. Please confirm your email via the link we sent before signing in.`
      );
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setMessage(null);
    setDebug(
      `Starting OAuth | provider=${provider} | redirectTo=${redirectTo} | supabaseUrl=${process.env.NEXT_PUBLIC_SUPABASE_URL}`
    );
    setIsLoading(true);
    
    try {
      console.log(`Attempting OAuth with provider: ${provider}`);
      console.log(`Redirect URL: ${redirectTo}`);
      console.log(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
      
      const { data: oauthData, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: false
        },
      });
      
      setIsLoading(false);
      
      if (error) {
        console.error('OAuth error details:', error);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        
        setMessage(`OAuth error: ${error.message}`);
        setDebug(
          `OAuth failed | provider=${provider} | redirectTo=${redirectTo} | supabaseUrl=${process.env.NEXT_PUBLIC_SUPABASE_URL} | error=${error.message} | errorCode=${error.name || 'unknown'}`
        );
        
        // Provide specific guidance based on error
        if (error.message.includes('provider is not enabled')) {
          if (provider === 'google') {
            setMessage(`Google OAuth is not properly configured. Please check: 1) Google provider is enabled in Supabase, 2) Valid Client ID/Secret are set, 3) Authorized redirect URIs include your Supabase callback URL.`);
          } else {
            setMessage(`${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth is not enabled in your Supabase project. Please enable it in the Supabase dashboard under Authentication > Providers.`);
          }
        } else if (provider === 'google' && (error.message.includes('400') || error.message.includes('Bad Request'))) {
          setMessage(`Google OAuth configuration error. Common fixes: 1) Check Client ID/Secret in Supabase dashboard, 2) Verify redirect URI in Google Cloud Console: https://vallfjfcjzonxcszfjjr.supabase.co/auth/v1/callback, 3) Ensure OAuth consent screen is published or you're added as test user.`);
        }
        
        return;
      }
      
      if (oauthData?.url) {
        console.log('OAuth URL generated:', oauthData.url);
        setDebug(
          `OAuth start OK | provider=${provider} | redirectTo=${redirectTo} | url=${oauthData.url}`
        );
        // The browser should automatically redirect when skipBrowserRedirect is false
        // But we can manually navigate if needed
        window.location.href = oauthData.url;
      }
    } catch (err) {
      setIsLoading(false);
      console.error('OAuth unexpected error:', err);
      setMessage(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setIsLoading(false);
    setUserEmail(null);
    setMessage("Signed out.");
  };

  const TabButton = ({ k, label }: { k: TabKey; label: string }) => (
    <button
      className={`rounded-full px-4 py-2 text-sm border transition-colors ${
        active === k
          ? "bg-white/10 border-white/20"
          : "bg-transparent border-white/10 hover:bg-white/5"
      }`}
      onClick={() => setActive(k)}
    >
      {label}
    </button>
  );

  return (
    <main
      className="min-h-screen section-premium flex items-center justify-center relative overflow-hidden"
      data-animate
      suppressHydrationWarning
    >
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-[color:var(--accent)]/15 to-[color:var(--accent-alt)]/15 rounded-full blur-3xl animate-float-gentle" />
        <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-gradient-to-br from-[color:var(--accent-alt)]/10 to-[color:var(--accent)]/10 rounded-full blur-3xl animate-float-gentle" style={{animationDelay: '2s'}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-to-br from-[color:var(--accent)]/5 to-transparent rounded-full blur-3xl" />
      </div>
      
      <div className="container-balanced section-padding relative z-10">
        <div
          className="mx-auto max-w-md slide-up"
          data-animate
          suppressHydrationWarning
        >
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-strong)] flex items-center justify-center shadow-premium">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-3xl font-bold text-gradient-primary">Mentorae</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance mb-4">
              Welcome to the
              <span className="block text-gradient-primary">future of learning</span>
            </h1>
            <p className="text-xl text-[color:var(--muted)] text-balance leading-relaxed">
              Sign in to access your AI-powered educational companion
            </p>
          </div>

          <div className="card-surface-premium p-8 backdrop-blur-premium">
            <div className="space-y-8">
              {userEmail ? (
                <div className="space-y-6">
                  <div className="glass-panel p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[color:var(--success)] to-[color:var(--success)]/80 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-[color:var(--muted)] mb-1">Successfully signed in as</p>
                    <p className="text-xl font-bold text-gradient-primary mb-4">{userEmail}</p>
                    <div className="flex items-center justify-center gap-2 text-sm text-[color:var(--success)]">
                      <div className="w-2 h-2 rounded-full bg-[color:var(--success)] animate-glow-pulse" />
                      <span>Active session</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Link href="/dashboard" className="btn-primary text-center py-4 hover-lift">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span className="font-semibold">Dashboard</span>
                      </div>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="btn-ghost hover-lift py-4"
                      disabled={isLoading}
                    >
                      <div className="flex flex-col items-center gap-2">
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        )}
                        <span className="font-semibold">{isLoading ? "Signing out..." : "Sign out"}</span>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-[color:var(--surface-border)] to-transparent" />
                    <span className="text-xs font-medium text-[color:var(--muted)] whitespace-nowrap px-4">Choose your method</span>
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-[color:var(--surface-border)] to-transparent" />
                  </div>
                  
                  <div className="flex items-center justify-center gap-2">
                    <TabButton k="email" label="Email & Password" />
                    <TabButton k="oauth" label="Social Login" />
                  </div>

                  {active === "email" && (
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="full-name"
                          className="block text-sm font-medium text-muted mb-2"
                        >
                          Full name (for new accounts)
                        </label>
                        <input
                          id="full-name"
                          className="w-full rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--surface)] px-4 py-3 outline-none placeholder:text-muted focus:ring-focus"
                          placeholder="Your full name"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="email"
                          className="block text-sm font-medium text-muted mb-2"
                        >
                          Email
                        </label>
                        <input
                          id="email"
                          className="w-full rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--surface)] px-4 py-3 outline-none placeholder:text-muted focus:ring-focus"
                          placeholder="you@example.com"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label
                            htmlFor="password"
                            className="block text-sm font-medium text-muted"
                          >
                            Password
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="text-xs text-muted hover:text-[color:var(--foreground)]"
                          >
                            {showPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                        <input
                          id="password"
                          className="w-full rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--surface)] px-4 py-3 outline-none placeholder:text-muted focus:ring-focus"
                          placeholder="••••••••"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={handleSignInEmail}
                          className="btn-primary"
                          disabled={isLoading}
                        >
                          {isLoading ? "Signing in…" : "Sign in"}
                        </button>
                        <button
                          onClick={handleSignUpEmail}
                          className="btn-ghost"
                          disabled={isLoading}
                        >
                          {isLoading ? "Please wait…" : "Sign up"}
                        </button>
                      </div>
                    </div>
                  )}

                  {active === "oauth" && (
                    <div className="space-y-3">
                      <button
                        onClick={() => handleOAuth("google")}
                        className="w-full btn-ghost"
                        disabled={isLoading}
                      >
                        Continue with Gmail
                      </button>
                      <button
                        onClick={() => handleOAuth("github")}
                        className="w-full btn-ghost"
                        disabled={isLoading}
                      >
                        Continue with GitHub
                      </button>
                    </div>
                  )}
                </>
              )}

              {message && (
                <div className="p-3 rounded-lg bg-[color:var(--surface)] border border-[color:var(--surface-border)]">
                  <p className="text-sm text-muted">{message}</p>
                </div>
              )}

              {debug && (
                <div className="p-3 rounded-lg bg-[color:var(--surface)] border border-[color:var(--surface-border)]">
                  <p className="text-xs text-muted break-all">{debug}</p>
                </div>
              )}

              {connectionStatus && (
                <div className="p-3 rounded-lg bg-[color:var(--surface)] border border-[color:var(--surface-border)]">
                  <p className="text-sm text-muted">{connectionStatus}</p>
                </div>
              )}

              <div className="text-center">
                <button
                  onClick={testConnection}
                  className="text-sm text-muted hover:text-[color:var(--foreground)] link-underline mr-4"
                  disabled={isLoading}
                >
                  Test Connection
                </button>
                <Link
                  href="/"
                  className="text-sm text-muted hover:text-[color:var(--foreground)] link-underline"
                >
                  ← Back to home
                </Link>
              </div>
            </div>
          </div>

          {/* Project info panel removed */}
        </div>
      </div>
    </main>
  );
}
