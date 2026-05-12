import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCommunityStyle } from "@/lib/supabase/styles";

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
    const { name, description, baseStyle, typography, behavior, kind, code } =
      body;

    if (!name || !description) {
      return NextResponse.json(
        { error: "Name and description are required" },
        { status: 400 }
      );
    }

    const style = await createCommunityStyle(supabase, {
      user,
      name,
      description,
      baseStyle: baseStyle || "clean-minimal",
      typography: typography || {},
      behavior,
      kind,
      code,
    });

    return NextResponse.json({ style });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unable to create style" },
      { status: 500 }
    );
  }
}
