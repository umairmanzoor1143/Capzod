"use client";

import * as React from "react";
import Link from "next/link";
import { BadgeCheck, LogOut, Shield, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { AuthUser } from "@/lib/api";
import { cn } from "@/lib/utils";

export function AuthStatus({ compact = false }: { compact?: boolean }) {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="h-9 rounded-lg bg-slate-100/80 shadow-inner animate-pulse" aria-label="Loading auth" />
    );
  }

  if (!user) {
    return (
      <Link
        href="/auth"
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/25 ring-1 ring-white/10 transition-[filter,transform] hover:brightness-105 active:scale-[0.98]",
          compact ? "h-8 px-3 text-xs" : "h-9 px-3"
        )}
      >
        <UserRound size={compact ? 13 : 15} />
        Sign in
      </Link>
    );
  }

  return (
    <div className={cn("flex", compact ? "flex-row items-center gap-2" : "flex-col space-y-1")}>
      {!compact && (
        <div className="rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm shadow-slate-900/[0.03]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Signed in
          </p>
          <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate flex-1 min-w-0">
              {displayName(user)}
            </p>
            <ProfileBadges user={user} />
          </div>
        </div>
      )}
      {compact && (
        <div className="flex items-center gap-1 min-w-0 max-w-[10rem] sm:max-w-[14rem]">
          <span className="text-xs font-medium text-slate-600 truncate">{displayName(user)}</span>
          <ProfileBadges user={user} />
        </div>
      )}
      <button
        onClick={() => signOut()}
        className={cn(
          "flex items-center gap-2 rounded-lg text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900",
          compact
            ? "h-8 shrink-0 justify-center border border-slate-200/90 bg-white px-2 text-xs shadow-sm shadow-slate-900/[0.02]"
            : "w-full border border-transparent px-3 py-2 hover:border-slate-200/80 hover:bg-white hover:shadow-sm"
        )}
      >
        <LogOut size={compact ? 13 : 16} />
        {!compact ? "Logout" : <span className="sr-only">Logout</span>}
      </button>
    </div>
  );
}

function ProfileBadges({ user }: { user: AuthUser }) {
  const admin = Boolean(user.profile?.isAdmin);
  const verified = Boolean(user.profile?.verified);
  if (!admin && !verified) return null;
  return (
    <span className="flex shrink-0 items-center gap-0.5" aria-label={badgeAria(admin, verified)}>
      {verified ? (
        <BadgeCheck
          size={16}
          className="text-sky-500"
          strokeWidth={2}
          aria-hidden
        />
      ) : null}
      {admin ? (
        <Shield
          size={14}
          className="text-amber-600"
          strokeWidth={2}
          aria-hidden
        />
      ) : null}
    </span>
  );
}

function badgeAria(admin: boolean, verified: boolean) {
  const parts: string[] = [];
  if (verified) parts.push("Verified account");
  if (admin) parts.push("Administrator");
  return parts.join(". ") || "Profile badges";
}

function displayName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const meta = user.user_metadata ?? {};
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    (typeof meta.user_name === "string" && `@${meta.user_name}`) ||
    (typeof meta.preferred_username === "string" && meta.preferred_username);
  return name || user.email || "Signed in";
}
