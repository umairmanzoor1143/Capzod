/**
 * Server-side style operations.
 *
 * Every function receives a Supabase server client so it can only be called
 * from Next.js API routes or Server Components – never from the browser.
 */

import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  normalizeCommunityStyle,
  stylePayloadFromForm,
  type CommunitySubtitleStyle,
  type StyleApprovalStatus,
  type SubtitleStyleRow,
} from "@/lib/community-styles";
import type {
  SubtitleBehaviorOverrides,
  SubtitleStyleId,
  TypographyOverrides,
} from "@/lib/subtitles";

type ImportRow = {
  style_id: string;
  imported_at: string;
  subtitle_styles: SubtitleStyleRow | SubtitleStyleRow[] | null;
};

export async function fetchApprovedStyles(
  supabase: SupabaseClient,
  userId?: string
) {
  const { data, error } = await supabase
    .from("subtitle_styles")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const importedIds = userId
    ? await fetchImportedStyleIds(supabase, userId)
    : new Set<string>();
  const rows = (data || []) as SubtitleStyleRow[];
  const adminAuthorIds = await fetchAdminAuthorIds(supabase, rows, userId);

  return rows.map((row) =>
    normalizeCommunityStyle(row, {
      imported: importedIds.has(row.id),
      mine: row.user_id === userId,
      authorIsAdmin: adminAuthorIds.has(row.user_id),
    })
  );
}

export async function fetchEditorStyles(
  supabase: SupabaseClient,
  userId: string
) {
  const [imported, mine] = await Promise.all([
    fetchImportedStyles(supabase, userId),
    fetchMyStyles(supabase, userId),
  ]);
  const merged = new Map<string, CommunitySubtitleStyle>();

  imported.forEach((style) => {
    merged.set(style.id, style);
  });
  mine.forEach((style) => {
    const previous = merged.get(style.id);
    merged.set(style.id, {
      ...(previous || {}),
      ...style,
      mine: true,
      imported: previous?.imported ?? true,
      importedAt: previous?.importedAt,
    });
  });

  return Array.from(merged.values()).sort(
    (a, b) =>
      Date.parse(b.importedAt || b.createdAt) -
      Date.parse(a.importedAt || a.createdAt)
  );
}

export async function fetchImportedStyles(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("subtitle_style_imports")
    .select("style_id, imported_at, subtitle_styles(*)")
    .eq("user_id", userId)
    .order("imported_at", { ascending: false });

  if (error) throw error;

  const rows = ((data || []) as ImportRow[]).flatMap((row) => {
    const styleRow = Array.isArray(row.subtitle_styles)
      ? row.subtitle_styles[0]
      : row.subtitle_styles;
    if (!styleRow) return [];
    return [{ row, styleRow }];
  });
  const adminAuthorIds = await fetchAdminAuthorIds(
    supabase,
    rows.map(({ styleRow }) => styleRow),
    userId
  );

  return rows.map(({ row, styleRow }) =>
    normalizeCommunityStyle(styleRow, {
      importedAt: row.imported_at,
      imported: true,
      mine: styleRow.user_id === userId,
      authorIsAdmin: adminAuthorIds.has(styleRow.user_id),
    })
  );
}

