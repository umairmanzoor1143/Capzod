"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/AuthProvider";

export default function AuthPage() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [redirectTo, setRedirectTo] = React.useState("/");

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRedirectTo(params.get("redirectTo") || "/");
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      if (mode === "signin") {
        await signIn(email, password);
        router.push(redirectTo);
        return;
      }

      const { hasSession } = await signUp(email, password);

      if (hasSession) {
        router.push(redirectTo);
      } else {
        setMessage("Account created. Check your email to confirm the sign up.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 mb-4"
        >
          <ArrowLeft size={16} />
          Back to editor
        </Link>
        <Card className="rounded-lg border-slate-200 shadow-none overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-md bg-indigo-600 text-white grid place-items-center mb-3">
              <LockKeyhole size={18} />
            </div>
            <h1 className="text-xl font-bold">
              {mode === "signin" ? "Sign in to Speakzy" : "Create your account"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Save imported subtitle styles and publish your own.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-600">Email</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="pl-9"
                  placeholder="you@example.com"
                />
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-600">Password</span>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
            </label>

            {error && (
              <p className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </p>
            )}
            {message && (
              <p className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {message}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
                setMessage(null);
              }}
              className="w-full text-sm font-semibold text-indigo-700 hover:text-indigo-900"
            >
              {mode === "signin"
                ? "Need an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </form>
        </Card>
      </div>
    </main>
  );
}
