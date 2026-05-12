"use client";
import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Player, PlayerRef } from "@remotion/player";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Play, Pause, Plus, Trash2, Download,
  SkipBack, SkipForward, Maximize2, Check, ChevronDown, Sliders, Sparkles, Wand2,
  Users, Code2, X, Upload,
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
  importSubtitlesFromFileContent,
  getWords,
  getWordTimings,
} from "@/lib/subtitles";
import {
  communityStyleKey,
  toCustomSubtitleStyleConfig,
  type CommunitySubtitleStyle,
} from "@/lib/community-styles";
import { resolvePresetTypographyForEditor } from "@/lib/subtitle-style-merge";
import { apiFetchEditorStyles } from "@/lib/api";
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

const BuiltinStyleThumbnail = dynamic(
  () =>
    import("@/components/styles/BuiltinStyleThumbnail").then(
      (m) => m.BuiltinStyleThumbnail
    ),
  { ssr: false }
);

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
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
  const [subtitleImportError, setSubtitleImportError] = useState<string | null>(null);
  const [styleId, setStyleId] = useState<string>("clean-minimal");
  const { user: authUser, loading: authLoading } = useAuth();
  const canExport = Boolean(authUser) && !authLoading;
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
  const subtitleFileInputRef = useRef<HTMLInputElement | null>(null);

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

  const settingsTypographyInherit = useMemo(() => {
    if (selectedCommunityStyle) {
      return resolvePresetTypographyForEditor(
        selectedCommunityStyle.baseStyle,
        selectedCommunityStyle.typography
      );
    }
    return resolvePresetTypographyForEditor(renderStyleId, undefined);
  }, [selectedCommunityStyle, renderStyleId]);

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
        const next = {...sub, ...patch};
        next.duration = Number((next.end - next.start).toFixed(3));
        if (patch.text !== undefined) {
          next.words = getWords(next.text);
          next.wordTimings = getWordTimings(next.text, next.duration);
        }
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

  const handleSubtitleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      try {
        const text = await file.text();
        const result = importSubtitlesFromFileContent(text, file.name);
        if (!result.ok) {
          setSubtitleImportError(result.error);
          return;
        }
        setSubtitleImportError(null);
        setSubtitles(result.items);
        const first = result.items[0];
        if (first) {
          setSelectedId(first.id);
          handleSeek(first.start);
        } else {
          setSelectedId("");
        }
      } catch (err) {
        setSubtitleImportError(err instanceof Error ? err.message : "Could not read file");
      }
    },
    [handleSeek]
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

  // Auth is provided by AuthProvider context

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

    apiFetchEditorStyles()
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

  useEffect(() => {
    if (!canExport) setExportMenuOpen(false);
  }, [canExport]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) setMobileEditorOpen(false);
    };
    mq.addEventListener("change", onChange);
    onChange();
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const sortedSubs = useMemo(
    () => [...subtitles].sort((a, b) => a.start - b.start),
    [subtitles]
  );

  const handleExport = useCallback(
    async (mode: "mp4" | "webm") => {
      if (exporting) return;
      if (!authUser) {
        setExportError("Sign in to export video.");
        setExportMenuOpen(false);
        return;
      }
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
          credentials: "include",
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
        if (res.status === 401) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || "Sign in to export video.");
        }
        if (!res.ok) {
          throw new Error(`Export failed (${res.status})`);
        }
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
    [exporting, authUser, renderStyleId, customStyle, codeStyleSource, isCodeStyle, typography, background, subtitles, activeFormat]
  );

  function insertSubtitleAt(index: number) {
    setSubtitleImportError(null);
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

  function renderEditorPanelBody() {
    if (activeTab === "subtitles") {
      return (
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-3 py-2">
            {subtitleImportError ? (
              <div className="mb-3 flex items-start justify-between gap-2 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11px] text-rose-800">
                <span className="min-w-0 leading-snug">{subtitleImportError}</span>
                <button
                  type="button"
                  className="shrink-0 font-semibold text-rose-700 hover:text-rose-900"
                  onClick={() => setSubtitleImportError(null)}
                >
                  Dismiss
                </button>
              </div>
            ) : null}
            {sortedSubs.length === 0 ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
                  <Plus size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">No subtitles yet</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Add captions manually or import an .srt / .vtt file (with timings). Plain .txt uses one line per
                    caption and auto-spacing.
                  </p>
                </div>
                <div className="flex w-full max-w-sm flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => insertSubtitleAt(0)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    <Plus size={12} /> Add subtitle
                  </button>
                  <label
                    htmlFor="subtitle-file-import"
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    <Upload size={14} />
                    Upload file
                  </label>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-2">
                  <label
                    htmlFor="subtitle-file-import"
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    <Upload size={13} />
                    Import .srt / .vtt / .txt
                  </label>
                  <span className="text-[10px] text-slate-400">Replaces all captions on the timeline.</span>
                </div>
                <InsertButton onClick={() => insertSubtitleAt(0)} />
                {sortedSubs.map((sub, i) => (
                  <React.Fragment key={sub.id}>
                    <div
                      onClick={() => {
                        setSelectedId(sub.id);
                        handleSeek(sub.start);
                      }}
                      className={cn(
                        "group flex cursor-pointer gap-2.5 rounded-md border p-2.5 transition-colors",
                        selectedId === sub.id
                          ? "border-indigo-500 bg-indigo-50/60"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <span className="w-10 shrink-0 pt-1 text-[11px] font-semibold tabular-nums text-slate-400">
                        {formatDuration(sub.start)}
                      </span>
                      <textarea
                        value={sub.text}
                        onChange={(e) => updateSubtitle(sub.id, { text: e.target.value })}
                        placeholder="Empty subtitle…"
                        className={cn(
                          "flex-1 resize-none bg-transparent text-[13px] font-medium leading-snug outline-none placeholder:italic placeholder:text-slate-300",
                          selectedId === sub.id ? "text-slate-900" : "text-slate-700"
                        )}
                        rows={2}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {sub.overrides && Object.keys(sub.overrides).length > 0 && (
                          <span
                            className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-700"
                            title="This subtitle has style overrides"
                          >
                            custom
                          </span>
                        )}
                        <button
                          className="text-slate-300 opacity-100 transition-colors hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100"
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
                        global={settingsTypographyInherit}
                        onChange={(overrides) => updateSubtitle(sub.id, { overrides })}
                      />
                    )}
                    <InsertButton onClick={() => insertSubtitleAt(i + 1)} />
                  </React.Fragment>
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      );
    }
    if (activeTab === "style") {
      return (
        <StylePanel
          selected={styleId}
          onSelect={setStyleId}
          importedStyles={importedStyles}
          loadingImported={styleLibraryLoading}
          error={styleLibraryError}
          signedIn={!!authUser}
        />
      );
    }
    return (
      <SettingsPanel
        value={typography}
        onChange={setTypography}
        inheritFrom={settingsTypographyInherit}
      />
    );
  }

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/35 text-slate-800">
      <AppSidebar />

      {/* Main */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] min-w-0 lg:pb-0">
        <input
          id="subtitle-file-import"
          ref={subtitleFileInputRef}
          type="file"
          accept=".srt,.vtt,.txt,text/plain,application/x-subrip"
          className="sr-only"
          onChange={handleSubtitleFileChange}
        />
        {/* Header */}
        <header className="relative z-40 flex min-h-[52px] shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-2 border-b border-slate-200/70 bg-white/85 px-3 py-2 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-md sm:px-5 lg:h-14 lg:flex-nowrap lg:py-0">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <h1 className="truncate text-sm font-bold tracking-tight text-slate-900 sm:text-base">
              Auto Captions
            </h1>
            <div className="hidden h-4 w-px bg-slate-200 md:block" />
            <span className="hidden text-xs font-medium text-slate-500 md:inline-block">
              Elux Space / Youtube Videos
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/community"
              className="hidden items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm shadow-slate-900/[0.03] transition-[box-shadow,background-color] hover:bg-slate-50/90 md:flex"
            >
              <Users size={13} />
              Community
            </Link>
            <Link
              href="/styles/code"
              className="hidden items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm shadow-slate-900/[0.03] transition-[box-shadow,background-color] hover:bg-slate-50/90 md:flex"
            >
              <Code2 size={13} />
              Create
            </Link>
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => canExport && setExportMenuOpen((o) => !o)}
                disabled={exporting !== null || !canExport}
                title={!canExport ? "Sign in to export video" : undefined}
                className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 py-1.5 pl-2 pr-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-[filter,box-shadow,transform] hover:brightness-105 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-80 sm:gap-2 sm:pr-3"
              >
                {exporting ? (
                  <CircularProgress value={exportProgress} />
                ) : (
                  <Download size={14} />
                )}
                <span className="max-w-[9rem] truncate sm:max-w-none">
                  {exporting
                    ? `Export ${Math.round(exportProgress * 100)}%`
                    : "Export"}
                </span>
                {!exporting && (
                  <ChevronDown
                    size={12}
                    className={cn("transition-transform", exportMenuOpen && "rotate-180")}
                  />
                )}
              </button>
              {exportMenuOpen && !exporting && canExport && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,16rem)] overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 shadow-menu backdrop-blur-md sm:w-64"
                >
                  <div className="border-b border-slate-100/90 bg-gradient-to-r from-slate-50 to-white px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Export format
                  </div>
                  <button
                    role="menuitem"
                    onClick={() => handleExport("mp4")}
                    disabled={exporting !== null || !canExport}
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
                    disabled={exporting !== null || !canExport}
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
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 px-1.5 pt-2 pb-14 sm:px-2 sm:pt-2.5 lg:p-3">
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 lg:flex-row">
            {/* Player */}
            <div className="flex min-h-[min(340px,52dvh)] min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-float ring-1 ring-slate-900/[0.02] lg:min-h-0">
              <div
                className="relative min-h-0 flex-1"
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
                  style={{position: "absolute", inset: 0, width: "100%", height: "100%"}}
                  inputProps={
                    isCodeStyle
                      ? {
                          subtitles,
                          background,
                          text: sampleScript,
                          width: activeFormat.width,
                          height: activeFormat.height,
                          code: codeStyleSource,
                          style: renderStyleId,
                          customStyle,
                          typography,
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
              <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200/80 bg-gradient-to-b from-white to-slate-50/40 px-2 py-2 text-slate-700 sm:h-12 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-3 sm:py-0">
                <div className="flex items-center justify-between gap-2 sm:contents">
                  <span className="w-28 shrink-0 text-xs font-bold tabular-nums">
                  {formatDuration(currentTime)}{" "}
                  <span className="font-normal text-slate-400">
                    / {formatDuration(durationInSeconds)}
                  </span>
                </span>
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    className="hidden text-slate-600 transition-colors hover:text-indigo-600 sm:block"
                    onClick={() => handleSeek(Math.max(0, currentTime - 5))}
                  >
                    <SkipBack size={18} fill="currentColor" />
                  </button>
                  <button
                    className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-600 text-white transition-transform hover:bg-indigo-700 active:scale-95"
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
                    className="hidden text-slate-600 transition-colors hover:text-indigo-600 sm:block"
                    onClick={() => handleSeek(Math.min(durationInSeconds, currentTime + 5))}
                  >
                    <SkipForward size={18} fill="currentColor" />
                  </button>
                </div>
                </div>
                <div
                  className="relative flex min-w-0 flex-wrap items-center justify-between gap-2 sm:ml-auto sm:flex-nowrap sm:justify-end"
                  ref={sizeMenuRef}
                >
                  <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-lg border border-slate-200/90 bg-white text-[10px] font-semibold shadow-sm sm:flex-none">
                    <button
                      onClick={() => setBackground("black")}
                      className={cn(
                        "min-w-0 flex-1 px-2 py-1.5 transition-colors sm:flex-none sm:py-1",
                        background === "black"
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-500 hover:bg-slate-50"
                      )}
                      title="Black background"
                      type="button"
                    >
                      Black
                    </button>
                    <button
                      onClick={() => setBackground("transparent")}
                      className={cn(
                        "min-w-0 flex-1 border-l border-slate-200 px-2 py-1.5 transition-colors sm:flex-none sm:py-1",
                        background === "transparent"
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-slate-500 hover:bg-slate-50"
                      )}
                      title="Transparent background"
                      type="button"
                    >
                      <span className="sm:hidden">Trans</span>
                      <span className="hidden sm:inline">Transparent</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSizeMenuOpen((o) => !o)}
                    className={cn(
                      "flex max-w-[min(100%,11rem)] shrink-0 items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-[box-shadow,background-color] sm:max-w-none sm:py-1",
                      sizeMenuOpen
                        ? "border-indigo-300/80 bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200/50"
                        : "border-slate-200/90 bg-white text-slate-600 shadow-sm hover:bg-slate-50/90"
                    )}
                    aria-haspopup="listbox"
                    aria-expanded={sizeMenuOpen}
                  >
                    <span className="truncate font-semibold">{activeFormat.name}</span>
                    <span className="hidden shrink-0 font-mono text-[10px] text-slate-400 tabular-nums sm:inline">
                      {activeFormat.label}
                    </span>
                    <ChevronDown size={12} className={cn("shrink-0", sizeMenuOpen && "rotate-180")} />
                  </button>
                  {sizeMenuOpen && (
                    <div
                      role="listbox"
                      className="absolute inset-x-0 bottom-full z-50 mb-2 max-h-[min(70dvh,420px)] overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 shadow-menu backdrop-blur-md sm:inset-x-auto sm:right-0 sm:mx-0 sm:w-56"
                    >
                      <div className="border-b border-slate-100/90 bg-gradient-to-r from-slate-50 to-white px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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

            {/* Right panel — desktop (mobile uses bottom dock + sheet) */}
            <div className="hidden min-h-0 w-full flex-none flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 shadow-float ring-1 ring-slate-900/[0.02] backdrop-blur-sm lg:flex lg:w-[360px] xl:w-[400px]">
              <div className="grid shrink-0 grid-cols-3 gap-0 border-b border-slate-200/80 bg-slate-50/50 px-1 sm:px-1.5">
                {(
                  [
                    { id: "subtitles" as const, label: "Subtitles", icon: <Sparkles size={12} /> },
                    { id: "style" as const, label: "Style", icon: <Wand2 size={12} /> },
                    { id: "settings" as const, label: "Settings", icon: <Sliders size={12} /> },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 border-b-2 py-2.5 text-[10px] font-bold -mb-px transition-colors sm:flex-row sm:gap-1.5 sm:text-xs",
                      activeTab === t.id
                        ? "border-indigo-600 text-indigo-700"
                        : "border-transparent text-slate-500 hover:bg-white/60 hover:text-slate-800"
                    )}
                  >
                    {t.icon}
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
              {renderEditorPanelBody()}
            </div>
          </div>

          {/* Timeline */}
          <div className="h-[min(200px,34svh)] shrink-0 overflow-hidden rounded-xl border border-slate-200/70 bg-white/80 shadow-sm shadow-slate-900/[0.03] backdrop-blur-sm sm:h-[200px] lg:h-[220px]">
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

        {/* Mobile: editor dock (above bottom nav) + full-height bottom sheet */}
        <div className="lg:hidden">
          {!mobileEditorOpen && (
            <nav
              className="fixed inset-x-0 z-[55] grid grid-cols-3 divide-x divide-slate-200/80 border-t border-slate-200/80 bg-white/90 shadow-[0_-8px_32px_-12px_rgba(15,23,42,0.1)] backdrop-blur-xl backdrop-saturate-150"
              style={{bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))"}}
              aria-label="Editor panels"
            >
              {(
                [
                  { id: "subtitles" as const, label: "Subtitles", icon: Sparkles },
                  { id: "style" as const, label: "Style", icon: Wand2 },
                  { id: "settings" as const, label: "Settings", icon: Sliders },
                ] as const
              ).map((t) => {
                const Icon = t.icon;
                const on = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(t.id);
                      setMobileEditorOpen(true);
                    }}
                    className={cn(
                      "flex min-h-[48px] flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-bold transition-colors",
                      on ? "bg-indigo-50/90 text-indigo-700" : "text-slate-600 active:bg-slate-100/80"
                    )}
                  >
                    <Icon className={cn("size-[18px]", on && "text-indigo-600")} />
                    <span className="max-w-full truncate px-0.5">{t.label}</span>
                  </button>
                );
              })}
            </nav>
          )}
          {mobileEditorOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-[58] bg-black/45"
                aria-label="Close panel"
                onClick={() => setMobileEditorOpen(false)}
              />
              <div
                className="fixed left-0 right-0 z-[60] flex flex-col overflow-hidden rounded-t-2xl border border-slate-200 border-b-0 bg-white shadow-[0_-12px_48px_rgba(15,23,42,0.2)]"
                style={{
                  top: "max(52px, 10dvh)",
                  bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))",
                }}
                role="dialog"
                aria-modal="true"
              >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 bg-white/90 px-3 py-2.5 backdrop-blur-sm">
                  <div className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-900">
                    {activeTab === "subtitles" && <Sparkles className="size-4 shrink-0 text-indigo-600" />}
                    {activeTab === "style" && <Wand2 className="size-4 shrink-0 text-indigo-600" />}
                    {activeTab === "settings" && <Sliders className="size-4 shrink-0 text-indigo-600" />}
                    <span className="truncate">
                      {activeTab === "subtitles"
                        ? "Subtitles"
                        : activeTab === "style"
                          ? "Caption style"
                          : "Settings"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileEditorOpen(false)}
                    className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200/90 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  {renderEditorPanelBody()}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      {(exporting || exportUrl || exportError) && (
        <div className="fixed inset-x-3 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-[100] overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 shadow-menu backdrop-blur-md sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[320px] lg:bottom-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100/90 bg-gradient-to-r from-slate-50/90 to-white px-3 py-2">
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
        className="relative z-10 grid h-4 w-4 place-items-center rounded-full bg-white border border-slate-300 text-slate-400 opacity-100 transition-all hover:border-indigo-500 hover:text-indigo-600 sm:opacity-0 sm:group-hover/insert:opacity-100"
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
                <div className="relative h-14 rounded-sm mb-2 overflow-hidden border border-slate-800/60 bg-[#020203]">
                  <BuiltinStyleThumbnail styleId={s.id} />
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
  inheritFrom,
}: {
  value: TypographyOverrides;
  onChange: (v: TypographyOverrides) => void;
  inheritFrom: TypographyOverrides;
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
          inheritFrom={inheritFrom}
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
