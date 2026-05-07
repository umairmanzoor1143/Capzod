"use client";

import * as React from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { LogOut, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function AuthStatus({ compact = false }: { compact?: boolean }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="h-9 rounded-md bg-slate-100 animate-pulse" aria-label="Loading auth" />
    );
  }

  if (!user) {
    return (
      <Link
        href="/auth"
        className={cn(
          "flex items-center justify-center gap-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors",
          compact ? "h-8 px-3 text-xs" : "h-9 px-3"
        )}
      >
        <UserRound size={compact ? 13 : 15} />
        Sign in
      </Link>
    );
  }

  return (
    <div className="space-y-1">
      {!compact && (
        <div className="px-3 py-2 rounded-md bg-slate-50 border border-slate-100">
          <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">
            Signed in
          </p>
          <p className="text-xs font-semibold text-slate-700 truncate">
            {user.email}
          </p>
        </div>
      )}
      <button
        onClick={() => supabase.auth.signOut()}
        className={cn(
          "flex items-center gap-2 w-full rounded-md text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors",
          compact ? "h-8 px-2 text-xs justify-center" : "px-3 py-2"
        )}
      >
        <LogOut size={compact ? 13 : 16} />
        Logout
      </button>
    </div>
  );
}
