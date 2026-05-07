export const builtInSubtitleStyleIds = [
  "viral-tiktok",
  "clean-minimal",
  "hook-style",
  "neon-pulse",
  "kinetic-bold",
  "typewriter",
  "karaoke-bar",
  "comic-pop",
  "glass-card",
  "retro-wave",
  "news-lower",
  "luxury-serif",
  "outlined-impact",
  "gradient-glow",
  "vertical-stack",
  "caption-bubble",
  "cyber-scan",
  "soft-shadow",
  "sticker-cutout",
  "cinematic",
  "split-color",
  "minimal-caps",
  "fire-flash",
] as const;

export type SubtitleStyleId = (typeof builtInSubtitleStyleIds)[number];

export type VideoBackground = "black" | "transparent";
export type VideoFormatId =
  | "portrait"
  | "landscape"
  | "square"
  | "story"
  | "youtube"
  | "reel"
  | "cinema"
  | "wide";

export type WordTiming = {
  word: string;
  start: number;
  end: number;
};

export type TypographyOverrides = {
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  textTransform?: "uppercase" | "lowercase" | "capitalize" | "none";
  letterSpacing?: number;
  lineHeight?: number;
  color?: string;
  accent?: string;
  singleLine?: boolean;
  maxWidthPercent?: number;
  textAlign?: "left" | "center" | "right";
};

export type SubtitleAnimation =
  | "none"
  | "pop"
  | "slide"
  | "fade"
  | "type"
  | "scan"
  | "flash"
  | "wave"
  | "float";

export type SubtitleBehaviorOverrides = {
  animation?: SubtitleAnimation;
  wordMode?: boolean;
  bottom?: boolean;
  background?: string;
  boxShadow?: string;
  textShadow?: string;
  stroke?: string;
  padding?: string;
  radius?: number;
};

export type CustomSubtitleStyleConfig = {
  baseStyle: SubtitleStyleId;
  typography: TypographyOverrides;
  behavior?: SubtitleBehaviorOverrides;
};

export type SubtitleItem = {
  id: string;
  text: string;
  words: string[];
  duration: number;
  start: number;
  end: number;
  x: number;
  y: number;
  wordTimings: WordTiming[];
  overrides?: TypographyOverrides;
};

export type SubtitleChunk = SubtitleItem;

export type Timeline = {
  chunks: SubtitleItem[];
  duration: number;
};

export type SubtitleVideoProps = {
  text: string;
  style: SubtitleStyleId;
  customStyle?: CustomSubtitleStyleConfig;
  background?: VideoBackground;
  subtitles?: SubtitleItem[];
  width?: number;
  height?: number;
  typography?: TypographyOverrides;
};

export type SubtitleStyle = {
  id: SubtitleStyleId;
  name: string;
  description: string;
  accent: string;
  previewClass: string;
};

export type VideoFormat = {
  id: VideoFormatId;
  name: string;
  label: string;
  width: number;
  height: number;
};

const WORD_DURATION_SECONDS = 0.5;
const MIN_CHUNK_DURATION_SECONDS = 1.2;
const sentenceBoundary = /(?<=[.!?])\s+/g;

export const sampleScript = `Making money is hard.
But staying broke is harder.
Discipline today.
Freedom tomorrow.
You choose.`;

export const videoFormats: VideoFormat[] = [
  {id: "portrait", name: "Portrait", label: "1080x1920", width: 1080, height: 1920},
  {id: "landscape", name: "Landscape", label: "1920x1080", width: 1920, height: 1080},
  {id: "square", name: "Square", label: "1080x1080", width: 1080, height: 1080},
  {id: "story", name: "Story", label: "720x1280", width: 720, height: 1280},
  {id: "youtube", name: "YouTube", label: "1280x720", width: 1280, height: 720},
  {id: "reel", name: "Reel HD", label: "1440x2560", width: 1440, height: 2560},
  {id: "cinema", name: "Cinema", label: "2048x858", width: 2048, height: 858},
  {id: "wide", name: "Wide", label: "2560x1080", width: 2560, height: 1080}
];

