"use client";

import * as React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  createTimelineFromSubtitles,
  sampleScript,
  secondsToFrames,
  type SubtitleItem,
  type VideoBackground,
  type SubtitleStyleId,
  type CustomSubtitleStyleConfig,
  type TypographyOverrides,
} from "../lib/subtitles";
import {compileStyleCode} from "../lib/compile-style-code";
import {mergeCaptionTypographyLayers} from "../lib/subtitle-style-merge";

const CODE_TYPO_SCOPE = "cap-code-studio-typography-scope";

/**
 * When the studio "Settings" tab has typography overrides, imported **code**
 * styles still often hard-code font/size on each span. A normal parent style
 * cannot beat inline styles — scoped `!important` rules can, so global
 * typography matches the Settings panel.
 *
 * The same applies to **per-subtitle overrides** when the user has not changed
 * global Settings: we still need the shell so chunk-level typography wins over
 * hard-coded inline styles in community code.
 *
 * Injected on all descendants: font, size, weight, spacing, line-height,
 * text-transform, text color, text-align, and single-line (nowrap + flex-wrap).
 * Max width stays on the shell wrappers only so nested layouts are not broken.
 */
function StudioCodeGlobalTypographyShell({
  active,
  mergedTypography,
  children,
}: {
  active: boolean;
  mergedTypography: TypographyOverrides;
  children: React.ReactNode;
}) {
  if (!active) {
    return <>{children}</>;
  }

  const parts: string[] = [];
  if (mergedTypography.fontFamily != null) {
    parts.push(`font-family: ${JSON.stringify(mergedTypography.fontFamily)} !important`);
  }
  if (mergedTypography.fontWeight != null) {
    parts.push(`font-weight: ${mergedTypography.fontWeight} !important`);
  }
  if (mergedTypography.fontSize != null) {
    parts.push(`font-size: ${mergedTypography.fontSize}px !important`);
  }
  if (mergedTypography.letterSpacing != null) {
    parts.push(`letter-spacing: ${mergedTypography.letterSpacing}px !important`);
  }
  if (mergedTypography.lineHeight != null) {
    parts.push(`line-height: ${mergedTypography.lineHeight} !important`);
  }
  if (mergedTypography.textTransform != null) {
    parts.push(`text-transform: ${mergedTypography.textTransform} !important`);
  }
  if (mergedTypography.color != null && mergedTypography.color !== "") {
    const c = String(mergedTypography.color).trim();
    parts.push(`color: ${JSON.stringify(c)} !important`);
  }
  if (mergedTypography.textAlign != null) {
    parts.push(`text-align: ${mergedTypography.textAlign} !important`);
  }
  if (mergedTypography.singleLine) {
    parts.push(`white-space: nowrap !important`);
    parts.push(`flex-wrap: nowrap !important`);
  }

  const block =
    parts.length === 0
      ? ""
      : `.${CODE_TYPO_SCOPE} *, .${CODE_TYPO_SCOPE} *::before, .${CODE_TYPO_SCOPE} *::after { ${parts.join("; ")} }`;

  const maxW =
    mergedTypography.maxWidthPercent != null
      ? `${mergedTypography.maxWidthPercent}%`
      : undefined;

  return (
    <div
      className={CODE_TYPO_SCOPE}
      style={{
        position: "absolute",
        inset: 0,
        maxWidth: maxW,
        marginLeft: "auto",
        marginRight: "auto",
        textAlign: mergedTypography.textAlign,
        whiteSpace: mergedTypography.singleLine ? "nowrap" : undefined,
        boxSizing: "border-box",
      }}
    >
      {block ? (
        <style
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{__html: block}}
        />
      ) : null}
      <div
        style={{
          width: "100%",
          height: "100%",
          maxWidth: maxW ?? "100%",
          marginLeft: "auto",
          marginRight: "auto",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Props handed to the user-defined caption component on every frame.
 */
export type CodeStyleRenderProps = {
  chunk: SubtitleItem & {
    startFrame: number;
    endFrame: number;
    durationInFrames: number;
  };
  activeWordIndex: number;
  words: string[];
  text: string;
  localFrame: number;
  frame: number;
  fps: number;
  progress: number;
  width: number;
  height: number;
  styleProps: Record<string, unknown>;
};

export type CodeStyleComponent = React.ComponentType<CodeStyleRenderProps>;

export type CodeStyleVideoProps = {
  text: string;
  background?: VideoBackground;
  /** Source code string. Compiled at runtime. Serializable, works in SSR. */
  code?: string;
  /** Pre-compiled component. Used by the live editor to skip a compile. */
  Component?: CodeStyleComponent | null;
  subtitles?: SubtitleItem[];
  styleProps?: Record<string, unknown>;
  /** Built-in base id for merging studio typography (defaults to viral-tiktok). */
  style?: SubtitleStyleId;
  customStyle?: CustomSubtitleStyleConfig;
  /** Global studio typography; merged into styleProps.typography for the user component. */
  typography?: TypographyOverrides;
};

const FallbackCaption: CodeStyleComponent = ({
  chunk,
  activeWordIndex,
  styleProps,
}) => {
  const t = (styleProps?.typography ?? {}) as TypographyOverrides;
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        fontFamily: t.fontFamily ?? "Arial Black, Impact, sans-serif",
        fontSize: t.fontSize ?? 88,
        fontWeight: t.fontWeight ?? 950,
        color: t.color ?? "#fff",
        textTransform: (t.textTransform as React.CSSProperties["textTransform"]) ?? "uppercase",
        letterSpacing: t.letterSpacing,
        lineHeight: t.lineHeight,
        textShadow: "0 6px 0 #111, 0 22px 38px rgba(0,0,0,.7)",
      }}
    >
      {chunk.words.map((word, index) => (
        <span
          key={index}
          style={{
            color: index === activeWordIndex ? (t.accent ?? "#ffe600") : (t.color ?? "#fff"),
            margin: "0 10px",
            display: "inline-block",
          }}
        >
          {word}
        </span>
      ))}
    </div>
  );
};

