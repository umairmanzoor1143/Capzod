"use client";

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig
} from "remotion";
import {
  createTimelineFromSubtitles,
  sampleScript,
  secondsToFrames,
  type SubtitleItem,
  type SubtitleStyleId,
  type SubtitleVideoProps,
  type TypographyOverrides
} from "../lib/subtitles";

type StyleConfig = {
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
  animation: "none" | "pop" | "slide" | "fade" | "type" | "scan" | "flash" | "wave" | "float";
};

const defaultProps: SubtitleVideoProps = {
  text: sampleScript,
  style: "viral-tiktok",
  background: "black"
};

const styleConfigs: Record<SubtitleStyleId, StyleConfig> = {
  "viral-tiktok": {fontSize: 92, fontFamily: "Arial Black, Impact, sans-serif", weight: 950, textTransform: "uppercase", color: "#fff", accent: "#ffe600", stroke: "2px rgba(0,0,0,.65)", textShadow: "0 7px 0 #111, 0 24px 42px rgba(0,0,0,.75)", wordMode: true, animation: "pop"},
  "clean-minimal": {fontSize: 46, fontFamily: "Arial, sans-serif", weight: 700, color: "#fff", accent: "#fff", background: "rgba(0,0,0,.66)", padding: "26px 36px", radius: 18, bottom: true, animation: "none"},
  "hook-style": {fontSize: 112, fontFamily: "Arial Black, Impact, sans-serif", weight: 950, textTransform: "uppercase", color: "#fff", accent: "#ffe600", stroke: "3px rgba(0,0,0,.72)", textShadow: "0 9px 0 #000, 0 28px 54px rgba(0,0,0,.85)", animation: "pop"},
  "neon-pulse": {fontSize: 82, fontFamily: "Arial Black, sans-serif", weight: 900, textTransform: "uppercase", color: "#e0fbff", accent: "#22d3ee", textShadow: "0 0 10px #22d3ee, 0 0 32px #0e7490", animation: "float"},
  "kinetic-bold": {fontSize: 88, fontFamily: "Impact, Arial Black, sans-serif", weight: 950, textTransform: "uppercase", color: "#fff", accent: "#fb7185", background: "#111827", padding: "18px 28px", radius: 4, animation: "slide"},
  typewriter: {fontSize: 58, fontFamily: "Menlo, Monaco, monospace", weight: 800, color: "#d1fae5", accent: "#34d399", background: "rgba(5,20,17,.82)", padding: "24px 30px", radius: 10, animation: "type"},
  "karaoke-bar": {fontSize: 70, fontFamily: "Arial Black, sans-serif", weight: 900, color: "#fff", accent: "#f59e0b", background: "rgba(15,23,42,.86)", padding: "20px 28px", radius: 12, wordMode: true, animation: "fade"},
  "comic-pop": {fontSize: 82, fontFamily: "Arial Black, sans-serif", weight: 950, textTransform: "uppercase", color: "#fff", accent: "#f472b6", background: "#7c3aed", padding: "20px 30px", radius: 22, textShadow: "4px 4px 0 #111", animation: "pop"},
  "glass-card": {fontSize: 58, fontFamily: "Arial, sans-serif", weight: 800, color: "#fff", accent: "#c4b5fd", background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.34)", padding: "28px 36px", radius: 24, boxShadow: "0 28px 90px rgba(0,0,0,.35)", animation: "fade"},
  "retro-wave": {fontSize: 78, fontFamily: "Impact, Arial Black, sans-serif", weight: 900, textTransform: "uppercase", color: "#fdf4ff", accent: "#67e8f9", textShadow: "3px 3px 0 #ec4899, -3px -3px 0 #06b6d4", animation: "wave"},
  "news-lower": {fontSize: 52, fontFamily: "Arial, sans-serif", weight: 900, textTransform: "uppercase", color: "#fff", accent: "#ef4444", background: "linear-gradient(90deg,#991b1b,#111827)", padding: "24px 38px", radius: 0, bottom: true, animation: "slide"},
  "luxury-serif": {fontSize: 68, fontFamily: "Georgia, Times New Roman, serif", weight: 700, color: "#fff7ed", accent: "#f5d08a", textShadow: "0 18px 60px rgba(0,0,0,.75)", animation: "fade", letterSpacing: 1},
  "outlined-impact": {fontSize: 96, fontFamily: "Impact, Arial Black, sans-serif", weight: 950, textTransform: "uppercase", color: "transparent", accent: "#fff", stroke: "3px #fff", textShadow: "0 18px 38px rgba(0,0,0,.8)", animation: "pop"},
  "gradient-glow": {fontSize: 86, fontFamily: "Arial Black, sans-serif", weight: 950, textTransform: "uppercase", color: "#fff", accent: "#60a5fa", textShadow: "0 0 28px rgba(96,165,250,.9)", animation: "float"},
  "vertical-stack": {fontSize: 80, fontFamily: "Arial Black, sans-serif", weight: 950, textTransform: "uppercase", color: "#fff", accent: "#bef264", stroke: "2px #000", animation: "slide"},
  "caption-bubble": {fontSize: 56, fontFamily: "Arial, sans-serif", weight: 850, color: "#0f172a", accent: "#38bdf8", background: "#fff", padding: "24px 34px", radius: 999, boxShadow: "0 18px 0 #38bdf8, 0 30px 70px rgba(0,0,0,.38)", animation: "pop"},
  "cyber-scan": {fontSize: 64, fontFamily: "Menlo, Monaco, monospace", weight: 900, textTransform: "uppercase", color: "#ccfbf1", accent: "#2dd4bf", background: "rgba(3,7,18,.78)", border: "1px solid #2dd4bf", padding: "22px 30px", radius: 4, animation: "scan"},
  "soft-shadow": {fontSize: 62, fontFamily: "Arial, sans-serif", weight: 800, color: "#f8fafc", accent: "#c4b5fd", textShadow: "0 10px 34px rgba(15,23,42,.7)", animation: "fade"},
  "sticker-cutout": {fontSize: 86, fontFamily: "Arial Black, sans-serif", weight: 950, textTransform: "uppercase", color: "#fff", accent: "#fb923c", stroke: "5px #111", textShadow: "0 8px 0 #fb923c", animation: "pop"},
  cinematic: {fontSize: 50, fontFamily: "Georgia, Times New Roman, serif", weight: 700, textTransform: "uppercase", color: "#f8fafc", accent: "#e5e7eb", background: "rgba(0,0,0,.42)", padding: "18px 28px", radius: 2, bottom: true, animation: "fade", letterSpacing: 2},
  "split-color": {fontSize: 84, fontFamily: "Arial Black, sans-serif", weight: 950, textTransform: "uppercase", color: "#fff", accent: "#4ade80", stroke: "2px #020617", wordMode: true, animation: "slide"},
  "minimal-caps": {fontSize: 38, fontFamily: "Arial, sans-serif", weight: 900, textTransform: "uppercase", color: "#e2e8f0", accent: "#94a3b8", bottom: true, animation: "fade", letterSpacing: 5},
  "fire-flash": {fontSize: 90, fontFamily: "Impact, Arial Black, sans-serif", weight: 950, textTransform: "uppercase", color: "#fff7ed", accent: "#f97316", textShadow: "0 0 18px #f97316, 0 10px 0 #7f1d1d", animation: "flash"}
};

