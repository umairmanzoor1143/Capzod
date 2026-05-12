import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchApprovedStyles } from "@/lib/supabase/styles";

export async function GET() {
  try {
    const supabase = await createClient();

    // Check if user is authenticated (optional — approved styles are public)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const styles = await fetchApprovedStyles(supabase, user?.id);
    return NextResponse.json({ styles });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unable to fetch styles" },
      { status: 500 }
    );
  }
}
