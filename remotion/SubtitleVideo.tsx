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
import {
  mergeCustomStyle,
  mergeTypography,
  styleConfigs,
  type StyleConfig,
} from "../lib/subtitle-style-merge";

const defaultProps: SubtitleVideoProps = {
  text: sampleScript,
  style: "viral-tiktok",
  background: "black"
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

function transformForAnimation(
  animation: StyleConfig["animation"],
  localFrame: number,
  fps: number
) {
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
  styleId,
  activeWordIndex,
  localFrame,
  fps
}: {
  chunk: SubtitleItem;
  config: StyleConfig;
  styleId: SubtitleStyleId;
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
      {config.wordMode || ["split-color", "vertical-stack"].includes(styleId) ? (
        <span style={{display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 20px"}}>
          {words.map((word, index) => {
            const active = index === activeWordIndex;
            const vertical = styleId === "vertical-stack";
            return (
              <span
                key={`${chunk.id}-${word}-${index}`}
                style={{
                  display: vertical ? "block" : "inline-block",
                  flexBasis: vertical ? "100%" : "auto",
                  color: active || index % 2 === 1 ? config.accent : config.color === "transparent" ? config.accent : config.color,
                  transform: active ? "scale(1.12) translateY(-3px)" : "scale(1)",
                  background: styleId === "karaoke-bar" && active ? config.accent : undefined,
                  padding: styleId === "karaoke-bar" && active ? "2px 12px" : undefined,
                  borderRadius: styleId === "karaoke-bar" && active ? 8 : undefined
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

export function SubtitleVideo(props: Partial<SubtitleVideoProps>) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const mergedProps = {...defaultProps, ...props};
  const timeline = createTimelineFromSubtitles(mergedProps.subtitles, mergedProps.text || sampleScript);
  const currentSecond = frame / fps;
  const activeChunk = getActiveChunk(timeline.chunks, currentSecond);
  const baseStyleId = mergedProps.customStyle?.baseStyle ?? mergedProps.style;
  const baseConfig = styleConfigs[baseStyleId] ?? styleConfigs["viral-tiktok"];
  const customConfig = mergeCustomStyle(baseConfig, mergedProps.customStyle);
  const config = mergeTypography(customConfig, mergedProps.typography, activeChunk?.overrides);

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
        styleId={baseStyleId}
        activeWordIndex={activeWordIndex}
        localFrame={localFrame}
        fps={fps}
      />
    </AbsoluteFill>
  );
}