function getActiveChunk(chunks: SubtitleItem[], currentSecond: number) {
  return chunks.find((chunk) => currentSecond >= chunk.start && currentSecond < chunk.end) ?? chunks[chunks.length - 1];
}

function getActiveWordIndex(chunk: SubtitleItem, currentSecond: number) {
  const relativeSecond = currentSecond - chunk.start;
  const index = chunk.wordTimings.findIndex((word) => relativeSecond >= word.start && relativeSecond < word.end);
  return index === -1 ? chunk.words.length - 1 : index;
}

function VideoBackground({background}: {background: SubtitleVideoProps["background"]}) {
  if (background === "transparent") {
    return null;
  }

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% 45%, rgba(109,53,245,.18), transparent 30%), radial-gradient(circle at 52% 60%, rgba(255,230,0,.12), transparent 22%), #020203"
      }}
    />
  );
}

function transformForAnimation(animation: StyleConfig["animation"], localFrame: number, fps: number) {
  const pop = spring({frame: localFrame, fps, config: {damping: 8, stiffness: 190, mass: 0.55}});
  const fade = interpolate(localFrame, [0, 8], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const slide = interpolate(localFrame, [0, 12], [42, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const wave = Math.sin(localFrame / 4) * 3;
  const flash = localFrame < 5 ? 1.12 : 1;

  if (animation === "none") return {opacity: 1, transform: "translate(-50%, -50%) scale(1)"};
  if (animation === "slide") return {opacity: fade, transform: `translate(calc(-50% + ${slide}px), -50%) scale(1)`};
  if (animation === "fade" || animation === "type") return {opacity: fade, transform: "translate(-50%, -50%) scale(1)"};
  if (animation === "scan") return {opacity: fade, transform: `translate(-50%, calc(-50% + ${slide * -0.25}px)) scale(1)`};
  if (animation === "wave") return {opacity: fade, transform: `translate(-50%, calc(-50% + ${wave}px)) rotate(${wave * 0.4}deg)`};
  if (animation === "float") return {opacity: fade, transform: `translate(-50%, calc(-50% + ${Math.sin(localFrame / 8) * 8}px)) scale(${1 + Math.sin(localFrame / 10) * 0.02})`};
  if (animation === "flash") return {opacity: fade, transform: `translate(-50%, -50%) scale(${flash})`};
  return {opacity: fade, transform: `translate(-50%, -50%) scale(${0.78 + pop * 0.25})`};
}

function RenderedText({
  chunk,
  config,
  activeWordIndex,
  localFrame,
  fps
}: {
  chunk: SubtitleItem;
  config: StyleConfig;
  activeWordIndex: number;
  localFrame: number;
  fps: number;
}) {
  const animated = transformForAnimation(config.animation, localFrame, fps);
  const y = config.bottom ? 84 : chunk.y;
  const displayText = config.animation === "type"
    ? chunk.text.slice(0, Math.max(1, Math.ceil((localFrame / Math.max(1, secondsToFrames(chunk.duration, fps))) * chunk.text.length)))
    : chunk.text;
  const words = config.animation === "type" ? displayText.split(/\s+/).filter(Boolean) : chunk.words;

  return (
    <div
      style={{
        position: "absolute",
        left: `${chunk.x}%`,
        top: `${y}%`,
        maxWidth: `${config.maxWidthPercent ?? 88}%`,
        textAlign: config.textAlign ?? "center",
        opacity: animated.opacity,
        transform: animated.transform,
        transformOrigin: "center",
        fontFamily: config.fontFamily,
        fontWeight: config.weight,
        fontSize: config.fontSize,
        lineHeight: config.lineHeight ?? 0.95,
        letterSpacing: config.letterSpacing ?? 0,
        textTransform: config.textTransform ?? "none",
        color: config.color,
        background: config.background,
        border: config.border,
        boxShadow: config.boxShadow,
        textShadow: config.textShadow,
        WebkitTextStroke: config.stroke,
        borderRadius: config.radius,
        padding: config.padding,
        whiteSpace: config.singleLine ? "nowrap" : "normal"
      }}
    >
      {config.wordMode || ["split-color", "vertical-stack"].includes(defaultStyle(config)) ? (
        <span style={{display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 20px"}}>
          {words.map((word, index) => {
            const active = index === activeWordIndex;
            const vertical = defaultStyle(config) === "vertical-stack";
            return (
              <span
                key={`${chunk.id}-${word}-${index}`}
                style={{
                  display: vertical ? "block" : "inline-block",
                  flexBasis: vertical ? "100%" : "auto",
                  color: active || index % 2 === 1 ? config.accent : config.color === "transparent" ? config.accent : config.color,
                  transform: active ? "scale(1.12) translateY(-3px)" : "scale(1)",
                  background: defaultStyle(config) === "karaoke-bar" && active ? config.accent : undefined,
                  padding: defaultStyle(config) === "karaoke-bar" && active ? "2px 12px" : undefined,
                  borderRadius: defaultStyle(config) === "karaoke-bar" && active ? 8 : undefined
                }}
              >
                {word}
              </span>
            );
          })}
        </span>
      ) : (
        words.map((word, index) => (
          <span
            key={`${chunk.id}-${word}-${index}`}
            style={{color: index === 1 || index === 2 ? config.accent : undefined, margin: "0 10px 8px", display: "inline-block"}}
          >
            {word}
          </span>
        ))
      )}
      {config.animation === "scan" ? (
        <span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${(localFrame * 5) % 100}%`,
            height: 3,
            background: config.accent,
            boxShadow: `0 0 18px ${config.accent}`
          }}
        />
      ) : null}
    </div>
  );
}

function defaultStyle(config: StyleConfig): SubtitleStyleId | "" {
  const match = Object.entries(styleConfigs).find(([, value]) => value === config);
  return (match?.[0] as SubtitleStyleId | undefined) ?? "";
}

export function SubtitleVideo(props: Partial<SubtitleVideoProps>) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const mergedProps = {...defaultProps, ...props};
  const timeline = createTimelineFromSubtitles(mergedProps.subtitles, mergedProps.text || sampleScript);
  const currentSecond = frame / fps;
  const activeChunk = getActiveChunk(timeline.chunks, currentSecond);
  const baseConfig = styleConfigs[mergedProps.style] ?? styleConfigs["viral-tiktok"];
  const config = mergeTypography(baseConfig, mergedProps.typography, activeChunk?.overrides);

  if (!activeChunk) {
    return <AbsoluteFill style={{background: mergedProps.background === "transparent" ? "transparent" : "#030303"}} />;
  }

  const activeWordIndex = getActiveWordIndex(activeChunk, currentSecond);
  const localFrame = frame - secondsToFrames(activeChunk.start, fps);

  return (
    <AbsoluteFill style={{background: mergedProps.background === "transparent" ? "transparent" : "#030303"}}>
      <VideoBackground background={mergedProps.background} />
      <RenderedText
        chunk={activeChunk}
        config={config}
        activeWordIndex={activeWordIndex}
        localFrame={localFrame}
        fps={fps}
      />
    </AbsoluteFill>
  );
}

function mergeTypography(
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
