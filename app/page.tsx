"use client";
import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { Player, PlayerRef } from "@remotion/player";
import type { User } from "@supabase/supabase-js";
import {
  Play, Pause, Plus, Trash2, Download,
  SkipBack, SkipForward, Maximize2, Check, ChevronDown, Sliders, Sparkles, Wand2,
  Users, Code2,
} from "lucide-react";
import { SubtitleVideo } from "@/remotion/SubtitleVideo";
import { CodeStyleVideo } from "@/remotion/CodeStyleVideo";
import {
  SubtitleItem,
  SubtitleStyleId,
  TypographyOverrides,
  VideoBackground,
  VideoFormatId,
  sampleScript,
  subtitleStyles,
  videoFormats,
  createTimelineFromText,
  getTimelineDurationInFrames,
  isBuiltInSubtitleStyleId,
  normalizeSubtitleItem,
} from "@/lib/subtitles";
import {
  communityStyleKey,
  toCustomSubtitleStyleConfig,
  type CommunitySubtitleStyle,
} from "@/lib/community-styles";
import { supabase } from "@/lib/supabase/client";
import { fetchEditorStyles } from "@/lib/supabase/styles";
import { ProTimeline } from "@/components/timeline/ProTimeline";
import { TypographyEditor } from "@/components/typography/TypographyEditor";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { CommunityStylePreview } from "@/components/styles/CommunityStylePreview";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const fps = 30;
const epsilon = 0.01;
const minClipDuration = 0.25;
const FALLBACK_DURATION_SECONDS = 6;

