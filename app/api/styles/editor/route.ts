import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchEditorStyles } from "@/lib/supabase/styles";

export async function GET() {
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

    const styles = await fetchEditorStyles(supabase, user.id);
    return NextResponse.json({ styles });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unable to fetch styles" },
      { status: 500 }
    );
  }
}
