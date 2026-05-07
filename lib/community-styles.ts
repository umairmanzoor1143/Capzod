import {
  isBuiltInSubtitleStyleId,
  subtitleStyles,
  type CustomSubtitleStyleConfig,
  type SubtitleAnimation,
  type SubtitleBehaviorOverrides,
  type SubtitleStyleId,
  type TypographyOverrides,
} from "@/lib/subtitles";

export type StyleApprovalStatus = "pending" | "approved" | "rejected";
export type StyleKind = "settings" | "code";

export type CommunitySubtitleStyle = {
  id: string;
  name: string;
  description: string;
  kind: StyleKind;
  baseStyle: SubtitleStyleId;
  typography: TypographyOverrides;
  behavior: SubtitleBehaviorOverrides;
  /** Source code (only for kind === "code"). */
  code?: string;
  status: StyleApprovalStatus;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
  importedAt?: string;
  imported?: boolean;
  mine?: boolean;
};

export type SubtitleStyleRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  base_style: string | null;
  typography: unknown;
  behavior?: unknown;
  kind?: string | null;
  code?: string | null;
  status: StyleApprovalStatus | string | null;
  author_name: string | null;
  created_at: string;
  updated_at: string | null;
};

export const communityStyleKey = (id: string) => `community:${id}`;

export function communityStyleIdFromKey(key: string) {
  return key.startsWith("community:") ? key.slice("community:".length) : null;
}

export function toCustomSubtitleStyleConfig(
  style: CommunitySubtitleStyle
): CustomSubtitleStyleConfig {
  return {
    baseStyle: style.baseStyle,
    typography: style.typography,
    behavior: style.behavior,
  };
}

export function getCommunityStyleAccent(style: CommunitySubtitleStyle) {
  const base = subtitleStyles.find((s) => s.id === style.baseStyle);
  return style.typography.accent || style.typography.color || base?.accent || "#ffffff";
}

export function getCommunityStylePreviewClass(style: CommunitySubtitleStyle) {
  return (
    subtitleStyles.find((s) => s.id === style.baseStyle)?.previewClass ||
    "font-bold text-white"
  );
}

export function normalizeCommunityStyle(
  row: SubtitleStyleRow,
  options?: { importedAt?: string; imported?: boolean; mine?: boolean }
): CommunitySubtitleStyle {
  const baseStyle = isBuiltInSubtitleStyleId(row.base_style)
    ? row.base_style
    : "clean-minimal";
  const status = isStyleApprovalStatus(row.status) ? row.status : "pending";
  const kind: StyleKind = row.kind === "code" ? "code" : "settings";

  return {
    id: row.id,
    name: row.name || "Untitled style",
    description: row.description || "",
    kind,
    baseStyle,
    typography: sanitizeTypography(row.typography),
    behavior: sanitizeBehavior(row.behavior),
    code: typeof row.code === "string" ? row.code : undefined,
    status,
    authorId: row.user_id,
    authorName: row.author_name || "Creator",
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined,
    importedAt: options?.importedAt,
    imported: options?.imported,
    mine: options?.mine,
  };
}

export function stylePayloadFromForm(input: {
  name: string;
  description: string;
  baseStyle: string;
  typography: TypographyOverrides;
  behavior?: SubtitleBehaviorOverrides;
  kind?: StyleKind;
  code?: string;
}) {
  const kind: StyleKind = input.kind === "code" ? "code" : "settings";
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    base_style: isBuiltInSubtitleStyleId(input.baseStyle)
      ? input.baseStyle
      : "clean-minimal",
    typography: sanitizeTypography(input.typography),
    behavior: sanitizeBehavior(input.behavior),
    kind,
    code: kind === "code" ? sanitizeStyleCode(input.code) : null,
  };
}

/**
 * Cap published code at 64KB and reject obviously dangerous tokens that
 * would only appear if someone tried to break out of the in-browser sandbox.
 * This is best-effort; the real sandbox is the browser's same-origin context.
 */
export function sanitizeStyleCode(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.slice(0, 64_000);
}

export function sanitizeCustomStyleConfig(
  value: unknown
): CustomSubtitleStyleConfig | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (!isBuiltInSubtitleStyleId(record.baseStyle)) return undefined;

  return {
    baseStyle: record.baseStyle,
    typography: sanitizeTypography(record.typography),
    behavior: sanitizeBehavior(record.behavior),
  };
}

export function sanitizeBehavior(value: unknown): SubtitleBehaviorOverrides {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  const next: SubtitleBehaviorOverrides = {};

  if (isSubtitleAnimation(source.animation)) next.animation = source.animation;
  if (typeof source.wordMode === "boolean") next.wordMode = source.wordMode;
  if (typeof source.bottom === "boolean") next.bottom = source.bottom;
  if (typeof source.background === "string") next.background = source.background;
  if (typeof source.boxShadow === "string") next.boxShadow = source.boxShadow;
  if (typeof source.textShadow === "string") next.textShadow = source.textShadow;
  if (typeof source.stroke === "string") next.stroke = source.stroke;
  if (typeof source.padding === "string") next.padding = source.padding;
  if (typeof source.radius === "number") next.radius = source.radius;

  return next;
}

export function sanitizeTypography(value: unknown): TypographyOverrides {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  const next: TypographyOverrides = {};

  if (typeof source.fontFamily === "string") next.fontFamily = source.fontFamily;
  if (typeof source.fontWeight === "number") next.fontWeight = source.fontWeight;
  if (typeof source.fontSize === "number") next.fontSize = source.fontSize;
  if (isTextTransform(source.textTransform)) next.textTransform = source.textTransform;
  if (typeof source.letterSpacing === "number") next.letterSpacing = source.letterSpacing;
  if (typeof source.lineHeight === "number") next.lineHeight = source.lineHeight;
  if (typeof source.color === "string") next.color = source.color;
  if (typeof source.accent === "string") next.accent = source.accent;
  if (typeof source.singleLine === "boolean") next.singleLine = source.singleLine;
  if (typeof source.maxWidthPercent === "number") {
    next.maxWidthPercent = source.maxWidthPercent;
  }
  if (isTextAlign(source.textAlign)) next.textAlign = source.textAlign;

  return next;
}

function isStyleApprovalStatus(value: unknown): value is StyleApprovalStatus {
  return value === "pending" || value === "approved" || value === "rejected";
}

function isTextTransform(
  value: unknown
): value is NonNullable<TypographyOverrides["textTransform"]> {
  return (
    value === "uppercase" ||
    value === "lowercase" ||
    value === "capitalize" ||
    value === "none"
  );
}

function isTextAlign(
  value: unknown
): value is NonNullable<TypographyOverrides["textAlign"]> {
  return value === "left" || value === "center" || value === "right";
}

function isSubtitleAnimation(value: unknown): value is SubtitleAnimation {
  return (
    value === "none" ||
    value === "pop" ||
    value === "slide" ||
    value === "fade" ||
    value === "type" ||
    value === "scan" ||
    value === "flash" ||
    value === "wave" ||
    value === "float"
  );
}
