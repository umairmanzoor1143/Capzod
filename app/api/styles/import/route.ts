import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { importCommunityStyle } from "@/lib/supabase/styles";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { styleId } = body;

    if (!styleId) {
      return NextResponse.json(
        { error: "styleId is required" },
        { status: 400 }
      );
    }

    await importCommunityStyle(supabase, styleId, user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unable to import style" },
      { status: 500 }
    );
  }
}
