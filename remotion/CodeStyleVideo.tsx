"use client";

import * as React from "react";
import {
  AbsoluteFill,
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
} from "../lib/subtitles";
import {compileStyleCode} from "../lib/compile-style-code";

/**
 * Props handed to the user-defined caption component on every frame.
 */
export type CodeStyleRenderProps = {
  chunk: SubtitleItem;
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
};

const FallbackCaption: CodeStyleComponent = ({chunk, activeWordIndex}) => (
  <div
    style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      fontFamily: "Arial Black, Impact, sans-serif",
      fontSize: 88,
      fontWeight: 950,
      color: "#fff",
      textTransform: "uppercase",
      textShadow: "0 6px 0 #111, 0 22px 38px rgba(0,0,0,.7)",
    }}
  >
    {chunk.words.map((word, index) => (
      <span
        key={index}
        style={{
          color: index === activeWordIndex ? "#ffe600" : "#fff",
          margin: "0 10px",
          display: "inline-block",
        }}
      >
        {word}
      </span>
    ))}
  </div>
);

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

  const localFrame = frame - secondsToFrames(activeChunk.start, fps);
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
        chunk={activeChunk}
        activeWordIndex={activeWordIndex}
        words={activeChunk.words}
        text={activeChunk.text}
        localFrame={localFrame}
        frame={frame}
        fps={fps}
        progress={progress}
        width={width}
        height={height}
        styleProps={props.styleProps ?? {}}
      />}>
        <Component
          chunk={activeChunk}
          activeWordIndex={activeWordIndex}
          words={activeChunk.words}
          text={activeChunk.text}
          localFrame={localFrame}
          frame={frame}
          fps={fps}
          progress={progress}
          width={width}
          height={height}
          styleProps={props.styleProps ?? {}}
        />
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
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
};