function formatDuration(seconds: number) {
  const safe = Math.max(0, seconds || 0);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function Home() {
  const initialSubtitles = useMemo(() => createTimelineFromText(sampleScript).chunks, []);
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>(initialSubtitles);
  const [selectedId, setSelectedId] = useState(initialSubtitles[0]?.id ?? "");
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState<"subtitles" | "style" | "settings">("subtitles");
  const [styleId, setStyleId] = useState<string>("clean-minimal");
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [importedStyles, setImportedStyles] = useState<CommunitySubtitleStyle[]>([]);
  const [styleLibraryLoading, setStyleLibraryLoading] = useState(false);
  const [styleLibraryError, setStyleLibraryError] = useState<string | null>(null);
  const [typography, setTypography] = useState<TypographyOverrides>({});
  const [formatId, setFormatId] = useState<VideoFormatId>("landscape");
  const [background, setBackground] = useState<VideoBackground>("black");
  const [exporting, setExporting] = useState<null | "mp4" | "webm">(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState<string>("");
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  const sizeMenuRef = useRef<HTMLDivElement | null>(null);

  const playerRef = useRef<PlayerRef>(null);
  const activeFormat = useMemo(
    () => videoFormats.find((f) => f.id === formatId) ?? videoFormats[1],
    [formatId]
  );
  const selectedCommunityStyle = useMemo(
    () => importedStyles.find((style) => communityStyleKey(style.id) === styleId),
    [importedStyles, styleId]
  );
  const renderStyleId: SubtitleStyleId = selectedCommunityStyle
    ? selectedCommunityStyle.baseStyle
    : isBuiltInSubtitleStyleId(styleId)
      ? styleId
      : "clean-minimal";
  const customStyle = selectedCommunityStyle
    ? toCustomSubtitleStyleConfig(selectedCommunityStyle)
    : undefined;
  const isCodeStyle = selectedCommunityStyle?.kind === "code";
  const codeStyleSource = isCodeStyle ? selectedCommunityStyle?.code : undefined;

  // Robust duration: fallback when subtitles are empty
  const computedFrames = useMemo(
    () => (subtitles.length > 0 ? getTimelineDurationInFrames(sampleScript, fps, subtitles) : 0),
    [subtitles]
  );
  const durationInFrames = Math.max(computedFrames, FALLBACK_DURATION_SECONDS * fps);
  const durationInSeconds = durationInFrames / fps;

  const updateSubtitle = useCallback((id: string, patch: Partial<SubtitleItem>) => {
    setSubtitles((current) =>
      current.map((sub) => {
        if (sub.id !== id) return sub;
        const next = { ...sub, ...patch };
        next.duration = Number((next.end - next.start).toFixed(3));
        return next;
      })
    );
  }, []);

  const handleSeek = useCallback(
    (time: number) => {
      const player = playerRef.current;
      if (!player) return;
      player.seekTo(Math.max(0, Math.min(Math.floor(time * fps), durationInFrames - 1)));
    },
    [durationInFrames]
  );

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onFrame = () => setCurrentTime(player.getCurrentFrame() / fps);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    return () => {
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setAuthUser(data.user);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authUser) {
      setImportedStyles([]);
      setStyleLibraryError(null);
      if (!isBuiltInSubtitleStyleId(styleId)) setStyleId("clean-minimal");
      return;
    }

    let mounted = true;
    setStyleLibraryLoading(true);
    setStyleLibraryError(null);

    fetchEditorStyles(authUser.id)
      .then((styles) => {
        if (mounted) setImportedStyles(styles);
      })
      .catch((error) => {
        if (!mounted) return;
        setStyleLibraryError(error instanceof Error ? error.message : "Unable to load styles");
      })
      .finally(() => {
        if (mounted) setStyleLibraryLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [authUser]);

  // Close size menu on outside click
  useEffect(() => {
    if (!sizeMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (sizeMenuRef.current && !sizeMenuRef.current.contains(e.target as Node)) {
        setSizeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [sizeMenuOpen]);

  // Close export menu on outside click
  useEffect(() => {
    if (!exportMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [exportMenuOpen]);

  const sortedSubs = useMemo(
    () => [...subtitles].sort((a, b) => a.start - b.start),
    [subtitles]
  );

  const handleExport = useCallback(
    async (mode: "mp4" | "webm") => {
      if (exporting) return;
      setExporting(mode);
      setExportProgress(0);
      setExportStage("starting");
      setExportUrl(null);
      setExportError(null);
      setExportMenuOpen(false);
      try {
        const res = await fetch("/api/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: sampleScript,
            style: renderStyleId,
            customStyle,
            code: codeStyleSource,
            kind: isCodeStyle ? "code" : "settings",
            typography,
            background: mode === "webm" ? "transparent" : background,
            subtitles,
            width: activeFormat.width,
            height: activeFormat.height,
            format: mode,
          }),
        });
        if (!res.body) throw new Error("No response stream");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) !== -1) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line) continue;
            try {
              const evt = JSON.parse(line);
              if (evt.type === "stage" || evt.type === "progress") {
                if (typeof evt.progress === "number") setExportProgress(evt.progress);
                if (typeof evt.stage === "string") setExportStage(evt.stage);
              } else if (evt.type === "done") {
                setExportProgress(1);
                setExportStage("done");
                setExportUrl(evt.url);
                // Trigger an immediate browser download.
                if (typeof evt.url === "string") {
                  const a = document.createElement("a");
                  a.href = evt.url;
                  a.download = evt.filename || evt.url.split("/").pop() || "";
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                }
              } else if (evt.type === "error") {
                throw new Error(evt.error || "Render failed");
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      } catch (err) {
        console.error(err);
        setExportError(err instanceof Error ? err.message : "Export failed");
      } finally {
        setExporting(null);
      }
    },
    [exporting, renderStyleId, customStyle, codeStyleSource, isCodeStyle, typography, background, subtitles, activeFormat]
  );

  function insertSubtitleAt(index: number) {
    const before = sortedSubs[index - 1];
    const after = sortedSubs[index];
    let start: number;
    let end: number;
    const desired = 1.5;

    if (before && after) {
      const gap = after.start - before.end;
      if (gap >= minClipDuration + 2 * epsilon) {
        start = before.end + epsilon;
        end = Math.min(after.start - epsilon, start + Math.min(desired, gap - 2 * epsilon));
      } else {
        start = before.end + epsilon;
        end = start + desired;
        const shift = end + epsilon - after.start;
        if (shift > 0) {
          setSubtitles((current) => {
            const ids = new Set(
              [...current]
                .sort((a, b) => a.start - b.start)
                .filter((s) => s.start >= after.start)
                .map((s) => s.id)
            );
            return current.map((s) =>
              ids.has(s.id) ? { ...s, start: s.start + shift, end: s.end + shift } : s
            );
          });
        }
      }
    } else if (after) {
      end = Math.min(after.start - epsilon, desired);
      start = Math.max(0, end - desired);
      if (end - start < minClipDuration) {
        start = 0;
        end = start + desired;
        const shift = end + epsilon - after.start;
        if (shift > 0) {
          setSubtitles((current) =>
            current.map((s) =>
              s.start >= after.start ? { ...s, start: s.start + shift, end: s.end + shift } : s
            )
          );
        }
      }
    } else if (before) {
      start = before.end + epsilon;
      end = start + desired;
    } else {
      start = 0;
      end = desired;
    }

    const newItem = normalizeSubtitleItem(
      {
        text: "New subtitle",
        start: Number(start.toFixed(3)),
        end: Number(end.toFixed(3)),
        x: 50,
        y: 50,
      },
      subtitles.length
    );
    setSubtitles((current) => [...current, newItem]);
    setSelectedId(newItem.id);
  }

  function deleteSubtitle(id: string) {
    setSubtitles((current) => {
      const next = current.filter((s) => s.id !== id);
      if (selectedId === id) {
        const sorted = [...next].sort((a, b) => a.start - b.start);
        setSelectedId(sorted[0]?.id ?? "");
      }
      return next;
    });
  }

  return (
    <div className="flex h-screen bg-[#f8f9fa] text-slate-800 font-sans overflow-hidden">
      <AppSidebar />

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-[56px] border-b border-slate-200 bg-white flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold">Auto Captions</h1>
            <div className="w-px h-4 bg-slate-300 hidden md:block" />
            <span className="text-xs text-slate-500 hidden md:inline-block">
              Elux Space / Youtube Videos
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/community"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Users size={13} />
              Community
            </Link>
            <Link
              href="/styles/code"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Code2 size={13} />
              Create
            </Link>
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setExportMenuOpen((o) => !o)}
                disabled={exporting !== null}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-80 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <CircularProgress value={exportProgress} />
                ) : (
                  <Download size={14} />
                )}
                {exporting
                  ? `Exporting ${Math.round(exportProgress * 100)}%`
                  : "Export"}
                {!exporting && (
                  <ChevronDown
                    size={12}
                    className={cn("transition-transform", exportMenuOpen && "rotate-180")}
                  />
                )}
              </button>
              {exportMenuOpen && !exporting && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-1.5 w-64 rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden z-50"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 bg-slate-50">
                    Export format
                  </div>
                  <button
                    role="menuitem"
                    onClick={() => handleExport("mp4")}
                    disabled={exporting !== null}
                    className="w-full flex flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-xs font-semibold text-slate-800">
                      MP4 video
                    </span>
                    <span className="text-[10px] text-slate-500">
                      H.264 · with {background} background
                    </span>
                  </button>
                  <div className="h-px bg-slate-100" />
                  <button
                    role="menuitem"
                    onClick={() => handleExport("webm")}
                    disabled={exporting !== null}
                    className="w-full flex flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-xs font-semibold text-indigo-700">
                      Transparent (ProRes 4444)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      .mov · lossless alpha for editors
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 flex flex-col gap-2 min-h-0 bg-slate-100 p-2">
          <div className="flex gap-2 flex-1 min-h-0">
            {/* Player */}
            <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 flex flex-col min-w-0 overflow-hidden">
              <div
                className="flex-1 relative min-h-0"
                style={
                  background === "transparent"
                    ? {
                        backgroundColor: "#ffffff",
                        backgroundImage:
                          "linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)",
                        backgroundSize: "16px 16px",
                        backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                      }
                    : {
                        background: "#ffffff",
                        backgroundImage:
                          "radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.08) 0.8px, transparent 0)",
                        backgroundSize: "15px 15px",
                      }
                }
              >
                <Player
                  ref={playerRef}
                  component={isCodeStyle ? CodeStyleVideo : SubtitleVideo}
                  durationInFrames={durationInFrames}
                  fps={fps}
                  compositionWidth={activeFormat.width}
                  compositionHeight={activeFormat.height}
                  style={{ width: "100%", height: "100%" }}
                  inputProps={
                    isCodeStyle
                      ? {
                          subtitles,
                          background,
                          text: sampleScript,
                          width: activeFormat.width,
                          height: activeFormat.height,
                          code: codeStyleSource,
                        }
                      : {
                          subtitles,
                          style: renderStyleId,
                          customStyle,
                          background,
                          text: sampleScript,
                          width: activeFormat.width,
                          height: activeFormat.height,
                          typography,
                        }
                  }
                  acknowledgeRemotionLicense
                />
              </div>
              <div className="h-12 border-t border-slate-200 flex items-center px-3 justify-between bg-white text-slate-700 shrink-0">
                <span className="text-xs font-bold w-28 tabular-nums">
                  {formatDuration(currentTime)}{" "}
                  <span className="text-slate-400 font-normal">
                    / {formatDuration(durationInSeconds)}
                  </span>
                </span>
                <div className="flex items-center gap-3">
                  <button
                    className="hover:text-indigo-600 transition-colors hidden sm:block"
                    onClick={() => handleSeek(Math.max(0, currentTime - 5))}
                  >
                    <SkipBack size={18} fill="currentColor" />
                  </button>
                  <button
                    className="w-9 h-9 rounded-md bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-transform active:scale-95"
                    onClick={() =>
                      playing ? playerRef.current?.pause() : playerRef.current?.play()
                    }
                  >
                    {playing ? (
                      <Pause size={16} fill="currentColor" />
                    ) : (
                      <Play size={16} fill="currentColor" className="ml-0.5" />
                    )}
                  </button>
                  <button
                    className="hover:text-indigo-600 transition-colors hidden sm:block"
                    onClick={() => handleSeek(Math.min(durationInSeconds, currentTime + 5))}
                  >
                    <SkipForward size={18} fill="currentColor" />
                  </button>
                </div>
                <div className="flex items-center gap-2 w-auto justify-end relative" ref={sizeMenuRef}>
                  <div className="hidden sm:flex items-center rounded-md border border-slate-200 overflow-hidden text-[10px] font-semibold">
                    <button
                      onClick={() => setBackground("black")}
                      className={cn(
                        "px-2 py-1 transition-colors",
                        background === "black"
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-500 hover:bg-slate-50"
                      )}
                      title="Black background"
                    >
                      Black
                    </button>
                    <button
                      onClick={() => setBackground("transparent")}
                      className={cn(
                        "px-2 py-1 transition-colors border-l border-slate-200",
                        background === "transparent"
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-slate-500 hover:bg-slate-50"
                      )}
                      title="Transparent background"
                    >
                      Transparent
                    </button>
                  </div>
                  <button
                    onClick={() => setSizeMenuOpen((o) => !o)}
                    className={cn(
                      "text-xs rounded-md border font-medium px-2 py-1 flex items-center gap-1 transition-colors hidden sm:flex",
                      sizeMenuOpen
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                    aria-haspopup="listbox"
                    aria-expanded={sizeMenuOpen}
                  >
                    <span className="font-semibold">{activeFormat.name}</span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {activeFormat.label}
                    </span>
                    <ChevronDown size={12} className={cn(sizeMenuOpen && "rotate-180")} />
                  </button>
                  {sizeMenuOpen && (
                    <div
                      role="listbox"
                      className="absolute right-0 bottom-full mb-1.5 w-56 rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden z-50"
                    >
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 bg-slate-50">
                        Canvas size
                      </div>
                      <ScrollArea className="max-h-72">
                        <ul className="py-1">
                          {videoFormats.map((f) => {
                          const active = f.id === formatId;
                          return (
                            <li key={f.id}>
                              <button
                                role="option"
                                aria-selected={active}
                                onClick={() => {
                                  setFormatId(f.id);
                                  setSizeMenuOpen(false);
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50",
                                  active && "bg-indigo-50/60"
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={cn(
                                      "flex shrink-0 items-center justify-center border w-4 h-4 rounded-sm",
                                      active
                                        ? "border-indigo-600 bg-indigo-600 text-white"
                                        : "border-slate-300"
                                    )}
                                  >
                                    {active && <Check size={10} />}
                                  </span>
                                  <span
                                    className={cn(
                                      "font-medium truncate",
                                      active ? "text-indigo-700" : "text-slate-700"
                                    )}
                                  >
                                    {f.name}
                                  </span>
                                </div>
                                <span className="font-mono text-[10px] text-slate-400 tabular-nums shrink-0">
                                  {f.label}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                        </ul>
                      </ScrollArea>
                    </div>
                  )}
                  <button className="hover:text-slate-900 transition-colors hidden sm:block">
                    <Maximize2 size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right panel */}
            <div className="w-[360px] xl:w-[400px] rounded-lg bg-white border border-slate-200 flex-col hidden lg:flex overflow-hidden">
              <div className="flex border-b border-slate-200 px-3 gap-1 shrink-0">
                {([
                  { id: "subtitles", label: "Subtitles", icon: <Sparkles size={12} /> },
                  { id: "style", label: "Style", icon: <Wand2 size={12} /> },
                  { id: "settings", label: "Settings", icon: <Sliders size={12} /> },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={cn(
                      "flex items-center gap-1.5 py-2.5 px-2 text-xs font-bold border-b-2 -mb-px transition-colors",
                      activeTab === t.id
                        ? "border-indigo-600 text-indigo-700"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>

              {activeTab === "subtitles" ? (
                <ScrollArea className="flex-1 min-h-0">
                  <div className="px-3 py-2">
                  {sortedSubs.length === 0 ? (
                    <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center px-6 gap-3">
                      <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center">
                        <Plus size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          No subtitles yet
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Add your first caption to start editing the timeline.
                        </p>
                      </div>
                      <button
                        onClick={() => insertSubtitleAt(0)}
                        className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                      >
                        <Plus size={12} /> Add subtitle
                      </button>
                    </div>
                  ) : (
                    <>
                      <InsertButton onClick={() => insertSubtitleAt(0)} />
                      {sortedSubs.map((sub, i) => (
                        <React.Fragment key={sub.id}>
                          <div
                            onClick={() => {
                              setSelectedId(sub.id);
                              handleSeek(sub.start);
                            }}
                            className={cn(
                              "group p-2.5 rounded-md border flex gap-2.5 cursor-pointer transition-colors",
                              selectedId === sub.id
                                ? "bg-indigo-50/60 border-indigo-500"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            )}
                          >
                            <span className="text-[11px] font-semibold text-slate-400 pt-1 shrink-0 tabular-nums w-10">
                              {formatDuration(sub.start)}
                            </span>
                            <textarea
                              value={sub.text}
                              onChange={(e) => updateSubtitle(sub.id, { text: e.target.value })}
                              placeholder="Empty subtitle…"
                              className={cn(
                                "flex-1 resize-none text-[13px] font-medium leading-snug bg-transparent outline-none placeholder:text-slate-300 placeholder:italic",
                                selectedId === sub.id ? "text-slate-900" : "text-slate-700"
                              )}
                              rows={2}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex flex-col gap-1 items-end shrink-0">
                              {sub.overrides && Object.keys(sub.overrides).length > 0 && (
                                <span
                                  className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold uppercase tracking-wide"
                                  title="This subtitle has style overrides"
                                >
                                  custom
                                </span>
                              )}
                              <button
                                className="text-slate-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSubtitle(sub.id);
                                }}
                                aria-label="Delete subtitle"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          {selectedId === sub.id && (
                            <SubtitleOverridePanel
                              subtitle={sub}
                              global={typography}
                              onChange={(overrides) =>
                                updateSubtitle(sub.id, { overrides })
                              }
                            />
                          )}
                          <InsertButton onClick={() => insertSubtitleAt(i + 1)} />
                        </React.Fragment>
                      ))}
                    </>
                  )}
                  </div>
                </ScrollArea>
              ) : activeTab === "style" ? (
                <StylePanel
                  selected={styleId}
                  onSelect={setStyleId}
                  importedStyles={importedStyles}
                  loadingImported={styleLibraryLoading}
                  error={styleLibraryError}
                  signedIn={!!authUser}
                />
              ) : (
                <SettingsPanel value={typography} onChange={setTypography} />
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="h-[220px] shrink-0 overflow-hidden">
            <ProTimeline
              duration={durationInSeconds}
              currentTime={currentTime}
              subtitles={subtitles}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onSeek={handleSeek}
              onUpdate={updateSubtitle}
              onAdd={() => insertSubtitleAt(sortedSubs.length)}
            />
          </div>
        </div>
      </main>
      {(exporting || exportUrl || exportError) && (
        <div className="fixed bottom-4 right-4 z-[100] w-[320px] rounded-lg bg-white border border-slate-200 shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {exporting ? (
                <CircularProgress value={exportProgress} color="indigo" size={14} />
              ) : exportError ? (
                <div className="w-3.5 h-3.5 rounded-full bg-rose-500" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check size={9} className="text-white" strokeWidth={3} />
                </div>
              )}
              <span className="text-xs font-bold text-slate-800 truncate">
                {exportError
                  ? "Export failed"
                  : exportUrl
                  ? "Export ready"
                  : exporting === "webm"
                  ? "Transparent (ProRes 4444)"
                  : "MP4 video"}
              </span>
            </div>
            {!exporting && (
              <button
                onClick={() => {
                  setExportUrl(null);
                  setExportError(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-[10px] font-semibold uppercase tracking-wide shrink-0"
              >
                Dismiss
              </button>
            )}
          </div>
          <div className="px-3 py-2.5 space-y-1.5">
            {exportError ? (
              <p className="text-[11px] text-rose-600 break-words leading-snug">
                {exportError}
              </p>
            ) : (
              <>
                <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-200",
                      exportUrl ? "bg-emerald-500" : "bg-indigo-600"
                    )}
                    style={{ width: `${Math.max(2, Math.round(exportProgress * 100))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 tabular-nums">
                  <span className="capitalize">
                    {exportUrl ? "Done" : exportStage || "Preparing"}
                  </span>
                  <span>{Math.round(exportProgress * 100)}%</span>
                </div>
              </>
            )}
            {exportUrl && (
              <a
                href={exportUrl}
                download
                className="mt-1 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-600 text-white text-[10px] font-semibold hover:bg-indigo-700"
              >
                <Download size={10} /> Download again
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CircularProgress({
  value,
  size = 14,
  color = "white",
}: {
  value: number;
  size?: number;
  color?: "white" | "indigo";
}) {
  const stroke = 2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const trackColor = color === "indigo" ? "#e0e7ff" : "rgba(255,255,255,0.3)";
  const fillColor = color === "indigo" ? "#4f46e5" : "#ffffff";
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={trackColor}
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={fillColor}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 200ms ease" }}
      />
    </svg>
  );
}

function InsertButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="group/insert relative h-2 flex items-center justify-center">
      <div className="absolute inset-x-0 h-px bg-transparent group-hover/insert:bg-indigo-200 transition-colors" />
      <button
        onClick={onClick}
        className="relative z-10 grid h-4 w-4 place-items-center rounded-full bg-white border border-slate-300 text-slate-400 opacity-0 group-hover/insert:opacity-100 hover:border-indigo-500 hover:text-indigo-600 transition-all"
        aria-label="Insert subtitle"
      >
        <Plus size={10} />
      </button>
    </div>
  );
}

function StylePanel({
  selected,
  onSelect,
  importedStyles,
  loadingImported,
  error,
  signedIn,
}: {
  selected: string;
  onSelect: (id: string) => void;
  importedStyles: CommunitySubtitleStyle[];
  loadingImported: boolean;
  error: string | null;
  signedIn: boolean;
}) {
  return (
    <ScrollArea className="flex-1">
      <div className="px-3 py-3 space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <span className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground block">
              Caption Style
            </span>
            <span className="text-[10px] text-muted-foreground">
              Choose a preset look for your captions
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] font-bold">
            {subtitleStyles.length + importedStyles.length}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs">
            <Link href="/community">
              <Users className="size-3" />
              Browse
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs">
            <Link href="/styles/code">
              <Code2 className="size-3" />
              Create
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {subtitleStyles.map((s) => {
            const active = s.id === selected;
            return (
              <Card
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={cn(
                  "group relative cursor-pointer p-2 rounded-md border shadow-none transition-all overflow-hidden",
                  active
                    ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                    : "border-input hover:border-slate-300"
                )}
              >
                <div
                  className="h-14 rounded-sm flex items-center justify-center mb-2 px-2"
                  style={{
                    background: `linear-gradient(135deg, #0f172a, #1e293b)`,
                  }}
                >
                  <span
                    className={cn(
                      "text-[11px] leading-none truncate w-full text-center",
                      s.previewClass
                    )}
                    style={{ color: s.accent }}
                  >
                    {s.name.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "text-[11px] font-semibold truncate",
                      active ? "text-primary" : "text-slate-700"
                    )}
                  >
                    {s.name}
                  </span>
                  {active && (
                    <span className="shrink-0 grid place-items-center w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground">
                      <Check size={9} />
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  {s.description}
                </p>
              </Card>
            );
          })}
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div>
              <span className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground block">
                Imported
              </span>
              <span className="text-[10px] text-muted-foreground">
                Community styles available in this editor
              </span>
            </div>
            {loadingImported && (
              <span className="text-[10px] font-semibold text-slate-400">
                Loading
              </span>
            )}
          </div>

          {!signedIn ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-center">
              <p className="text-xs font-semibold text-slate-700">Sign in to keep imported styles</p>
              <Button asChild size="sm" className="mt-2 h-8 text-xs">
                <Link href="/auth">Sign in</Link>
              </Button>
            </div>
          ) : error ? (
            <p className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          ) : importedStyles.length === 0 && !loadingImported ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-center">
              <p className="text-xs font-semibold text-slate-700">No imported styles yet</p>
              <p className="text-[10px] text-slate-500 mt-1">
                Import one from the community or publish your own.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {importedStyles.map((style) => {
                const key = communityStyleKey(style.id);
                return (
                  <CommunityStylePreview
                    key={style.id}
                    style={style}
                    compact
                    active={selected === key}
                    action="none"
                    onClick={() => onSelect(key)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

function SettingsPanel({
  value,
  onChange,
}: {
  value: TypographyOverrides;
  onChange: (v: TypographyOverrides) => void;
}) {
  const overrideCount = Object.keys(value).length;
  return (
    <ScrollArea className="flex-1">
      <div className="px-3 py-3 space-y-3">
        <div className="flex items-start justify-between px-1">
          <div>
            <span className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground block">
              Global Typography
            </span>
            <span className="text-[10px] text-muted-foreground">
              Applies to all subtitles unless overridden
            </span>
          </div>
          {overrideCount > 0 && (
            <Badge variant="soft" className="text-[10px]">
              {overrideCount} active
            </Badge>
          )}
        </div>
        <Separator />
        <TypographyEditor
          value={value}
          onChange={onChange}
          onReset={overrideCount > 0 ? () => onChange({}) : undefined}
        />
      </div>
    </ScrollArea>
  );
}

function SubtitleOverridePanel({
  subtitle,
  global,
  onChange,
}: {
  subtitle: SubtitleItem;
  global: TypographyOverrides;
  onChange: (overrides: TypographyOverrides | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const overrides = subtitle.overrides ?? {};
  const overrideCount = Object.keys(overrides).length;

  return (
    <Card className="my-1 rounded-md shadow-none border-input overflow-hidden">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full h-auto px-3 py-2 text-[11px] font-semibold text-slate-600 hover:text-primary rounded-none"
      >
        <span className="flex items-center gap-1.5">
          <Sliders size={11} />
          Style overrides
          {overrideCount > 0 && (
            <Badge variant="default" className="h-4 px-1.5 text-[9px]">
              {overrideCount}
            </Badge>
          )}
        </span>
        <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </Button>
      {open && (
        <>
          <Separator />
          <div className="px-3 py-3 bg-background">
            <TypographyEditor
              value={overrides}
              onChange={(o: TypographyOverrides) =>
                onChange(Object.keys(o).length ? o : undefined)
              }
              inheritFrom={global}
              allowInherit
              onReset={overrideCount > 0 ? () => onChange(undefined) : undefined}
            />
          </div>
        </>
      )}
    </Card>
  );
}
