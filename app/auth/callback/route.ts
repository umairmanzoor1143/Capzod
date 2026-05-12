import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNextParam(next: string | null, origin: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  try {
    return new URL(next, origin).pathname + new URL(next, origin).search;
  } catch {
    return "/";
  }
}

/**
 * OAuth redirect target. Configure the same URL in Supabase Auth → URL configuration
 * (Redirect URLs): https://your-domain.com/auth/callback
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextParam(url.searchParams.get("next"), url.origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/auth?error=oauth", url.origin));
}
