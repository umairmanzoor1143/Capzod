import type {
  CustomSubtitleStyleConfig,
  SubtitleBehaviorOverrides,
  SubtitleStyleId,
  SubtitleVideoProps,
  TypographyOverrides,
} from "@/lib/subtitles";

export type StyleConfig = {
  fontSize: number;
  fontFamily: string;
  weight: number;
  textTransform?: "uppercase" | "lowercase" | "capitalize" | "none";
  color: string;
  accent: string;
  background?: string;
  border?: string;
  boxShadow?: string;
  textShadow?: string;
  stroke?: string;
  padding?: string;
  radius?: number;
  wordMode?: boolean;
  bottom?: boolean;
  letterSpacing?: number;
  lineHeight?: number;
  singleLine?: boolean;
  maxWidthPercent?: number;
  textAlign?: "left" | "center" | "right";
  animation: NonNullable<SubtitleBehaviorOverrides["animation"]>;
};

export const styleConfigs: Record<SubtitleStyleId, StyleConfig> = {
  "viral-tiktok": {
    fontSize: 92,
    fontFamily: "Arial Black, Impact, sans-serif",
    weight: 950,
    textTransform: "uppercase",
    color: "#fff",
    accent: "#ffe600",
    stroke: "2px rgba(0,0,0,.65)",
    textShadow: "0 7px 0 #111, 0 24px 42px rgba(0,0,0,.75)",
    wordMode: true,
    animation: "pop",
  },
  "clean-minimal": {
    fontSize: 46,
    fontFamily: "Arial, sans-serif",
    weight: 700,
    color: "#fff",
    accent: "#fff",
    background: "rgba(0,0,0,.66)",
    padding: "26px 36px",
    radius: 18,
    bottom: true,
    animation: "none",
  },
  "hook-style": {
    fontSize: 112,
    fontFamily: "Arial Black, Impact, sans-serif",
    weight: 950,
    textTransform: "uppercase",
    color: "#fff",
    accent: "#ffe600",
    stroke: "3px rgba(0,0,0,.72)",
    textShadow: "0 9px 0 #000, 0 28px 54px rgba(0,0,0,.85)",
    animation: "pop",
  },
  "neon-pulse": {
    fontSize: 82,
    fontFamily: "Arial Black, sans-serif",
    weight: 900,
    textTransform: "uppercase",
    color: "#e0fbff",
    accent: "#22d3ee",
    textShadow: "0 0 10px #22d3ee, 0 0 32px #0e7490",
    animation: "float",
  },
  "kinetic-bold": {
    fontSize: 88,
    fontFamily: "Impact, Arial Black, sans-serif",
    weight: 950,
    textTransform: "uppercase",
    color: "#fff",
    accent: "#fb7185",
    background: "#111827",
    padding: "18px 28px",
    radius: 4,
    animation: "slide",
  },
  typewriter: {
    fontSize: 58,
    fontFamily: "Menlo, Monaco, monospace",
    weight: 800,
    color: "#d1fae5",
    accent: "#34d399",
    background: "rgba(5,20,17,.82)",
    padding: "24px 30px",
    radius: 10,
    animation: "type",
  },
  "karaoke-bar": {
    fontSize: 70,
    fontFamily: "Arial Black, sans-serif",
    weight: 900,
    color: "#fff",
    accent: "#f59e0b",
    background: "rgba(15,23,42,.86)",
    padding: "20px 28px",
    radius: 12,
    wordMode: true,
    animation: "fade",
  },
  "comic-pop": {
    fontSize: 82,
    fontFamily: "Arial Black, sans-serif",
    weight: 950,
    textTransform: "uppercase",
    color: "#fff",
    accent: "#f472b6",
    background: "#7c3aed",
    padding: "20px 30px",
    radius: 22,
    textShadow: "4px 4px 0 #111",
    animation: "pop",
  },
  "glass-card": {
    fontSize: 58,
    fontFamily: "Arial, sans-serif",
    weight: 800,
    color: "#fff",
    accent: "#c4b5fd",
    background: "rgba(255,255,255,.16)",
    border: "1px solid rgba(255,255,255,.34)",
    padding: "28px 36px",
    radius: 24,
    boxShadow: "0 28px 90px rgba(0,0,0,.35)",
    animation: "fade",
  },
  "retro-wave": {
    fontSize: 78,
    fontFamily: "Impact, Arial Black, sans-serif",
    weight: 900,
    textTransform: "uppercase",
    color: "#fdf4ff",
    accent: "#67e8f9",
    textShadow: "3px 3px 0 #ec4899, -3px -3px 0 #06b6d4",
    animation: "wave",
  },
  "news-lower": {
    fontSize: 52,
    fontFamily: "Arial, sans-serif",
    weight: 900,
    textTransform: "uppercase",
    color: "#fff",
    accent: "#ef4444",
    background: "linear-gradient(90deg,#991b1b,#111827)",
    padding: "24px 38px",
    radius: 0,
    bottom: true,
    animation: "slide",
  },
  "luxury-serif": {
    fontSize: 68,
    fontFamily: "Georgia, Times New Roman, serif",
    weight: 700,
    color: "#fff7ed",
    accent: "#f5d08a",
    textShadow: "0 18px 60px rgba(0,0,0,.75)",
    animation: "fade",
    letterSpacing: 1,
  },
  "outlined-impact": {
    fontSize: 96,
    fontFamily: "Impact, Arial Black, sans-serif",
    weight: 950,
    textTransform: "uppercase",
    color: "transparent",
    accent: "#fff",
    stroke: "3px #fff",
    textShadow: "0 18px 38px rgba(0,0,0,.8)",
    animation: "pop",
  },
  "gradient-glow": {
    fontSize: 86,
    fontFamily: "Arial Black, sans-serif",
    weight: 950,
    textTransform: "uppercase",
    color: "#fff",
    accent: "#60a5fa",
    textShadow: "0 0 28px rgba(96,165,250,.9)",
    animation: "float",
  },
  "vertical-stack": {
    fontSize: 80,
    fontFamily: "Arial Black, sans-serif",
    weight: 950,
    textTransform: "uppercase",
    color: "#fff",
    accent: "#bef264",
    stroke: "2px #000",
    animation: "slide",
  },
  "caption-bubble": {
    fontSize: 56,
    fontFamily: "Arial, sans-serif",
    weight: 850,
    color: "#0f172a",
    accent: "#38bdf8",
    background: "#fff",
    padding: "24px 34px",
    radius: 999,
    boxShadow: "0 18px 0 #38bdf8, 0 30px 70px rgba(0,0,0,.38)",
    animation: "pop",
  },
  "cyber-scan": {
    fontSize: 64,
    fontFamily: "Menlo, Monaco, monospace",
    weight: 900,
    textTransform: "uppercase",
    color: "#ccfbf1",
    accent: "#2dd4bf",
    background: "rgba(3,7,18,.78)",
    border: "1px solid #2dd4bf",
    padding: "22px 30px",
    radius: 4,
    animation: "scan",
  },
  "soft-shadow": {
    fontSize: 62,
    fontFamily: "Arial, sans-serif",
    weight: 800,
    color: "#f8fafc",
    accent: "#c4b5fd",
    textShadow: "0 10px 34px rgba(15,23,42,.7)",
    animation: "fade",
  },
  "sticker-cutout": {
    fontSize: 86,
    fontFamily: "Arial Black, sans-serif",
    weight: 950,
    textTransform: "uppercase",
    color: "#fff",
    accent: "#fb923c",
    stroke: "5px #111",
    textShadow: "0 8px 0 #fb923c",
    animation: "pop",
  },
  cinematic: {
    fontSize: 50,
    fontFamily: "Georgia, Times New Roman, serif",
    weight: 700,
    textTransform: "uppercase",
    color: "#f8fafc",
    accent: "#e5e7eb",
    background: "rgba(0,0,0,.42)",
    padding: "18px 28px",
    radius: 2,
    bottom: true,
    animation: "fade",
    letterSpacing: 2,
  },
  "split-color": {
    fontSize: 84,
    fontFamily: "Arial Black, sans-serif",
    weight: 950,
    textTransform: "uppercase",
    color: "#fff",
    accent: "#4ade80",
    stroke: "2px #020617",
    wordMode: true,
    animation: "slide",
  },
  "minimal-caps": {
    fontSize: 38,
    fontFamily: "Arial, sans-serif",
    weight: 900,
    textTransform: "uppercase",
    color: "#e2e8f0",
    accent: "#94a3b8",
    bottom: true,
    animation: "fade",
    letterSpacing: 5,
  },
  "fire-flash": {
    fontSize: 90,
    fontFamily: "Impact, Arial Black, sans-serif",
    weight: 950,
    textTransform: "uppercase",
    color: "#fff7ed",
    accent: "#f97316",
    textShadow: "0 0 18px #f97316, 0 10px 0 #7f1d1d",
    animation: "flash",
  },
};

