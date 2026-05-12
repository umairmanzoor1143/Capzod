"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/auth/AuthProvider";

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-slate-100 via-slate-50 to-indigo-50/30 p-4">
          <Loader2 className="size-8 animate-spin text-indigo-500" aria-label="Loading" />
        </main>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, signInWithOAuth } = useAuth();
  const [busy, setBusy] = React.useState<"google" | "x" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const redirectTo = searchParams.get("redirectTo") || "/";
  const oauthError = searchParams.get("error");

  React.useEffect(() => {
    if (oauthError === "oauth") {
      setError("Sign-in was cancelled or failed. Try again.");
    }
  }, [oauthError]);

  React.useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirectTo.startsWith("/") ? redirectTo : "/");
    }
  }, [authLoading, user, router, redirectTo]);

  async function handleOAuth(provider: "google" | "x") {
    setBusy(provider);
    setError(null);
    try {
      await signInWithOAuth(provider, redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start sign-in");
    } finally {
      setBusy(null);
    }
  }

  if (authLoading || user) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-slate-100 via-slate-50 to-indigo-50/30 p-4">
        <Loader2 className="size-8 animate-spin text-indigo-500" aria-label="Loading" />
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-slate-100 via-slate-50 to-indigo-50/40 p-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] text-slate-900 lg:pb-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-800"
        >
          <ArrowLeft size={16} />
          Back to editor
        </Link>
        <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-float ring-1 ring-slate-900/[0.02]">
          <div className="border-b border-slate-100/90 bg-gradient-to-br from-white to-slate-50/80 px-6 py-5">
            <div className="mb-4 grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/25 ring-1 ring-white/15">
              <LockKeyhole size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Sign in to Speakzy</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              Use Google or your X account. We use Supabase Auth — no passwords stored here.
            </p>
          </div>

          <div className="space-y-3 p-6">
            {error ? (
              <p className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </p>
            ) : null}

            <Button
              type="button"
              variant="outline"
              className="h-11 w-full justify-center gap-2 border-slate-200 font-semibold"
              disabled={busy !== null}
              onClick={() => handleOAuth("google")}
            >
              {busy === "google" ? <Loader2 className="size-4 animate-spin" /> : null}
              <GoogleGlyph />
              Continue with Google
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-11 w-full justify-center gap-2 border-slate-200 font-semibold"
              disabled={busy !== null}
              onClick={() => handleOAuth("x")}
            >
              {busy === "x" ? <Loader2 className="size-4 animate-spin" /> : null}
              <XGlyph />
              Continue with X
            </Button>

            <p className="text-center text-[10px] leading-relaxed text-slate-400">
              Configure Google and{" "}
              <span className="font-semibold text-slate-600">X (OAuth 2.0)</span> in the Supabase dashboard (not
              the legacy Twitter provider). Add your site URL and{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-[9px] text-slate-600">
                {typeof window !== "undefined" ? window.location.origin : ""}/auth/callback
              </code>{" "}
              to Redirect URLs. OAuth client secrets belong in Supabase only, not in this app.
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}

function GoogleGlyph() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function XGlyph() {
  return (
    <svg className="size-4 shrink-0 text-slate-900" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
