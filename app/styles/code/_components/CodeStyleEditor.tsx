"use client";

import * as React from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {Player, type PlayerRef} from "@remotion/player";
import Editor from "react-simple-code-editor";
import {highlight, languages} from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-tsx";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Code2,
  Loader2,
  LockKeyhole,
  Maximize2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Send,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import {AppSidebar} from "@/components/layout/AppSidebar";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {ScrollArea} from "@/components/ui/scroll-area";
import {sampleScript} from "@/lib/subtitles";
import {compileStyleCode} from "@/lib/compile-style-code";
import {CodeStyleVideo, type CodeStyleComponent} from "@/remotion/CodeStyleVideo";
import {useAuth} from "@/components/auth/AuthProvider";
import {apiCreateStyle, apiUpdateStyle} from "@/lib/api";
import type {CommunitySubtitleStyle} from "@/lib/community-styles";
import {cn} from "@/lib/utils";

const STORAGE_KEY = "speakzy:code-style:draft";
const META_STORAGE_KEY = "speakzy:code-style:meta";

const STARTER_CODE = `// Receives { chunk, activeWordIndex, words, frame, fps, localFrame, styleProps }
// Use styleProps.typography for font settings from the studio (merged with your style).
// Use React + Remotion (interpolate, spring, useCurrentFrame, AbsoluteFill).

function MyCaption({ chunk, activeWordIndex, words, localFrame, fps, styleProps }) {
  const typo = styleProps?.typography || {};
  const enter = spring({
    frame: localFrame,
    fps,
    config: { damping: 200, stiffness: 100 },
  });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 120 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 18, maxWidth: "90vw" }}>
        {words.map((word, i) => {
          const active = i === activeWordIndex;
          const scale = active ? 1.15 : 1;
          const color = active ? (typo.accent || "#A855F7") : (typo.color || "#FFFFFF");
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                transform: \`scale(\${scale})\`,
                opacity: enter,
                color,
                fontFamily: typo.fontFamily || "Inter, system-ui, sans-serif",
                fontWeight: typo.fontWeight != null ? typo.fontWeight : 800,
                fontSize: typo.fontSize != null ? typo.fontSize : 140,
                letterSpacing:
                  typo.letterSpacing != null ? typo.letterSpacing : "-0.02em",
                textTransform: typo.textTransform || "none",
                transition: "transform 0.15s ease, color 0.15s ease",
                textShadow: active
                  ? "0 0 24px #A855F780, 0 0 8px #A855F740"
                  : "0 0 0 transparent",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

return MyCaption;
`;

type FormatId = "landscape" | "portrait" | "square";
const FORMATS: Record<FormatId, {label: string; w: number; h: number}> = {
  landscape: {label: "Landscape (16:9)", w: 1280, h: 720},
  portrait: {label: "Portrait (9:16)", w: 720, h: 1280},
  square: {label: "Square (1:1)", w: 720, h: 720},
};

type Metadata = {
  name: string;
  slug: string;
  category: string;
  description: string;
  tags: string[];
};

const DEFAULT_META: Metadata = {
  name: "My Custom Style",
  slug: "my-custom-style",
  category: "Kinetic",
  description: "A clean kinetic style with word highlight and scale animation.",
  tags: ["kinetic", "highlight", "clean"],
};

const CATEGORIES = ["Kinetic", "Minimal", "Bold", "Cinematic", "Neon", "Retro"];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds || 0);
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export type CodeStyleEditorProps = {
  mode: "new" | "edit";
  initialStyle?: CommunitySubtitleStyle | null;
};

