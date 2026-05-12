"use client";

import * as React from "react";
import { apiGetUser, apiSignOut, type AuthUser } from "@/lib/api";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export type OAuthProviderId = "google" | "twitter";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signInWithOAuth: (provider: OAuthProviderId, redirectTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refreshUser = React.useCallback(async () => {
    try {
      const u = await apiGetUser();
      setUser(u);
    } catch {
      setUser(null);
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;
    apiGetUser()
      .then((u) => {
        if (mounted) setUser(u);
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined;
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { subscription: sub },
      } = supabase.auth.onAuthStateChange(() => {
        void refreshUser();
      });
      subscription = sub;
    } catch {
      // Missing env during local static analysis — skip listener.
    }
    return () => subscription?.unsubscribe();
  }, [refreshUser]);

  const signInWithOAuth = React.useCallback(
    async (provider: OAuthProviderId, redirectTo = "/") => {
      const safe = redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";
      const supabase = createBrowserSupabaseClient();
      const origin = window.location.origin;
      const callback = `${origin}/auth/callback?next=${encodeURIComponent(safe)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callback,
          skipBrowserRedirect: false,
        },
      });
      if (error) throw error;
    },
    []
  );

  const signOut = React.useCallback(async () => {
    await apiSignOut();
    setUser(null);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, loading, signInWithOAuth, signOut, refreshUser }),
    [user, loading, signInWithOAuth, signOut, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
