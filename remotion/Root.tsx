"use client";

import {Composition} from "remotion";
import {SubtitleVideo} from "./SubtitleVideo";
import {CodeStyleVideo} from "./CodeStyleVideo";
import {
  getTimelineDurationInFrames,
  sampleScript,
  type SubtitleVideoProps
} from "../lib/subtitles";

const fps = 30;
const defaultProps: SubtitleVideoProps = {
  text: sampleScript,
  style: "viral-tiktok",
  background: "black"
};

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="SubtitleVideo"
        component={SubtitleVideo}
        fps={fps}
        width={1080}
        height={1920}
        durationInFrames={getTimelineDurationInFrames(defaultProps.text, fps)}
        defaultProps={defaultProps}
        calculateMetadata={({props}) => {
          const typedProps = props as SubtitleVideoProps;

          return {
            durationInFrames: getTimelineDurationInFrames(typedProps.text, fps, typedProps.subtitles),
            width: typedProps.width ?? 1080,
            height: typedProps.height ?? 1920
          };
        }}
      />
      <Composition
        id="CodeStyleVideo"
        component={CodeStyleVideo}
        fps={fps}
        width={1080}
        height={1920}
        durationInFrames={getTimelineDurationInFrames(sampleScript, fps)}
        defaultProps={{text: sampleScript, background: "black" as const}}
        calculateMetadata={({props}) => {
          const typed = props as SubtitleVideoProps;
          return {
            durationInFrames: getTimelineDurationInFrames(typed.text ?? sampleScript, fps, typed.subtitles),
            width: typed.width ?? 1080,
            height: typed.height ?? 1920
          };
        }}
      />
    </>
  );
}