export const subtitleStyles: SubtitleStyle[] = [
  {id: "viral-tiktok", name: "Viral TikTok", description: "Word highlight, bounce and yellow impact", accent: "#ffe600", previewClass: "font-black uppercase text-white"},
  {id: "clean-minimal", name: "Clean Minimal", description: "Bottom box, quiet white captions", accent: "#ffffff", previewClass: "rounded bg-black/60 px-3 py-2 text-white"},
  {id: "hook-style", name: "Hook Style", description: "Huge centered punch line with hard pop", accent: "#ffe600", previewClass: "font-black uppercase text-white"},
  {id: "neon-pulse", name: "Neon Pulse", description: "Electric cyan glow and pulse entry", accent: "#22d3ee", previewClass: "font-black uppercase text-cyan-200"},
  {id: "kinetic-bold", name: "Kinetic Bold", description: "Fast sliding words with heavy contrast", accent: "#fb7185", previewClass: "font-black uppercase text-rose-300"},
  {id: "typewriter", name: "Typewriter", description: "Monospace reveal with caret feel", accent: "#34d399", previewClass: "font-mono text-emerald-200"},
  {id: "karaoke-bar", name: "Karaoke Bar", description: "Active word sits on a colored strip", accent: "#f59e0b", previewClass: "font-black text-amber-200"},
  {id: "comic-pop", name: "Comic Pop", description: "Playful bubble caption with punchy shadow", accent: "#f472b6", previewClass: "font-black uppercase text-pink-200"},
  {id: "glass-card", name: "Glass Card", description: "Frosted panel with soft modern text", accent: "#a78bfa", previewClass: "rounded bg-white/20 px-3 py-2 text-white"},
  {id: "retro-wave", name: "Retro Wave", description: "Pink and cyan 80s glow", accent: "#e879f9", previewClass: "font-black uppercase text-fuchsia-200"},
  {id: "news-lower", name: "News Lower", description: "Broadcast lower-third caption band", accent: "#ef4444", previewClass: "font-black uppercase text-white"},
  {id: "luxury-serif", name: "Luxury Serif", description: "Elegant serif editorial subtitles", accent: "#f5d08a", previewClass: "font-serif text-yellow-100"},
  {id: "outlined-impact", name: "Outlined Impact", description: "White outline-only kinetic headline", accent: "#ffffff", previewClass: "font-black uppercase text-white"},
  {id: "gradient-glow", name: "Gradient Glow", description: "Colorful gradient fill and bloom", accent: "#60a5fa", previewClass: "font-black uppercase text-blue-200"},
  {id: "vertical-stack", name: "Vertical Stack", description: "Tall stacked words for reels hooks", accent: "#bef264", previewClass: "font-black uppercase text-lime-200"},
  {id: "caption-bubble", name: "Caption Bubble", description: "Rounded speech bubble with friendly text", accent: "#38bdf8", previewClass: "rounded-full bg-white px-3 py-2 text-black"},
  {id: "cyber-scan", name: "Cyber Scan", description: "Tech scanline entry and mono caps", accent: "#2dd4bf", previewClass: "font-mono uppercase text-teal-200"},
  {id: "soft-shadow", name: "Soft Shadow", description: "Readable soft subtitle with calm fade", accent: "#c4b5fd", previewClass: "font-bold text-violet-100"},
  {id: "sticker-cutout", name: "Sticker Cutout", description: "White sticker letters with black edge", accent: "#fb923c", previewClass: "font-black uppercase text-orange-200"},
  {id: "cinematic", name: "Cinematic", description: "Letterbox style with refined motion", accent: "#e5e7eb", previewClass: "font-serif uppercase text-slate-100"},
  {id: "split-color", name: "Split Color", description: "Alternating word colors and snap motion", accent: "#4ade80", previewClass: "font-black uppercase text-green-200"},
  {id: "minimal-caps", name: "Minimal Caps", description: "Tiny uppercase captions with wide spacing", accent: "#94a3b8", previewClass: "font-bold uppercase text-slate-200"},
  {id: "fire-flash", name: "Fire Flash", description: "Hot red flash with aggressive entry", accent: "#f97316", previewClass: "font-black uppercase text-orange-200"}
];

export function isBuiltInSubtitleStyleId(value: unknown): value is SubtitleStyleId {
  return (
    typeof value === "string" &&
    builtInSubtitleStyleIds.includes(value as SubtitleStyleId)
  );
}

