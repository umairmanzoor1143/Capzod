"use client";

import * as React from "react";
import { apiGetUser, apiSignIn, apiSignUp, apiSignOut, type AuthUser } from "@/lib/api";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ hasSession: boolean }>;
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

  // Fetch user on mount
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

  const signIn = React.useCallback(
    async (email: string, password: string) => {
      const u = await apiSignIn(email, password);
      setUser(u);
    },
    []
  );

  const signUp = React.useCallback(
    async (email: string, password: string) => {
      const result = await apiSignUp(email, password);
      if (result.hasSession) {
        setUser(result.user);
      }
      return { hasSession: result.hasSession };
    },
    []
  );

  const signOut = React.useCallback(async () => {
    await apiSignOut();
    setUser(null);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, loading, signIn, signUp, signOut, refreshUser }),
    [user, loading, signIn, signUp, signOut, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
