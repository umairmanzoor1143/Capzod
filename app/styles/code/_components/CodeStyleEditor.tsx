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
  CheckCircle2,
  ChevronDown,
  Code2,
  Loader2,
  LockKeyhole,
  Maximize2,
  Pause,
  Play,
  Plus,
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

const STARTER_CODE = `// Receives { chunk, activeWordIndex, words, frame, fps, localFrame }
// Use React + Remotion (interpolate, spring, useCurrentFrame, AbsoluteFill).

function MyCaption({ chunk, activeWordIndex, words, localFrame, fps }) {
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
          const color = active ? "#A855F7" : "#FFFFFF";
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                transform: \`scale(\${scale})\`,
                opacity: enter,
                color,
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 800,
                fontSize: 140,
                letterSpacing: "-0.02em",
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
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800">
      <AppSidebar />

      <main className="flex-1 min-w-0 flex flex-col h-screen">
        {/* Header */}
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/styles/code"
              className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="size-3.5" />
              My Styles
            </Link>
            <div className="text-slate-300">·</div>
            <div className="flex items-center gap-2 text-slate-700 min-w-0">
              <Code2 className="size-4 text-indigo-600" />
              <span className="text-[15px] font-semibold truncate">
                {isEdit ? `Editing: ${meta.name}` : "New Style"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={requestFullscreen}>
              <Maximize2 className="size-3.5" />
              Preview Fullscreen
            </Button>
            {!isEdit && (
              <Button variant="outline" size="sm" onClick={handleSaveDraft}>
                <Save className="size-3.5" />
                {draftSaved ? "Saved" : "Save Draft"}
              </Button>
            )}
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={publishDisabled}
              className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-700 hover:to-fuchsia-700 text-white disabled:opacity-50"
            >
              {publishing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              {isEdit ? (dirty ? "Resubmit" : "No changes") : "Publish Style"}
            </Button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_300px] gap-3 p-3 overflow-hidden">
          {/* LEFT: code editor */}
          <section className="min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="h-11 px-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-sm font-semibold text-slate-800">Style Component</h2>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                TSX
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-auto bg-[#1e1e2e]">
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

            <div className="h-9 px-4 border-t border-slate-200 bg-white text-[11px] text-slate-500 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const r = compileStyleCode(code);
                    if (r.ok) setError(null);
                    else setError(r.error);
                  }}
                  className="inline-flex items-center gap-1.5 hover:text-slate-700"
                >
                  <AlertCircle className="size-3.5" />
                  Check for errors
                </button>
                <span className="flex items-center gap-1.5">
                  {error ? (
                    <>
                      <span className="size-1.5 rounded-full bg-rose-500" />
                      <span className="text-rose-600 font-medium">Compile error</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-medium">No errors found</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span>Spaces: 2</span>
                <span>TypeScript React</span>
              </div>
            </div>
            {error && (
              <div className="px-4 py-2 text-[11.5px] text-rose-700 font-mono bg-rose-50 border-t border-rose-100 max-h-32 shrink-0">
                <ScrollArea className="max-h-28">
                  <pre className="whitespace-pre-wrap break-words pr-3">{error}</pre>
                </ScrollArea>
              </div>
            )}
          </section>

          {/* CENTER: preview */}
          <section className="min-h-0 flex flex-col gap-3 overflow-hidden">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
              <div className="px-4 h-11 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  Live Preview
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Auto-updates
                  </span>
                </div>
              </div>

              <div
                className={cn("p-3 flex-1 min-h-0 flex items-center justify-center")}
                style={{
                  backgroundColor: "#ffffff",
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.08) 0.8px, transparent 0)",
                  backgroundSize: "16px 16px",
                  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                }}
              >
                <div
                  className="overflow-hidden rounded-md border border-white/10 shadow-inner"
                  style={{
                    aspectRatio:
                      format === "landscape"
                        ? "16 / 9"
                        : format === "portrait"
                          ? "9 / 16"
                          : "1 / 1",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    width: format === "landscape" ? "100%" : "auto",
                    height: format === "landscape" ? "auto" : "100%",
                  }}
                >
                  <Player
                    ref={playerRef}
                    key={`${format}-${transparent}-${Component ? "ok" : "fb"}`}
                    component={CodeStyleVideo}
                    durationInFrames={TOTAL_FRAMES}
                    fps={FPS}
                    compositionWidth={fmt.w}
                    compositionHeight={fmt.h}
                    style={{width: "100%", height: "100%"}}
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

              <div className="px-4 py-2.5 border-t border-slate-100 flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-mono text-slate-500 tabular-nums w-[88px]">
                  {formatTime(currentSecond)} / {formatTime(totalSecond)}
                </span>
                <div className="flex items-center gap-1">
                  <IconBtn onClick={() => seekRel(-30)}>
                    <SkipBack className="size-3.5" />
                  </IconBtn>
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="size-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-sm"
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
                  className="flex-1 accent-indigo-600"
                />
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
                <button
                  type="button"
                  onClick={() => setTransparent((t) => !t)}
                  className={cn(
                    "h-7 px-2.5 rounded-md border text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors",
                    transparent
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      transparent ? "bg-indigo-500" : "bg-slate-300"
                    )}
                  />
                  Transparent
                </button>
              </div>
            </div>
          </section>

          {/* RIGHT: Metadata */}
          <aside className="min-h-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
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
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "appearance-none w-full rounded-md border border-slate-200 bg-white text-slate-800 pr-7 pl-2.5 outline-none focus:ring-2 focus:ring-indigo-200 hover:border-slate-300 transition-colors",
          compact ? "h-7 text-[11px]" : "h-9 text-[12.5px]"
        )}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="size-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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
