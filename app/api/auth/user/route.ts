import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserProfileRow, fetchUserProfile } from "@/lib/supabase/profile";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ user: null });
    }

    await ensureUserProfileRow(supabase, user.id);
    const profile = await fetchUserProfile(supabase, user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
        profile: profile
          ? {
              isAdmin: profile.is_admin,
              verified: profile.verified,
              subscriptionTier: profile.subscription_tier,
            }
          : null,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
