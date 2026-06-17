"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";

const AuthContext = createContext(null);

function userFromSupabase(sessionUser) {
  return {
    id: sessionUser.id,
    email: sessionUser.email ?? "",
    name: sessionUser.user_metadata?.full_name ?? sessionUser.user_metadata?.name ?? "Healthcare User",
    role: sessionUser.user_metadata?.role ?? "patient",
    phone: sessionUser.user_metadata?.phone ?? "",
    avatarUrl: sessionUser.user_metadata?.avatar_url ?? "",
  };
}

async function syncPublicProfile(supabase, sessionUser) {
  if (!supabase || !sessionUser?.id) return;
  const profile = userFromSupabase(sessionUser);
  try {
    await supabase.from("profiles").upsert({
      id: profile.id,
      email: profile.email,
      full_name: profile.name,
      role: profile.role,
      phone: profile.phone,
      avatar_url: profile.avatarUrl,
    }, { onConflict: "id" });
  } catch {
    // Profile sync should never block sign-in or dashboard rendering.
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const supabase = getSupabaseBrowserClient();
  const configured = isSupabaseConfigured();

  useEffect(() => {
    let cancelled = false;

    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const authProblem = params.get("error_description") || params.get("error") || hashParams.get("error_description") || hashParams.get("error");
    if (authProblem) {
      const readable = authProblem.replaceAll("+", " ");
      const isOAuthConfigIssue = readable.toLowerCase().includes("external code") || readable.toLowerCase().includes("unexpected");
      setAuthError(
        isOAuthConfigIssue
          ? "Google sign-in could not finish. Check the Google OAuth Client ID, Client Secret, and Supabase callback URL, then try again."
          : readable,
      );
      window.history.replaceState({}, "", window.location.origin + window.location.pathname);
    }
    if (params.get("reset") === "true" || hashParams.get("type") === "recovery") {
      setRecoveryMode(true);
    }

    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setAuthError("Secure account access is taking too long. Check the environment keys and restart the app.");
        setLoading(false);
      }
    }, 6000);

    supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setAuthError(error.message);
        }
        if (data.session?.user) {
          setUser(userFromSupabase(data.session.user));
          syncPublicProfile(supabase, data.session.user);
        } else {
          setUser(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAuthError(error.message ?? "Could not connect to secure account access.");
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          window.clearTimeout(timeout);
          setLoading(false);
        }
      });

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      setAuthError("");
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }
      if (session?.user) {
        syncPublicProfile(supabase, session.user);
      }
      setUser(session?.user ? userFromSupabase(session.user) : null);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo(
    () => ({
      user,
      loading,
      authError,
      recoveryMode,
      authMode: configured ? "connected" : "not-configured",
      signIn: async (email, password) => {
        if (!supabase) {
          throw new Error("Secure account access is not configured. Add environment keys to enable real authentication.");
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signUp: async (email, password, name, role) => {
        if (!supabase) {
          throw new Error("Secure account access is not configured. Add environment keys to enable real authentication.");
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name, role },
            emailRedirectTo: `${window.location.origin}/?verified=true`,
          },
        });
        if (error) throw error;
      },
      signInWithGoogle: async () => {
        if (!supabase) {
          throw new Error("Add the secure account keys and enable Google sign-in first.");
        }
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/?auth=google`,
            queryParams: { prompt: "select_account" },
          },
        });
        if (error) throw error;
      },
      sendPasswordReset: async (email) => {
        if (!supabase) {
          throw new Error("Password reset requires secure account access to be configured.");
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/?reset=true`,
        });
        if (error) throw error;
      },
      updatePassword: async (password) => {
        if (!supabase) {
          throw new Error("Password update requires secure account access to be configured.");
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setRecoveryMode(false);
        window.history.replaceState({}, "", window.location.origin + window.location.pathname);
      },
      updateProfile: async ({ name, phone, avatarUrl }) => {
        if (!supabase) {
          throw new Error("Profile editing requires secure account access to be configured.");
        }
        const { data, error } = await supabase.auth.updateUser({
          data: { full_name: name, name, phone, avatar_url: avatarUrl },
        });
        if (error) throw error;

        const updatedUser = data.user ? userFromSupabase(data.user) : { ...user, name, phone, avatarUrl };
        setUser(updatedUser);

        await supabase.from("profiles").update({ email: updatedUser.email, full_name: name, phone, avatar_url: avatarUrl }).eq("id", updatedUser.id);
      },
      signOut: async () => {
        if (supabase) {
          await supabase.auth.signOut();
        }
        setUser(null);
        setRecoveryMode(false);
      },
    }),
    [authError, configured, loading, recoveryMode, supabase, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
