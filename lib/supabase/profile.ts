import type { SupabaseClient } from "@supabase/supabase-js";

export type UserProfileRow = {
  is_admin: boolean;
  verified: boolean;
  subscription_tier: string;
};

export async function fetchUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfileRow | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("is_admin, verified, subscription_tier")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    if (error.code !== "42P01") {
      // eslint-disable-next-line no-console
      console.warn("[user_profiles] fetch:", error.message);
    }
    return null;
  }
  if (!data) return null;
  return data as UserProfileRow;
}

/** If the DB trigger has not run yet, create a row the user may insert under RLS. */
export async function ensureUserProfileRow(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const existing = await fetchUserProfile(supabase, userId);
  if (existing) return;
  const { error } = await supabase.from("user_profiles").insert({
    id: userId,
    verified: true,
  });
  if (error && error.code !== "23505" && error.code !== "42P01") {
    // eslint-disable-next-line no-console
    console.warn("[user_profiles] ensure insert:", error.message);
  }
}