export function styleConfigToTypography(cfg: StyleConfig): TypographyOverrides {
  return {
    fontFamily: cfg.fontFamily,
    fontWeight: cfg.weight,
    fontSize: cfg.fontSize,
    textTransform: cfg.textTransform,
    letterSpacing: cfg.letterSpacing,
    lineHeight: cfg.lineHeight,
    color: cfg.color,
    accent: cfg.accent,
    singleLine: cfg.singleLine,
    maxWidthPercent: cfg.maxWidthPercent,
    textAlign: cfg.textAlign,
  };
}

/**
 * Overlay optional typography fields onto a base object (last defined value wins).
 * Used by code-style captions so per-subtitle overrides match {@link SubtitleVideo}.
 */
export function mergeCaptionTypographyLayers(
  base: TypographyOverrides,
  ...layers: (TypographyOverrides | undefined | null)[]
): TypographyOverrides {
  let out: TypographyOverrides = {...base};
  for (const layer of layers) {
    if (!layer) continue;
    out = {
      ...out,
      ...(layer.fontFamily !== undefined ? {fontFamily: layer.fontFamily} : {}),
      ...(layer.fontWeight !== undefined ? {fontWeight: layer.fontWeight} : {}),
      ...(layer.fontSize !== undefined ? {fontSize: layer.fontSize} : {}),
      ...(layer.textTransform !== undefined ? {textTransform: layer.textTransform} : {}),
      ...(layer.letterSpacing !== undefined ? {letterSpacing: layer.letterSpacing} : {}),
      ...(layer.lineHeight !== undefined ? {lineHeight: layer.lineHeight} : {}),
      ...(layer.color !== undefined ? {color: layer.color} : {}),
      ...(layer.accent !== undefined ? {accent: layer.accent} : {}),
      ...(layer.singleLine !== undefined ? {singleLine: layer.singleLine} : {}),
      ...(layer.maxWidthPercent !== undefined ? {maxWidthPercent: layer.maxWidthPercent} : {}),
      ...(layer.textAlign !== undefined ? {textAlign: layer.textAlign} : {}),
    };
  }
  return out;
}

