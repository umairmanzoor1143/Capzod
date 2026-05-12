"use client";

import * as React from "react";
import {Thumbnail} from "@remotion/player";
import {SubtitleVideo} from "@/remotion/SubtitleVideo";
import {
  createTimelineFromText,
  getTimelineDurationInFrames,
  sampleScript,
  type SubtitleStyleId,
} from "@/lib/subtitles";

const FPS = 30;
const W = 640;
const H = 400;

/**
 * Real Remotion frame of {@link SubtitleVideo} for built-in caption presets.
 */
export function BuiltinStyleThumbnail({styleId}: {styleId: SubtitleStyleId}) {
  const subtitles = React.useMemo(() => createTimelineFromText(sampleScript).chunks, []);
  const durationInFrames = React.useMemo(
    () => Math.max(getTimelineDurationInFrames(sampleScript, FPS, subtitles), FPS * 4),
    [subtitles]
  );
  const frame = React.useMemo(
    () => Math.min(Math.floor(FPS * 2.2), Math.max(0, durationInFrames - 1)),
    [durationInFrames]
  );

  return (
    <div className="absolute inset-0 overflow-hidden rounded-sm bg-[#020203] [&_*]:pointer-events-none">
      <Thumbnail
        component={SubtitleVideo}
        durationInFrames={durationInFrames}
        fps={FPS}
        compositionWidth={W}
        compositionHeight={H}
        frameToDisplay={frame}
        style={{width: "100%", height: "100%"}}
        inputProps={{
          subtitles,
          style: styleId,
          background: "black",
          text: sampleScript,
          width: W,
          height: H,
        }}
      />
    </div>
  );
}
