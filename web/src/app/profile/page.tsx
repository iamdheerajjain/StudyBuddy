"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function ProfilePage() {
  const supabase = supabaseBrowser();
  const [user, setUser] = useState<User | null>(null);
  const [active, setActive] = useState<"account" | "security" | "preferences">(
    "account"
  );

  // Editable fields
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [emailInput, setEmailInput] = useState(" ");
  const [newPassword, setNewPassword] = useState("");

  // UX state
  const [message, setMessage] = useState<string | null>(null);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: any }) => {
      if (!data.user) {
        window.location.href = "/auth";
        return;
      }
      setUser(data.user);
      setFullName((data.user.user_metadata?.full_name as string) || "");
      setAvatarUrl((data.user.user_metadata?.avatar_url as string) || "");
      setEmailInput(data.user.email ?? "");
    });
  }, [supabase]);

  if (!user) return null;

  return (
    <main className="min-h-screen section-premium">
      {/* Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-gradient-to-br from-[color:var(--accent)]/10 to-[color:var(--accent-alt)]/10 rounded-full blur-3xl animate-float-gentle" />
        <div className="absolute bottom-20 -right-20 w-[500px] h-[500px] bg-gradient-to-br from-[color:var(--accent-alt)]/8 to-[color:var(--accent)]/8 rounded-full blur-3xl animate-float-gentle" style={{animationDelay: '3s'}} />
      </div>
      
      <section
        className="container-balanced section-padding fade-in relative z-10"
        data-animate
        suppressHydrationWarning
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-strong)] flex items-center justify-center shadow-premium">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-gradient-primary">Profile & Settings</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance mb-4">
              Personalize your
              <span className="block text-gradient-primary">learning experience</span>
            </h1>
            <p className="text-xl text-[color:var(--muted)] text-balance max-w-3xl mx-auto leading-relaxed">
              Manage your account, security preferences, and customize your AI tutoring experience
            </p>
          </div>

          <AnimatedContainer delay={50}>
            <div className="card-surface-premium p-8 mb-8 overflow-hidden">
              {/* Decorative background */}
              <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--accent)]/5 via-[color:var(--accent-alt)]/5 to-[color:var(--accent)]/5 opacity-50" />
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[color:var(--accent)]/10 to-transparent rounded-full blur-2xl" />
              
              <div className="relative z-10">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-strong)] flex items-center justify-center overflow-hidden shadow-premium group hover:scale-105 transition-transform duration-300">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold text-2xl">
                            {user.email?.[0]?.toUpperCase() || "U"}
                          </span>
                        )}
                      </div>
                      {/* Status indicator */}
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[color:var(--success)] rounded-full border-2 border-white flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full animate-glow-pulse" />
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gradient-primary mb-1">
                        {user.user_metadata?.full_name || "Your account"}
                      </h2>
                      <p className="text-[color:var(--muted)] font-medium mb-2">{user.email}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-[color:var(--success)] animate-pulse" />
                        <span className="text-[color:var(--success)] font-medium">Active member</span>
                        <span className="text-[color:var(--muted)]">• Since {new Date(user.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      className="btn-ghost hover-lift px-6 py-3"
                      onClick={() => (window.location.href = "/dashboard")}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>Dashboard</span>
                      </div>
                    </button>
                    <button
                      className="btn-primary hover-lift px-6 py-3"
                      onClick={async () => {
                        setIsSigningOut(true);
                        await supabase.auth.signOut();
                        setIsSigningOut(false);
                        window.location.href = "/";
                      }}
                      disabled={isSigningOut}
                    >
                      <div className="flex items-center gap-2">
                        {isSigningOut ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        )}
                        <span>{isSigningOut ? "Signing out..." : "Sign out"}</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedContainer>

          <div className="card-surface p-2 mb-6 inline-flex gap-2">
            <button
              className={`rounded-full px-4 py-2 text-sm border ${
                active === "account"
                  ? "bg-white/10 border-white/20"
                  : "bg-transparent border-white/10 hover:bg-white/5"
              }`}
              onClick={() => setActive("account")}
            >
              Account
            </button>
            <button
              className={`rounded-full px-4 py-2 text-sm border ${
                active === "security"
                  ? "bg-white/10 border-white/20"
                  : "bg-transparent border-white/10 hover:bg-white/5"
              }`}
              onClick={() => setActive("security")}
            >
              Security
            </button>
            <button
              className={`rounded-full px-4 py-2 text-sm border ${
                active === "preferences"
                  ? "bg-white/10 border-white/20"
                  : "bg-transparent border-white/10 hover:bg-white/5"
              }`}
              onClick={() => setActive("preferences")}
            >
              Preferences
            </button>
          </div>

          {message && (
            <div className="mb-6 p-3 rounded-lg bg-[color:var(--surface)] border border-[color:var(--surface-border)]">
              <p className="text-sm text-muted">{message}</p>
            </div>
          )}

          {active === "account" && (
            <div className="grid gap-8 md:grid-cols-2">
              <AnimatedContainer delay={75}>
                <div className="card-surface p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-[color:var(--accent)]/10 flex items-center justify-center overflow-hidden">
                      {avatarUrl ? (
                        /* eslint-disable @next/next/no-img-element */
                        <img
                          src={avatarUrl}
                          alt="avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[color:var(--accent)] font-semibold">
                          {user.email?.[0]?.toUpperCase() || "U"}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold">Account</h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1">
                        Email
                      </label>
                      <div className="p-3 rounded-lg bg-[color:var(--surface)] border border-[color:var(--surface-border)]">
                        {user.email}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted mb-1">
                        Full name
                      </label>
                      <input
                        className="w-full rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--surface)] px-4 py-3 outline-none placeholder:text-muted focus:ring-focus"
                        placeholder="Your name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted mb-1">
                        Avatar URL
                      </label>
                      <input
                        className="w-full rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--surface)] px-4 py-3 outline-none placeholder:text-muted focus:ring-focus"
                        placeholder="https://..."
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                      />
                    </div>

                    <button
                      className="w-full btn-primary"
                      disabled={isSavingAccount}
                      onClick={async () => {
                        setMessage(null);
                        setIsSavingAccount(true);
                        const { data, error } = await supabase.auth.updateUser({
                          data: {
                            full_name: fullName || null,
                            avatar_url: avatarUrl || null,
                          },
                        });
                        setIsSavingAccount(false);
                        if (error) {
                          setMessage(`Save error: ${error.message}`);
                        } else {
                          setUser(data.user as User);
                          setMessage("Account updated.");
                        }
                      }}
                    >
                      {isSavingAccount ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </div>
              </AnimatedContainer>

              <AnimatedContainer delay={125}>
                <div className="card-surface p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-[color:var(--accent)]/10 flex items-center justify-center">
                      <span className="text-[color:var(--accent)]">📅</span>
                    </div>
                    <h2 className="text-xl font-semibold">Membership</h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1">
                        Member since
                      </label>
                      <div className="p-3 rounded-lg bg-[color:var(--surface)] border border-[color:var(--surface-border)]">
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-[color:var(--surface)] border border-[color:var(--surface-border)] text-sm text-muted">
                      Use the Security tab to change your email or password.
                    </div>
                  </div>
                </div>
              </AnimatedContainer>
            </div>
          )}

          {active === "security" && (
            <div className="grid gap-8 md:grid-cols-2">
              <AnimatedContainer delay={75}>
                <div className="card-surface p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-[color:var(--accent)]/10 flex items-center justify-center">
                      <span className="text-[color:var(--accent)]">✉️</span>
                    </div>
                    <h2 className="text-xl font-semibold">Change Email</h2>
                  </div>
                  <div className="space-y-4">
                    <input
                      className="w-full rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--surface)] px-4 py-3 outline-none placeholder:text-muted focus:ring-focus"
                      placeholder="you@example.com"
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                    />
                    <button
                      className="w-full btn-ghost"
                      disabled={isSavingEmail}
                      onClick={async () => {
                        setMessage(null);
                        setIsSavingEmail(true);
                        const { data, error } = await supabase.auth.updateUser({
                          email: emailInput,
                        });
                        setIsSavingEmail(false);
                        if (error)
                          setMessage(`Email update error: ${error.message}`);
                        else {
                          setUser(data.user as User);
                          setMessage(
                            "Email update requested. Check your inbox to confirm."
                          );
                        }
                      }}
                    >
                      {isSavingEmail ? "Updating…" : "Update email"}
                    </button>
                  </div>
                </div>
              </AnimatedContainer>

              <AnimatedContainer delay={125}>
                <div className="card-surface p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-[color:var(--accent)]/10 flex items-center justify-center">
                      <span className="text-[color:var(--accent)]">🔒</span>
                    </div>
                    <h2 className="text-xl font-semibold">Change Password</h2>
                  </div>
                  <div className="space-y-4">
                    <input
                      className="w-full rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--surface)] px-4 py-3 outline-none placeholder:text-muted focus:ring-focus"
                      placeholder="New password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      className="w-full btn-primary"
                      disabled={isSavingPassword || newPassword.length < 6}
                      onClick={async () => {
                        setMessage(null);
                        setIsSavingPassword(true);
                        const { data, error } = await supabase.auth.updateUser({
                          password: newPassword,
                        });
                        setIsSavingPassword(false);
                        if (error)
                          setMessage(`Password update error: ${error.message}`);
                        else {
                          setUser(data.user as User);
                          setNewPassword("");
                          setMessage("Password updated.");
                        }
                      }}
                    >
                      {isSavingPassword ? "Updating…" : "Update password"}
                    </button>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                      className="btn-ghost"
                      disabled={isSigningOut}
                      onClick={async () => {
                        setMessage(null);
                        setIsSigningOut(true);
                        await supabase.auth.signOut();
                        setIsSigningOut(false);
                        window.location.href = "/";
                      }}
                    >
                      {isSigningOut ? "Signing out…" : "Sign out"}
                    </button>
                    <button
                      className="btn-ghost"
                      disabled={isSigningOut}
                      onClick={async () => {
                        setMessage(null);
                        setIsSigningOut(true);
                        await supabase.auth.signOut({ scope: "global" });
                        setIsSigningOut(false);
                        window.location.href = "/";
                      }}
                    >
                      {isSigningOut ? "Signing out…" : "Sign out everywhere"}
                    </button>
                  </div>
                </div>
              </AnimatedContainer>
            </div>
          )}

          {active === "preferences" && (
            <div className="grid gap-8 md:grid-cols-2">
              <AnimatedContainer delay={75}>
                <div className="card-surface p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-[color:var(--accent)]/10 flex items-center justify-center">
                      <span className="text-[color:var(--accent)]">🎨</span>
                    </div>
                    <h2 className="text-xl font-semibold">Theme</h2>
                  </div>
                  <div className="space-y-3">
                    <select
                      className="w-full rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--surface)] px-4 py-3 outline-none focus:ring-focus"
                      defaultValue="system"
                      onChange={(e) => {
                        // Placeholder: integrate with your theme system if available
                        setMessage(
                          `Theme set to ${e.target.value} (local setting)`
                        );
                      }}
                    >
                      <option value="system">System</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                    <p className="text-sm text-muted">
                      Theme will apply on your next visit.
                    </p>
                  </div>
                </div>
              </AnimatedContainer>

              <AnimatedContainer delay={125}>
                <div className="card-surface p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-[color:var(--accent)]/10 flex items-center justify-center">
                      <span className="text-[color:var(--accent)]">🔔</span>
                    </div>
                    <h2 className="text-xl font-semibold">Notifications</h2>
                  </div>
                  <div className="p-3 rounded-lg bg-[color:var(--surface)] border border-[color:var(--surface-border)] text-sm text-muted">
                    Coming soon.
                  </div>
                </div>
              </AnimatedContainer>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function AnimatedContainer({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "none" : "translateY(8px)",
        transition: "opacity .35s ease, transform .35s ease",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