export function CodeStyleVideo(props: Partial<CodeStyleVideoProps>) {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const text = props.text || sampleScript;
  const background = props.background ?? "black";

  // Resolve the user component: prefer pre-compiled, else compile from `code`.
  const compiled = React.useMemo(() => {
    if (props.Component) return {Component: props.Component, error: null as string | null};
    if (props.code && props.code.trim()) {
      const result = compileStyleCode(props.code);
      if (result.ok) return {Component: result.Component, error: null};
      return {Component: FallbackCaption, error: result.error};
    }
    return {Component: FallbackCaption, error: null};
  }, [props.Component, props.code]);

  const Component = compiled.Component;

  const timeline = React.useMemo(
    () => createTimelineFromSubtitles(props.subtitles, text),
    [props.subtitles, text]
  );

  const currentSecond = frame / fps;
  const activeChunk =
    timeline.chunks.find(
      (chunk) => currentSecond >= chunk.start && currentSecond < chunk.end
    ) ?? timeline.chunks[timeline.chunks.length - 1];

  if (!activeChunk) {
    return (
      <AbsoluteFill
        style={{background: background === "transparent" ? "transparent" : "#030303"}}
      />
    );
  }

  const chunkStartFrame = secondsToFrames(activeChunk.start, fps);
  const chunkEndFrame = Math.max(
    chunkStartFrame + 1,
    secondsToFrames(activeChunk.end, fps)
  );
  const activeChunkWithFrames = {
    ...activeChunk,
    startFrame: chunkStartFrame,
    endFrame: chunkEndFrame,
    durationInFrames: chunkEndFrame - chunkStartFrame,
  };
  const localFrame = frame - chunkStartFrame;
  const relativeSecond = currentSecond - activeChunk.start;
  const wordIndex = activeChunk.wordTimings.findIndex(
    (word) => relativeSecond >= word.start && relativeSecond < word.end
  );
  const activeWordIndex =
    wordIndex === -1 ? activeChunk.words.length - 1 : wordIndex;
  const progress = Math.min(
    1,
    Math.max(0, relativeSecond / Math.max(0.001, activeChunk.duration))
  );

  const {mergedStyleProps, mergedTypography} = React.useMemo(() => {
    const base = props.styleProps ?? {};
    const customTypography = props.customStyle?.typography;
    if (!props.typography && !customTypography) {
      return {mergedStyleProps: base, mergedTypography: null as TypographyOverrides | null};
    }

    const mergedTypographyInner = mergeCaptionTypographyLayers(
      customTypography ?? {},
      props.typography
    );
    return {
      mergedStyleProps: {
        ...base,
        typography: {
          ...(typeof base.typography === "object" && base.typography !== null
            ? (base.typography as object)
            : {}),
          ...mergedTypographyInner,
        },
      },
      mergedTypography: mergedTypographyInner,
    };
  }, [props.styleProps, props.typography, props.customStyle]);

  const baseTypography = (mergedStyleProps.typography ?? {}) as TypographyOverrides;
  const typographyWithChunk = mergeCaptionTypographyLayers(
    baseTypography,
    activeChunk.overrides
  );
  const stylePropsForRender = {
    ...mergedStyleProps,
    typography: typographyWithChunk,
  };
  const typographyForShell = mergeCaptionTypographyLayers(
    mergedTypography ?? {},
    activeChunk.overrides
  );

  const hasStudioTypography = Object.keys(props.typography ?? {}).length > 0;
  const hasCustomStyleTypography =
    Object.keys(props.customStyle?.typography ?? {}).length > 0;
  const hasChunkTypographyOverrides =
    activeChunk.overrides != null && Object.keys(activeChunk.overrides).length > 0;
  /** Same trigger as studio typography: inline styles in community code need `!important` to lose. */
  const studioTypographyActive =
    Object.keys(typographyForShell).length > 0 &&
    (hasStudioTypography || hasCustomStyleTypography || hasChunkTypographyOverrides);

  return (
    <AbsoluteFill
      style={{
        background:
          background === "transparent"
            ? "transparent"
            : "radial-gradient(circle at 50% 45%, rgba(109,53,245,.18), transparent 30%), #020203",
      }}
    >
      <UserErrorBoundary fallback={<FallbackCaption
        chunk={activeChunkWithFrames}
        activeWordIndex={activeWordIndex}
        words={activeChunk.words}
        text={activeChunk.text}
        localFrame={localFrame}
        frame={frame}
        fps={fps}
        progress={progress}
        width={width}
        height={height}
        styleProps={stylePropsForRender}
      />}>
        <StudioCodeGlobalTypographyShell
          active={studioTypographyActive}
          mergedTypography={typographyForShell}
        >
          <Component
            chunk={activeChunkWithFrames}
            activeWordIndex={activeWordIndex}
            words={activeChunk.words}
            text={activeChunk.text}
            localFrame={localFrame}
            frame={frame}
            fps={fps}
            progress={progress}
            width={width}
            height={height}
            styleProps={stylePropsForRender}
          />
        </StudioCodeGlobalTypographyShell>
      </UserErrorBoundary>
    </AbsoluteFill>
  );
}

/**
 * Catches runtime crashes inside the user component so the rest of the
 * studio (and SSR rendering pipeline) keeps working.
 */
class UserErrorBoundary extends React.Component<
  {children: React.ReactNode; fallback: React.ReactNode},
  {hasError: boolean}
> {
  state = {hasError: false};
  static getDerivedStateFromError() {
    return {hasError: true};
  }
  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("[code-style] runtime error:", error);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// Re-export Remotion helpers so /styles/code can pass them into the user scope.
export const codeStyleHelpers = {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
};