export function mergeTypography(
  base: StyleConfig,
  global?: TypographyOverrides,
  perChunk?: TypographyOverrides
): StyleConfig {
  const apply = (cfg: StyleConfig, o?: TypographyOverrides): StyleConfig => {
    if (!o) return cfg;
    return {
      ...cfg,
      fontFamily: o.fontFamily ?? cfg.fontFamily,
      weight: o.fontWeight ?? cfg.weight,
      fontSize: o.fontSize ?? cfg.fontSize,
      textTransform: o.textTransform ?? cfg.textTransform,
      letterSpacing: o.letterSpacing ?? cfg.letterSpacing,
      lineHeight: o.lineHeight ?? cfg.lineHeight,
      color: o.color ?? cfg.color,
      accent: o.accent ?? cfg.accent,
      singleLine: o.singleLine ?? cfg.singleLine,
      maxWidthPercent: o.maxWidthPercent ?? cfg.maxWidthPercent,
      textAlign: o.textAlign ?? cfg.textAlign,
    };
  };
  return apply(apply(base, global), perChunk);
}

export function applyBehavior(
  base: StyleConfig,
  behavior?: SubtitleBehaviorOverrides
): StyleConfig {
  if (!behavior) return base;

  return {
    ...base,
    animation: behavior.animation ?? base.animation,
    wordMode: behavior.wordMode ?? base.wordMode,
    bottom: behavior.bottom ?? base.bottom,
    background: behavior.background ?? base.background,
    boxShadow: behavior.boxShadow ?? base.boxShadow,
    textShadow: behavior.textShadow ?? base.textShadow,
    stroke: behavior.stroke ?? base.stroke,
    padding: behavior.padding ?? base.padding,
    radius: behavior.radius ?? base.radius,
  };
}

export function mergeCustomStyle(
  base: StyleConfig,
  custom?: SubtitleVideoProps["customStyle"]
): StyleConfig {
  if (!custom) return base;
  return applyBehavior(mergeTypography(base, custom.typography), custom.behavior);
}

/** Effective typography for a preset + optional community overrides (Settings tab inherit source). */
export function resolvePresetTypographyForEditor(
  baseStyleId: SubtitleStyleId,
  presetTypography?: TypographyOverrides
): TypographyOverrides {
  const base = styleConfigs[baseStyleId] ?? styleConfigs["clean-minimal"];
  const merged = mergeTypography(base, presetTypography, undefined);
  return styleConfigToTypography(merged);
}

/** Studio global typography merged on top of an imported / custom preset (matches SubtitleVideo). */
export function computeStudioCaptionTypography(
  baseStyleId: SubtitleStyleId,
  customStyle: CustomSubtitleStyleConfig | undefined,
  studioTypography: TypographyOverrides | undefined
): TypographyOverrides {
  const base = styleConfigs[baseStyleId] ?? styleConfigs["clean-minimal"];
  const customConfig = mergeCustomStyle(base, customStyle);
  const merged = mergeTypography(customConfig, studioTypography, undefined);
  return styleConfigToTypography(merged);
}
