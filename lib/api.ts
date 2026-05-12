/**
 * Client-side API helpers.
 *
 * Every public function in this module calls a Next.js API route via fetch.
 * No Supabase client is imported or used here.
 */

import type { CommunitySubtitleStyle } from "@/lib/community-styles";
import type {
  SubtitleBehaviorOverrides,
  SubtitleStyleId,
  TypographyOverrides,
} from "@/lib/subtitles";

// ─── Types ────────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────

async function json<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return body as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────

export async function apiGetUser(): Promise<AuthUser | null> {
  const { user } = await json<{ user: AuthUser | null }>(
    await fetch("/api/auth/user")
  );
  return user;
}

export async function apiSignIn(
  email: string,
  password: string
): Promise<AuthUser | null> {
  const { user } = await json<{ user: AuthUser | null }>(
    await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
  );
  return user;
}

export async function apiSignUp(
  email: string,
  password: string
): Promise<{ user: AuthUser | null; hasSession: boolean }> {
  return json<{ user: AuthUser | null; hasSession: boolean }>(
    await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
  );
}

export async function apiSignOut(): Promise<void> {
  await json<{ success: boolean }>(
    await fetch("/api/auth/signout", { method: "POST" })
  );
}

// ─── Admin ────────────────────────────────────────────────────────────────

export async function apiCheckAdmin(): Promise<boolean> {
  const { isAdmin } = await json<{ isAdmin: boolean }>(
    await fetch("/api/admin/check")
  );
  return isAdmin;
}

// ─── Styles ───────────────────────────────────────────────────────────────

export async function apiFetchApprovedStyles(): Promise<
  CommunitySubtitleStyle[]
> {
  const { styles } = await json<{ styles: CommunitySubtitleStyle[] }>(
    await fetch("/api/styles/approved")
  );
  return styles;
}

export async function apiFetchEditorStyles(): Promise<
  CommunitySubtitleStyle[]
> {
  const { styles } = await json<{ styles: CommunitySubtitleStyle[] }>(
    await fetch("/api/styles/editor")
  );
  return styles;
}

export async function apiFetchMyStyles(): Promise<CommunitySubtitleStyle[]> {
  const { styles } = await json<{ styles: CommunitySubtitleStyle[] }>(
    await fetch("/api/styles/mine")
  );
  return styles;
}

export async function apiFetchPendingStyles(): Promise<
  CommunitySubtitleStyle[]
> {
  const { styles } = await json<{ styles: CommunitySubtitleStyle[] }>(
    await fetch("/api/styles/pending")
  );
  return styles;
}

export async function apiCreateStyle(input: {
  name: string;
  description: string;
  baseStyle?: SubtitleStyleId;
  typography?: TypographyOverrides;
  behavior?: SubtitleBehaviorOverrides;
  kind?: "settings" | "code";
  code?: string;
}): Promise<CommunitySubtitleStyle> {
  const { style } = await json<{ style: CommunitySubtitleStyle }>(
    await fetch("/api/styles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
  return style;
}

export async function apiUpdateStyle(
  id: string,
  input: {
    name: string;
    description: string;
    baseStyle?: SubtitleStyleId;
    typography?: TypographyOverrides;
    behavior?: SubtitleBehaviorOverrides;
    kind?: "settings" | "code";
    code?: string;
  }
): Promise<CommunitySubtitleStyle> {
  const { style } = await json<{ style: CommunitySubtitleStyle }>(
    await fetch(`/api/styles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
  return style;
}

export async function apiDeleteStyle(id: string): Promise<void> {
  await json<{ success: boolean }>(
    await fetch(`/api/styles/${id}`, { method: "DELETE" })
  );
}

export async function apiUpdateStyleStatus(
  id: string,
  status: "approved" | "rejected"
): Promise<CommunitySubtitleStyle> {
  const { style } = await json<{ style: CommunitySubtitleStyle }>(
    await fetch(`/api/styles/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
  );
  return style;
}

export async function apiImportStyle(styleId: string): Promise<void> {
  await json<{ success: boolean }>(
    await fetch("/api/styles/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ styleId }),
    })
  );
}
