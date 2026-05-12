"use client";

import * as React from "react";
import {Thumbnail} from "@remotion/player";
import {SubtitleVideo} from "@/remotion/SubtitleVideo";
import {CodeStyleVideo} from "@/remotion/CodeStyleVideo";
import {
  createTimelineFromText,
  getTimelineDurationInFrames,
  sampleScript,
} from "@/lib/subtitles";
import {
  toCustomSubtitleStyleConfig,
  type CommunitySubtitleStyle,
} from "@/lib/community-styles";

const FPS = 30;
const W = 1280;
const H = 720;

/**
 * Renders the styled composition using <Thumbnail> while we drive the frame
 * ourselves via requestAnimationFrame. This avoids the Remotion <Player>'s
 * layout / audio-context / ResizeObserver lifecycle, which was causing the
 * "doesn't animate until DevTools opens" bug.
 */
export function StylePreviewSurface({
  style,
  playing,
}: {
  style: CommunitySubtitleStyle;
  playing: boolean;
}) {
  const subtitles = React.useMemo(() => createTimelineFromText(sampleScript).chunks, []);
  const durationInFrames = React.useMemo(
    () => Math.max(getTimelineDurationInFrames(sampleScript, FPS, subtitles), FPS * 6),
    [subtitles]
  );

  const isCode = style.kind === "code";
  const customStyle = isCode ? undefined : toCustomSubtitleStyleConfig(style);

  const inputProps = isCode
    ? {
        subtitles,
        background: "black" as const,
        text: sampleScript,
        width: W,
        height: H,
        code: style.code,
      }
    : {
        subtitles,
        style: style.baseStyle,
        customStyle,
        background: "black" as const,
        text: sampleScript,
        width: W,
        height: H,
      };

  const restingFrame = Math.min(45, durationInFrames - 1);
  const [frame, setFrame] = React.useState(restingFrame);

  React.useEffect(() => {
    if (!playing) {
      setFrame(restingFrame);
      return;
    }
    let raf = 0;
    const startTime = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - startTime) / 1000; // seconds
      const f = Math.floor(elapsed * FPS) % durationInFrames;
      setFrame(f);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, durationInFrames, restingFrame]);

  return (
    <div className="absolute inset-0 [&_*]:pointer-events-none">
      <Thumbnail
        component={isCode ? CodeStyleVideo : SubtitleVideo}
        durationInFrames={durationInFrames}
        fps={FPS}
        compositionWidth={W}
        compositionHeight={H}
        frameToDisplay={frame}
        style={{width: "100%", height: "100%"}}
        inputProps={inputProps}
      />
    </div>
  );
}