export async function fetchMyStyles(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("subtitle_styles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data || []) as SubtitleStyleRow[];
  const adminAuthorIds = await fetchAdminAuthorIds(supabase, rows, userId);

  return rows.map((row) =>
    normalizeCommunityStyle(row, {
      imported: true,
      mine: true,
      authorIsAdmin: adminAuthorIds.has(row.user_id),
    })
  );
}

export async function fetchPendingStyles(
  supabase: SupabaseClient,
  userId?: string
) {
  const { data, error } = await supabase
    .from("subtitle_styles")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw error;

  const rows = (data || []) as SubtitleStyleRow[];
  const adminAuthorIds = await fetchAdminAuthorIds(supabase, rows, userId);

  return rows.map((row) =>
    normalizeCommunityStyle(row, {
      authorIsAdmin: adminAuthorIds.has(row.user_id),
    })
  );
}

export async function importCommunityStyle(
  supabase: SupabaseClient,
  styleId: string,
  userId: string
) {
  const { error } = await supabase.from("subtitle_style_imports").upsert(
    {
      style_id: styleId,
      user_id: userId,
    },
    { onConflict: "user_id,style_id", ignoreDuplicates: true }
  );

  if (error) throw error;
}

export async function createCommunityStyle(
  supabase: SupabaseClient,
  input: {
    user: User;
    name: string;
    description: string;
    baseStyle: SubtitleStyleId;
    typography: TypographyOverrides;
    behavior?: SubtitleBehaviorOverrides;
    kind?: "settings" | "code";
    code?: string;
  }
) {
  const payload = stylePayloadFromForm(input);
  const authorName =
    getDisplayName(input.user) ||
    input.user.email?.split("@")[0] ||
    "Creator";

  const { data, error } = await supabase
    .from("subtitle_styles")
    .insert({
      ...payload,
      user_id: input.user.id,
      author_name: authorName,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) throw error;

  await importCommunityStyle(
    supabase,
    (data as SubtitleStyleRow).id,
    input.user.id
  );
  return normalizeCommunityStyle(data as SubtitleStyleRow, {
    imported: true,
    mine: true,
  });
}

export async function updateStyleStatus(
  supabase: SupabaseClient,
  styleId: string,
  status: Extract<StyleApprovalStatus, "approved" | "rejected">
) {
  const { data, error } = await supabase
    .from("subtitle_styles")
    .update({ status })
    .eq("id", styleId)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeCommunityStyle(data as SubtitleStyleRow);
}

/**
 * Owner-side update: edit fields and resubmit as pending.
 * RLS enforces: owner only, status must transition into 'pending'.
 */
export async function updateMyStyle(
  supabase: SupabaseClient,
  styleId: string,
  input: {
    name: string;
    description: string;
    baseStyle: SubtitleStyleId;
    typography: TypographyOverrides;
    behavior?: SubtitleBehaviorOverrides;
    kind?: "settings" | "code";
    code?: string;
  }
) {
  const payload = stylePayloadFromForm(input);
  const { data, error } = await supabase
    .from("subtitle_styles")
    .update({ ...payload, status: "pending" })
    .eq("id", styleId)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeCommunityStyle(data as SubtitleStyleRow, {
    imported: true,
    mine: true,
  });
}

/**
 * Owner-side delete. RLS enforces owner-only.
 * Imports are removed via ON DELETE CASCADE on the foreign key.
 */
export async function deleteMyStyle(
  supabase: SupabaseClient,
  styleId: string
) {
  const { error } = await supabase
    .from("subtitle_styles")
    .delete()
    .eq("id", styleId);

  if (error) throw error;
}

export async function isCurrentUserAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: adminRow, error: adminErr } = await supabase
    .from("style_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!adminErr && adminRow) return true;

  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (profileErr) {
    return false;
  }
  return Boolean(profile?.is_admin);
}

export async function fetchImportedStyleIds(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("subtitle_style_imports")
    .select("style_id")
    .eq("user_id", userId);

  if (error) throw error;
  return new Set(
    ((data || []) as { style_id: string }[]).map((row) => row.style_id)
  );
}

async function fetchAdminAuthorIds(
  supabase: SupabaseClient,
  rows: SubtitleStyleRow[],
  currentUserId?: string
) {
  const authorIds = Array.from(
    new Set(rows.map((row) => row.user_id).filter(Boolean))
  );
  const adminIds = new Set<string>();
  if (authorIds.length === 0) return adminIds;

  const [
    { data: rpcAdminIds },
    { data: styleAdmins },
    { data: profiles },
  ] = await Promise.all([
    supabase.rpc("style_admin_author_ids", { author_ids: authorIds }),
    supabase.from("style_admins").select("user_id").in("user_id", authorIds),
    supabase.from("user_profiles").select("id, is_admin").in("id", authorIds),
  ]);

  ((rpcAdminIds || []) as { user_id: string }[]).forEach((row) => {
    adminIds.add(row.user_id);
  });
  ((styleAdmins || []) as { user_id: string }[]).forEach((row) => {
    adminIds.add(row.user_id);
  });
  ((profiles || []) as { id: string; is_admin: boolean }[]).forEach((row) => {
    if (row.is_admin) adminIds.add(row.id);
  });

  if (currentUserId && authorIds.includes(currentUserId)) {
    if (await isCurrentUserAdmin(supabase, currentUserId)) {
      adminIds.add(currentUserId);
    }
  }

  return adminIds;
}

function getDisplayName(user: User) {
  const metadata = user.user_metadata as Record<string, unknown> | null;
  return typeof metadata?.name === "string"
    ? metadata.name
    : typeof metadata?.full_name === "string"
      ? metadata.full_name
      : "";
}