export function splitTextIntoChunks(text: string): string[] {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const source = normalized.length > 1 ? normalized : text.split(sentenceBoundary);

  return source.flatMap((chunk) => chunk.split(sentenceBoundary)).map((chunk) => chunk.trim()).filter(Boolean);
}

export function getWords(chunk: string): string[] {
  return chunk.match(/\S+/g) ?? [];
}

export function getChunkDuration(chunk: string): number {
  return Math.max(MIN_CHUNK_DURATION_SECONDS, getWords(chunk).length * WORD_DURATION_SECONDS);
}

export function getWordTimings(chunk: string, duration = getChunkDuration(chunk)): WordTiming[] {
  const words = getWords(chunk);
  const wordDuration = words.length > 0 ? duration / words.length : duration;

  return words.map((word, index) => ({
    word,
    start: Number((index * wordDuration).toFixed(3)),
    end: Number(((index + 1) * wordDuration).toFixed(3))
  }));
}

export function normalizeSubtitleItem(item: Partial<SubtitleItem>, index: number): SubtitleItem {
  const text = item.text?.trim() || "New subtitle";
  const start = Math.max(0, Number(item.start ?? 0));
  const duration = Math.max(0.25, Number(item.duration ?? ((item.end ?? start + getChunkDuration(text)) - start)));
  const end = Math.max(start + 0.25, Number(item.end ?? start + duration));
  const cleanDuration = Number((end - start).toFixed(3));

  return {
    id: item.id || `subtitle-${index}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    words: getWords(text),
    start: Number(start.toFixed(3)),
    end: Number(end.toFixed(3)),
    duration: cleanDuration,
    x: clamp(Number(item.x ?? 50), 0, 100),
    y: clamp(Number(item.y ?? 52), 0, 100),
    wordTimings: getWordTimings(text, cleanDuration),
    overrides: item.overrides
  };
}

export function generateTimeline(chunks: string[]): Timeline {
  let cursor = 0;
  const timedChunks = chunks.map((chunk, index) => {
    const duration = getChunkDuration(chunk);
    const item = normalizeSubtitleItem(
      {id: `chunk-${index}`, text: chunk, start: cursor, end: cursor + duration},
      index
    );
    cursor = item.end;
    return item;
  });

  return normalizeTimeline(timedChunks);
}

export function normalizeTimeline(subtitles: Partial<SubtitleItem>[]): Timeline {
  const chunks = subtitles
    .map((subtitle, index) => normalizeSubtitleItem(subtitle, index))
    .sort((a, b) => a.start - b.start);
  const duration = chunks.reduce((max, chunk) => Math.max(max, chunk.end), 0);

  return {
    chunks,
    duration: Number(duration.toFixed(3))
  };
}

export function createTimelineFromText(text: string): Timeline {
  return generateTimeline(splitTextIntoChunks(text));
}

export function createTimelineFromSubtitles(subtitles: Partial<SubtitleItem>[] | undefined, fallbackText: string): Timeline {
  if (subtitles?.length) {
    return normalizeTimeline(subtitles);
  }

  return createTimelineFromText(fallbackText);
}

export function getTimelineDurationInFrames(text: string, fps: number, subtitles?: SubtitleItem[]): number {
  const timeline = createTimelineFromSubtitles(subtitles, text);
  return Math.max(1, Math.ceil(timeline.duration * fps));
}

export function secondsToFrames(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

export function parseSubtitleFile(content: string): SubtitleItem[] {
  const blocks = content
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  const parsed = blocks.flatMap((block, index) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const timeLineIndex = lines.findIndex((line) => line.includes("-->"));
    if (timeLineIndex === -1) {
      return [];
    }

    const [startRaw, endRaw] = lines[timeLineIndex].split("-->").map((value) => value.trim());
    const start = parseTimestamp(startRaw);
    const end = parseTimestamp(endRaw);
    const text = lines.slice(timeLineIndex + 1).join(" ").trim();

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !text) {
      return [];
    }

    return normalizeSubtitleItem({id: `import-${index}`, text, start, end}, index);
  });

  return parsed;
}

export function serializeSubtitlesToText(subtitles: SubtitleItem[]): string {
  return subtitles.map((subtitle) => subtitle.text).join("\n");
}

function parseTimestamp(value: string): number {
  const clean = value.replace(",", ".").split(/\s+/)[0];
  const parts = clean.split(":").map(Number);

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return Number(clean);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