export function CodeStyleEditor({mode, initialStyle}: CodeStyleEditorProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [code, setCode] = React.useState(
    isEdit && initialStyle?.code ? initialStyle.code : STARTER_CODE
  );
  const [Component, setComponent] = React.useState<CodeStyleComponent | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [format, setFormat] = React.useState<FormatId>("landscape");
  const [transparent, setTransparent] = React.useState(false);
  const [meta, setMeta] = React.useState<Metadata>(() => {
    if (isEdit && initialStyle) {
      return {
        ...DEFAULT_META,
        name: initialStyle.name,
        slug: slugify(initialStyle.name),
        description: initialStyle.description,
      };
    }
    return DEFAULT_META;
  });
  const [tagDraft, setTagDraft] = React.useState("");
  const [draftSaved, setDraftSaved] = React.useState<number | null>(null);

  const playerRef = React.useRef<PlayerRef>(null);
  const [playing, setPlaying] = React.useState(false);
  const [frame, setFrame] = React.useState(0);
  const TOTAL_FRAMES = 300;
  const FPS = 30;

  const {user, loading: authLoading} = useAuth();
  const [publishing, setPublishing] = React.useState(false);
  const [publishError, setPublishError] = React.useState<string | null>(null);
  const [publishedStyle, setPublishedStyle] = React.useState<CommunitySubtitleStyle | null>(
    isEdit ? (initialStyle ?? null) : null
  );

  // Snapshot for dirty tracking
  const initialSnapshot = React.useRef<{code: string; name: string; description: string} | null>(
    null
  );
  if (initialSnapshot.current === null) {
    initialSnapshot.current = {
      code: isEdit && initialStyle?.code ? initialStyle.code : STARTER_CODE,
      name: isEdit && initialStyle ? initialStyle.name : DEFAULT_META.name,
      description: isEdit && initialStyle ? initialStyle.description : DEFAULT_META.description,
    };
  }

  const dirty =
    code !== initialSnapshot.current.code ||
    meta.name !== initialSnapshot.current.name ||
    meta.description !== initialSnapshot.current.description;

  // Hydrate localStorage draft (only in NEW mode)
  React.useEffect(() => {
    if (isEdit) return;
    try {
      const c = window.localStorage.getItem(STORAGE_KEY);
      if (c && c.trim()) {
        setCode(c);
        if (initialSnapshot.current) initialSnapshot.current.code = c;
      }
      const m = window.localStorage.getItem(META_STORAGE_KEY);
      if (m) {
        const parsed = JSON.parse(m);
        setMeta((current) => ({...current, ...parsed}));
        if (initialSnapshot.current) {
          initialSnapshot.current.name = parsed.name ?? initialSnapshot.current.name;
          initialSnapshot.current.description =
            parsed.description ?? initialSnapshot.current.description;
        }
      }
    } catch {
      // ignore
    }
  }, [isEdit]);

  // Auth is provided by AuthProvider context

  // Compile + persist code
  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      const result = compileStyleCode(code);
      if (result.ok) {
        setComponent(() => result.Component);
        setError(null);
      } else {
        setError(result.error);
      }
      if (!isEdit) {
        try {
          window.localStorage.setItem(STORAGE_KEY, code);
        } catch {
          // ignore
        }
      }
    }, 350);
    return () => window.clearTimeout(handle);
  }, [code, isEdit]);

  React.useEffect(() => {
    if (isEdit) return;
    try {
      window.localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
    } catch {
      // ignore
    }
  }, [meta, isEdit]);

  const initialized = React.useRef(false);
  if (!initialized.current) {
    initialized.current = true;
    const initial = compileStyleCode(code);
    if (initial.ok) queueMicrotask(() => setComponent(() => initial.Component));
  }

  // Player events — re-attach when the Player instance is recreated (key change)
  React.useEffect(() => {
    let cancelled = false;
    let player: PlayerRef | null = null;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onFrameUpdate = (e: {detail: {frame: number}}) => setFrame(e.detail.frame);

    const attach = () => {
      if (cancelled) return;
      const current = playerRef.current;
      if (!current) {
        requestAnimationFrame(attach);
        return;
      }
      player = current;
      player.addEventListener("play", onPlay);
      player.addEventListener("pause", onPause);
      player.addEventListener("frameupdate", onFrameUpdate);
      setPlaying(player.isPlaying());
      setFrame(player.getCurrentFrame());
    };
    attach();

    return () => {
      cancelled = true;
      if (player) {
        player.removeEventListener("play", onPlay);
        player.removeEventListener("pause", onPause);
        player.removeEventListener("frameupdate", onFrameUpdate);
      }
    };
  }, [format, transparent, Component]);

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pause();
    else p.play();
  };
  const seekRel = (delta: number) => {
    const p = playerRef.current;
    if (!p) return;
    const next = Math.max(0, Math.min(TOTAL_FRAMES - 1, frame + delta));
    p.seekTo(next);
    setFrame(next);
  };
  const seekAbs = (next: number) => {
    const p = playerRef.current;
    if (!p) return;
    p.seekTo(next);
    setFrame(next);
  };
  const requestFullscreen = () => {
    try {
      playerRef.current?.requestFullscreen();
    } catch {
      // ignore
    }
  };

  const addTag = () => {
    const t = tagDraft.trim().toLowerCase();
    if (!t || meta.tags.includes(t) || meta.tags.length >= 8) {
      setTagDraft("");
      return;
    }
    setMeta((m) => ({...m, tags: [...m.tags, t]}));
    setTagDraft("");
  };
  const removeTag = (t: string) =>
    setMeta((m) => ({...m, tags: m.tags.filter((x) => x !== t)}));

  const handleSaveDraft = () => {
    if (isEdit) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
      window.localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
      setDraftSaved(Date.now());
      window.setTimeout(() => setDraftSaved(null), 1800);
    } catch {
      // ignore
    }
  };

  const handleResetCode = () => {
    const nextCode = isEdit && initialStyle?.code ? initialStyle.code : STARTER_CODE;
    setCode(nextCode);
    setError(null);
    setPublishError(null);
    if (!isEdit) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  };

  async function handlePublish() {
    if (!user) return;
    const result = compileStyleCode(code);
    if (!result.ok) {
      setPublishError("Fix compile errors before publishing: " + result.error);
      return;
    }

    setPublishing(true);
    setPublishError(null);

    const uniqueSlug = `${slugify(meta.name) || "style"}-${Date.now().toString(36)}`;
    setMeta((m) => ({...m, slug: uniqueSlug}));

    try {
      if (isEdit && initialStyle) {
        const style = await apiUpdateStyle(initialStyle.id, {
          name: meta.name,
          description: meta.description,
          baseStyle: "clean-minimal",
          typography: {},
          behavior: {},
          kind: "code",
          code,
        });
        setPublishedStyle(style);
        // Reset snapshot to current values so publish becomes disabled until next edit
        initialSnapshot.current = {
          code,
          name: meta.name,
          description: meta.description,
        };
      } else {
        const style = await apiCreateStyle({
          name: meta.name,
          description: meta.description,
          baseStyle: "clean-minimal",
          typography: {},
          behavior: {},
          kind: "code",
          code,
        });
        setPublishedStyle(style);
        // Clear local draft after first successful publish, then route into edit mode
        try {
          window.localStorage.removeItem(STORAGE_KEY);
          window.localStorage.removeItem(META_STORAGE_KEY);
        } catch {
          // ignore
        }
        router.replace(`/styles/code/${style.id}`);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err && "message" in err && typeof (err as {message: unknown}).message === "string"
            ? (err as {message: string}).message
            : "Unable to publish style";
      console.error("publish error", err);
      setPublishError(message);
    } finally {
      setPublishing(false);
    }
  }

  const fmt = FORMATS[format];
  const currentSecond = frame / FPS;
  const totalSecond = TOTAL_FRAMES / FPS;
  const publishDisabled =
    publishing || Boolean(error) || !user || (isEdit && !dirty);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/35 text-slate-800">
      <AppSidebar />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
        {/* Header */}
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 sm:px-5 lg:h-14 lg:flex-nowrap lg:py-0">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Link
              href="/styles/code"
              className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">My Styles</span>
            </Link>
            <div className="hidden text-slate-300 sm:block">·</div>
            <div className="flex min-w-0 items-center gap-2 text-slate-700">
              <Code2 className="size-4 shrink-0 text-indigo-600" />
              <span className="truncate text-[14px] font-semibold sm:text-[15px]">
                {isEdit ? `Editing: ${meta.name}` : "New Style"}
              </span>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
            <Button variant="outline" size="sm" onClick={requestFullscreen} className="h-8 text-xs sm:h-9">
              <Maximize2 className="size-3.5" />
              <span className="hidden sm:inline">Preview Fullscreen</span>
            </Button>
            {!isEdit && (
              <Button variant="outline" size="sm" onClick={handleSaveDraft} className="h-8 text-xs sm:h-9">
                <Save className="size-3.5" />
                <span className="hidden sm:inline">{draftSaved ? "Saved" : "Save Draft"}</span>
              </Button>
            )}
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={publishDisabled}
              className="h-8 bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-xs text-white hover:from-indigo-700 hover:to-fuchsia-700 disabled:opacity-50 sm:h-9 sm:text-sm"
            >
              {publishing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              <span className="hidden sm:inline">{isEdit ? (dirty ? "Resubmit" : "No changes") : "Publish Style"}</span>
              <span className="sm:hidden">{isEdit ? (dirty ? "Submit" : "OK") : "Publish"}</span>
            </Button>
          </div>
        </header>

        {/* Body: mobile = preview → code (equal flex share, min heights) → metadata; lg = grid code | preview | meta */}
        <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto p-2 sm:gap-3 sm:p-3 lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_300px] lg:gap-3 lg:overflow-hidden">
          {/* CENTER on desktop, FIRST on mobile — Live preview */}
          <section className="flex min-h-0 shrink-0 flex-col gap-2 overflow-hidden max-lg:basis-[calc((100%-0.5rem)/2)] sm:max-lg:basis-[calc((100%-0.75rem)/2)] lg:col-start-2 lg:row-start-1 lg:h-auto lg:max-h-none lg:min-h-0 lg:shrink lg:flex-1">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-100 px-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  Live Preview
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                    Auto-updates
                  </span>
                </div>
              </div>

              <div
                className="relative min-h-0 flex-1 w-full"
                style={{
                  backgroundColor: "#ffffff",
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.08) 0.8px, transparent 0)",
                  backgroundSize: "16px 16px",
                  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                }}
              >
                <div className="absolute inset-2 overflow-hidden rounded-md border border-slate-200/80 shadow-inner sm:inset-3">
                  <Player
                    ref={playerRef}
                    key={`${format}-${transparent}-${Component ? "ok" : "fb"}`}
                    component={CodeStyleVideo}
                    durationInFrames={TOTAL_FRAMES}
                    fps={FPS}
                    compositionWidth={fmt.w}
                    compositionHeight={fmt.h}
                    style={{position: "absolute", inset: 0, width: "100%", height: "100%"}}
                    inputProps={{
                      text: sampleScript,
                      background: transparent ? "transparent" : "black",
                      Component: Component ?? undefined,
                    }}
                    loop
                    acknowledgeRemotionLicense
                  />
                </div>
              </div>

              <div className="grid shrink-0 grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 border-t border-slate-100 px-3 py-1.5 sm:flex sm:flex-wrap sm:gap-3 sm:px-4 sm:py-2">
                <span className="w-auto min-w-[70px] font-mono text-[10px] text-slate-500 tabular-nums sm:min-w-[88px] sm:text-[11px]">
                  {formatTime(currentSecond)} / {formatTime(totalSecond)}
                </span>
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <IconBtn onClick={() => seekRel(-30)}>
                    <SkipBack className="size-3.5" />
                  </IconBtn>
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="flex size-9 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
                  >
                    {playing ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
                  </button>
                  <IconBtn onClick={() => seekRel(30)}>
                    <SkipForward className="size-3.5" />
                  </IconBtn>
                </div>
                <input
                  type="range"
                  min={0}
                  max={TOTAL_FRAMES - 1}
                  value={frame}
                  onChange={(e) => seekAbs(Number(e.target.value))}
                  className="min-w-0 flex-1 accent-indigo-600"
                />
                <div className="col-span-3 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(8rem,auto)] items-center gap-2 sm:flex sm:flex-1 sm:flex-nowrap sm:justify-end">
                  <div className="flex min-h-[32px] min-w-0 flex-1 items-stretch overflow-hidden rounded-md border border-slate-200 text-[10px] font-semibold sm:max-w-[200px] sm:flex-none">
                    <button
                      type="button"
                      onClick={() => setTransparent(false)}
                      className={cn(
                        "min-w-0 flex-1 px-2 py-1.5 transition-colors sm:py-1",
                        !transparent
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      Black
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransparent(true)}
                      className={cn(
                        "min-w-0 flex-1 border-l border-slate-200 px-2 py-1.5 transition-colors sm:py-1",
                        transparent
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      <span className="sm:hidden">Trans</span>
                      <span className="hidden sm:inline">Transparent</span>
                    </button>
                  </div>
                  <Selectish
                    value={fmt.label}
                    options={Object.values(FORMATS).map((f) => f.label)}
                    onChange={(v) => {
                      const id = (Object.keys(FORMATS) as FormatId[]).find(
                        (k) => FORMATS[k].label === v
                      );
                      if (id) setFormat(id);
                    }}
                    compact
                  />
                </div>
              </div>
            </div>
          </section>

          {/* LEFT on desktop, SECOND on mobile — Style component */}
          <section className="flex min-h-0 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm max-lg:basis-[calc((100%-0.5rem)/2)] sm:max-lg:basis-[calc((100%-0.75rem)/2)] lg:col-start-1 lg:row-start-1 lg:h-auto lg:max-h-none lg:min-h-0 lg:shrink lg:flex-1">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-100 px-4">
              <h2 className="text-sm font-semibold text-slate-800">Style Component</h2>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleResetCode}
                  className="inline-flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Reset code"
                  title="Reset code"
                >
                  <RotateCcw className="size-3.5" />
                </button>
                <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  TSX
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-[#1e1e2e]">
              <Editor
                value={code}
                onValueChange={setCode}
                highlight={(c) => highlight(c, languages.tsx, "tsx")}
                padding={16}
                textareaId="style-code-editor"
                textareaClassName="speakzy-code-textarea"
                preClassName="speakzy-code-pre"
                style={{
                  fontFamily:
                    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                  fontSize: 13,
                  lineHeight: 1.6,
                  minHeight: "100%",
                  color: "#cdd6f4",
                  caretColor: "#a78bfa",
                }}
              />
            </div>

            <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-500 sm:h-9 sm:flex-nowrap sm:px-4">
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const r = compileStyleCode(code);
                    if (r.ok) setError(null);
                    else setError(r.error);
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 hover:text-slate-700"
                >
                  <AlertCircle className="size-3.5" />
                  <span className="hidden sm:inline">Check for errors</span>
                </button>
                <span className="flex items-center gap-1.5">
                  {error ? (
                    <>
                      <span className="size-1.5 rounded-full bg-rose-500" />
                      <span className="font-medium text-rose-600">Compile error</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                      <span className="font-medium text-emerald-700">No errors found</span>
                    </>
                  )}
                </span>
              </div>
              <div className="hidden shrink-0 items-center gap-3 sm:flex">
                <span>Spaces: 2</span>
                <span>TypeScript React</span>
              </div>
            </div>
            {error && (
              <div className="max-h-32 shrink-0 border-t border-rose-100 bg-rose-50 px-4 py-2 font-mono text-[11.5px] text-rose-700">
                <ScrollArea className="max-h-28">
                  <pre className="whitespace-pre-wrap break-words pr-3">{error}</pre>
                </ScrollArea>
              </div>
            )}
          </section>
          {/* RIGHT: Metadata — last on mobile, scrolls in remaining space */}
          <aside className="flex min-h-0 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm max-lg:h-[min(42dvh,360px)] lg:col-start-3 lg:row-start-1 lg:max-h-none lg:min-h-0 lg:shrink lg:flex-1">
            <div className="h-11 px-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-semibold text-slate-800">
                {isEdit ? "Editing" : "Metadata"}
              </h3>
              <Badge>
                {publishedStyle
                  ? publishedStyle.status === "approved"
                    ? "Live"
                    : publishedStyle.status === "rejected"
                      ? "Rejected"
                      : "Pending"
                  : "Draft"}
              </Badge>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-4 text-[12.5px]">
                <Field label="Name">
                  <Input
                    value={meta.name}
                    onChange={(e) =>
                      setMeta((m) => ({...m, name: e.target.value, slug: slugify(e.target.value)}))
                    }
                  />
                </Field>
                <Field label="Slug">
                  <Input
                    value={meta.slug}
                    onChange={(e) => setMeta((m) => ({...m, slug: slugify(e.target.value)}))}
                  />
                  <span className="text-[10px] text-slate-400">
                    A unique suffix is appended on every publish.
                  </span>
                </Field>
                <Field label="Category">
                  <Selectish
                    value={meta.category}
                    options={CATEGORIES}
                    onChange={(v) => setMeta((m) => ({...m, category: v}))}
                  />
                </Field>
                <Field label="Description">
                  <textarea
                    rows={4}
                    value={meta.description}
                    onChange={(e) => setMeta((m) => ({...m, description: e.target.value}))}
                    className="w-full rounded-md border border-slate-200 bg-white p-2 text-[12.5px] text-slate-800 outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                  />
                </Field>
                <Field label="Tags">
                  <TagsInput
                    tags={meta.tags}
                    draft={tagDraft}
                    onDraftChange={setTagDraft}
                    onAdd={addTag}
                    onRemove={removeTag}
                  />
                </Field>

                {!authLoading && !user && (
                  <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-center">
                    <LockKeyhole className="size-4 mx-auto text-slate-400" />
                    <p className="text-[11px] text-slate-500 mt-1">Sign in to publish</p>
                    <Button asChild size="sm" className="mt-2 h-7 text-[11px]">
                      <Link href="/auth?redirectTo=/styles/code">Sign in</Link>
                    </Button>
                  </div>
                )}

                {publishError && (
                  <p className="rounded-md border border-rose-100 bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-700">
                    {publishError}
                  </p>
                )}
                {publishedStyle && !dirty && (
                  <div className="rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-700">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="size-3.5" />
                      {isEdit ? "Saved — awaiting approval" : "Published for approval"}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </aside>
        </div>
      </main>
    </div>
  );
}

/* ---------- small components ---------- */

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Selectish({
  value,
  options,
  onChange,
  compact,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const buttonId = React.useId();

  const normalized = options.map((option) => {
    const format = Object.values(FORMATS).find((item) => item.label === option);
    return {
      label: format ? format.label.replace(/\s+\(.+\)$/, "") : option,
      value: option,
      meta: format ? `${format.w}x${format.h}` : undefined,
    };
  });
  const selected = normalized.find((option) => option.value === value) ?? normalized[0];

  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        id={buttonId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full min-w-0 items-center justify-between gap-2 border bg-white text-left text-slate-800 shadow-sm outline-none transition-[border,box-shadow,background,color] hover:border-indigo-200 focus-visible:ring-2 focus-visible:ring-indigo-200",
          compact
            ? "h-8 rounded-full border-indigo-200 bg-indigo-50/80 px-3 text-[12px] font-semibold text-indigo-700"
            : "h-10 rounded-md border-slate-200 px-3 text-[12.5px]"
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{selected?.label ?? value}</span>
          {compact && selected?.meta && (
            <span className="hidden text-[10px] font-medium text-slate-400 min-[390px]:inline">
              {selected.meta}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-indigo-500 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-[0_18px_48px_-20px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/[0.03]",
            compact ? "bottom-[calc(100%+0.5rem)] right-0 w-56" : "left-0 top-[calc(100%+0.35rem)] w-full min-w-56"
          )}
        >
          {compact && (
            <div className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Canvas Size
            </div>
          )}
          <div role="listbox" aria-labelledby={buttonId} className="max-h-64 overflow-auto py-1">
            {normalized.map((option) => {
              const active = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] transition-colors",
                    active ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded-full border",
                      active ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white"
                    )}
                  >
                    {active && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
                  {option.meta && (
                    <span className="shrink-0 text-[10px] font-medium text-slate-400">
                      {option.meta}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TagsInput({
  tags,
  draft,
  onDraftChange,
  onAdd,
  onRemove,
}: {
  tags: string[];
  draft: string;
  onDraftChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (t: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 text-[11px]"
        >
          {t}
          <button
            type="button"
            onClick={() => onRemove(t)}
            className="hover:text-indigo-900"
            aria-label={`Remove ${t}`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <div className="inline-flex items-center gap-1">
        <input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder="Add tag"
          className="rounded-full border border-dashed border-slate-300 bg-white outline-none focus:border-indigo-300 px-2 py-0.5 text-[11px] w-20"
        />
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50 text-slate-500 size-5"
          aria-label="Add tag"
        >
          <Plus className="size-3" />
        </button>
      </div>
    </div>
  );
}

function IconBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="size-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 inline-flex items-center justify-center"
    >
      {children}
    </button>
  );
}

function Badge({children}: {children: React.ReactNode}) {
  return (
    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">
      {children}
    </span>
  );
}
