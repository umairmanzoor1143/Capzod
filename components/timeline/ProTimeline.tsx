"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Plus, ZoomIn, ZoomOut, Type, Lock, Maximize } from "lucide-react";
import type { SubtitleItem } from "@/lib/subtitles";

const minClipDuration = 0.25;
const epsilon = 0.01;
const MIN_ZOOM = 20;
const MAX_ZOOM = 400;

type DragMode = "move" | "start" | "end";

interface ProTimelineProps {
  subtitles: SubtitleItem[];
  selectedId: string;
  duration: number;
  currentTime?: number;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<SubtitleItem>) => void;
  onSeek?: (time: number) => void;
  onAdd?: () => void;
}

function fmt(time: number) {
  const t = Math.max(0, time);
  const m = Math.floor(t / 60).toString().padStart(2, "0");
  const s = Math.floor(t % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function pickTicks(pxPerSec: number) {
  const candidates = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
  const minPxBetweenLabels = 70;
  const major =
    candidates.find((c) => c * pxPerSec >= minPxBetweenLabels) ?? candidates[candidates.length - 1];
  const minor = major / 5;
  return { major, minor };
}

export function ProTimeline({
  subtitles,
  selectedId,
  duration,
  currentTime = 0,
  onSelect,
  onUpdate,
  onSeek,
  onAdd,
}: ProTimelineProps) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState(800);
  const [zoom, setZoom] = React.useState<number | null>(null); // null = auto-fit

  const totalDuration = Math.max(duration + 1, 6);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitZoom = React.useMemo(() => {
    const w = Math.max(200, containerWidth - 8);
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, w / totalDuration));
  }, [containerWidth, totalDuration]);

  const effectiveZoom = zoom ?? fitZoom;
  const isFit = zoom === null;

  const totalWidth = Math.max(totalDuration * effectiveZoom, containerWidth);
  const { major, minor } = pickTicks(effectiveZoom);

  const ticks = React.useMemo(() => {
    const list: { sec: number; major: boolean }[] = [];
    const count = Math.ceil(totalDuration / minor);
    for (let i = 0; i <= count; i++) {
      const sec = Number((i * minor).toFixed(3));
      const isMajor = Math.abs(sec / major - Math.round(sec / major)) < 0.0001;
      list.push({ sec, major: isMajor });
    }
    return list;
  }, [major, minor, totalDuration]);

  const sorted = React.useMemo(
    () => [...subtitles].sort((a, b) => a.start - b.start),
    [subtitles]
  );

  function pointerToSeconds(clientX: number) {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.max(0, Math.min(totalDuration, x / effectiveZoom));
  }

  function getNeighborBounds(subtitle: SubtitleItem) {
    const idx = sorted.findIndex((s) => s.id === subtitle.id);
    const prev = idx > 0 ? sorted[idx - 1] : undefined;
    const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : undefined;
    return {
      minStart: prev ? prev.end + epsilon : 0,
      maxEnd: next ? next.start - epsilon : Number.POSITIVE_INFINITY,
    };
  }

  function beginDrag(subtitle: SubtitleItem, mode: DragMode, event: React.PointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    const originSecond = pointerToSeconds(event.clientX);
    const original = { ...subtitle };
    const { minStart, maxEnd } = getNeighborBounds(subtitle);

    const onMove = (e: PointerEvent) => {
      const next = pointerToSeconds(e.clientX);
      const delta = next - originSecond;
      const dur = original.end - original.start;

      if (mode === "move") {
        let start = original.start + delta;
        const cap = isFinite(maxEnd) ? maxEnd - dur : Number.POSITIVE_INFINITY;
        start = Math.max(minStart, Math.min(start, cap));
        const end = start + dur;
        onUpdate(original.id, {
          start: Number(start.toFixed(3)),
          end: Number(end.toFixed(3)),
        });
      } else if (mode === "start") {
        let start = original.start + delta;
        start = Math.max(minStart, Math.min(start, original.end - minClipDuration));
        onUpdate(original.id, { start: Number(start.toFixed(3)), end: original.end });
      } else if (mode === "end") {
        let end = original.end + delta;
        end = Math.max(original.start + minClipDuration, end);
        if (isFinite(maxEnd)) end = Math.min(end, maxEnd);
        onUpdate(original.id, { start: original.start, end: Number(end.toFixed(3)) });
      }
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handleRulerClick(event: React.MouseEvent) {
    onSeek?.(pointerToSeconds(event.clientX));
  }

  function handleTrackClick(event: React.MouseEvent) {
    onSeek?.(pointerToSeconds(event.clientX));
  }

  function handleWheelZoom(event: React.WheelEvent) {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    setZoom((z) => {
      const base = z ?? fitZoom;
      return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, base - event.deltaY * 0.4));
    });
  }

  function bumpZoom(delta: number) {
    setZoom((z) => {
      const base = z ?? fitZoom;
      return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, base + delta));
    });
  }

  function resetFit() {
    setZoom(null);
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }

  React.useEffect(() => {
    if (isFit) return;
    const el = scrollRef.current;
    if (!el) return;
    const px = currentTime * effectiveZoom;
    const left = el.scrollLeft;
    const right = left + el.clientWidth;
    if (px < left + 40) {
      el.scrollLeft = Math.max(0, px - 40);
    } else if (px > right - 80) {
      el.scrollLeft = px - el.clientWidth + 80;
    }
  }, [currentTime, effectiveZoom, isFit]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-800">
      {/* Toolbar */}
      <div className="flex min-h-10 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-2 py-1.5 sm:h-10 sm:flex-nowrap sm:px-3 sm:py-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAdd?.()}
            className="flex items-center gap-1.5 rounded-md px-2 h-7 text-xs font-semibold text-slate-600 hover:bg-white hover:text-indigo-600 transition-colors"
          >
            <Plus className="size-3.5" /> Add
          </button>
          <div className="mx-1 h-4 w-px bg-slate-200" />
          <span className="font-mono text-xs font-bold tabular-nums text-indigo-600">
            {fmt(currentTime)}
          </span>
          <span className="px-0.5 text-xs text-slate-400">/</span>
          <span className="font-mono text-xs font-medium tabular-nums text-slate-500">
            {fmt(duration)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={resetFit}
            className={cn(
              "flex items-center gap-1 rounded-md border px-2 h-6 text-[10px] font-bold uppercase tracking-wide transition-colors",
              isFit
                ? "border-indigo-200 bg-indigo-50 text-indigo-600"
                : "border-slate-200 bg-white text-slate-500 hover:text-slate-900"
            )}
            title="Fit timeline to view"
          >
            <Maximize className="size-3" /> Fit
          </button>
          <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-0.5">
            <button
              onClick={() => bumpZoom(-20)}
              className="grid h-6 w-6 place-items-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <ZoomOut className="size-3" />
            </button>
            <span className="min-w-[40px] text-center font-mono text-[10px] font-bold tabular-nums text-slate-600">
              {Math.round(effectiveZoom)}px
            </span>
            <button
              onClick={() => bumpZoom(20)}
              className="grid h-6 w-6 place-items-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <ZoomIn className="size-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 overflow-hidden bg-white">
        <div
          className="flex w-[4.5rem] shrink-0 flex-col border-r border-slate-200 bg-slate-50 z-10 sm:w-24 lg:w-[140px]"
        >
          <div className="h-9 border-b border-slate-200" />
          <div className="flex h-16 items-center justify-between border-b border-slate-200 px-2 sm:px-4">
            <div className="flex min-w-0 items-center gap-1.5 text-slate-600 sm:gap-2">
              <Type size={14} className="shrink-0" />
              <span className="truncate text-[11px] font-semibold sm:text-xs">Subtitles</span>
            </div>
            <button>
              <Lock size={12} className="text-slate-400" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          onWheel={handleWheelZoom}
          onClick={handleTrackClick}
          className={cn(
            "scroll-thin relative min-w-0 flex-1 overflow-y-hidden bg-white",
            isFit ? "overflow-x-hidden" : "overflow-x-auto"
          )}
        >
          <div ref={trackRef} className="relative h-full" style={{ width: totalWidth }}>
            <div
              onClick={handleRulerClick}
              className="sticky top-0 z-30 h-9 w-full cursor-crosshair border-b border-slate-200 bg-white"
            >
              <div className="relative h-full">
                {ticks.map((tick) => (
                  <div
                    key={tick.sec}
                    className={cn(
                      "absolute bottom-0",
                      tick.major ? "h-3 w-px bg-slate-300" : "h-1.5 w-px bg-slate-200"
                    )}
                    style={{ left: tick.sec * effectiveZoom }}
                  />
                ))}
                {ticks
                  .filter((t) => t.major)
                  .map((tick) => (
                    <span
                      key={`l-${tick.sec}`}
                      className="absolute top-1.5 -translate-x-1/2 font-mono text-[10px] font-medium text-slate-400"
                      style={{ left: tick.sec * effectiveZoom }}
                    >
                      {fmt(tick.sec)}
                    </span>
                  ))}
              </div>
            </div>

            <div className="relative h-16 border-b border-slate-200 bg-slate-50/40">
              {ticks.map((tick) => (
                <div
                  key={`g-${tick.sec}`}
                  className={cn(
                    "absolute top-0 bottom-0 w-px",
                    tick.major ? "bg-slate-200" : "bg-slate-100"
                  )}
                  style={{ left: tick.sec * effectiveZoom }}
                />
              ))}

              {subtitles.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xs text-slate-400">
                    No subtitles yet — click Add to create one
                  </span>
                </div>
              )}

              {subtitles.map((subtitle) => {
                const left = subtitle.start * effectiveZoom;
                const width = Math.max(8, (subtitle.end - subtitle.start) * effectiveZoom);
                const selected = subtitle.id === selectedId;
                return (
                  <div
                    key={subtitle.id}
                    onPointerDown={(e) => beginDrag(subtitle, "move", e)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(subtitle.id);
                    }}
                    className={cn(
                      "group/clip absolute top-2 flex h-12 cursor-grab items-center overflow-hidden rounded-md border text-left transition-colors active:cursor-grabbing z-20",
                      selected
                        ? "border-indigo-700 bg-indigo-600 text-white ring-1 ring-indigo-400"
                        : "border-indigo-200 bg-white hover:bg-indigo-50 text-slate-800"
                    )}
                    style={{ left, width, willChange: "left, width" }}
                  >
                    <button
                      onPointerDown={(e) => beginDrag(subtitle, "start", e)}
                      className={cn(
                        "absolute left-0 top-0 z-10 h-full w-1.5 cursor-ew-resize",
                        selected
                          ? "bg-white/50"
                          : "bg-indigo-400/40 opacity-0 group-hover/clip:opacity-100"
                      )}
                      aria-label="Trim start"
                    />
                    <div className="relative z-[1] flex h-full w-full min-w-0 items-center gap-2 pl-2.5 pr-3 text-xs">
                      <span
                        className={cn(
                          "grid h-4 px-1 shrink-0 place-items-center rounded border text-[10px] tabular-nums",
                          selected
                            ? "bg-indigo-500 border-indigo-300 text-white"
                            : "bg-indigo-50 border-indigo-200 text-indigo-600"
                        )}
                      >
                        <Type size={9} />
                      </span>
                      <span
                        className={cn(
                          "truncate font-medium",
                          selected ? "text-white" : "text-slate-700"
                        )}
                      >
                        {subtitle.text || (
                          <span className="italic opacity-60">Empty</span>
                        )}
                      </span>
                    </div>
                    <button
                      onPointerDown={(e) => beginDrag(subtitle, "end", e)}
                      className={cn(
                        "absolute right-0 top-0 z-10 h-full w-1.5 cursor-ew-resize",
                        selected
                          ? "bg-white/50"
                          : "bg-indigo-400/40 opacity-0 group-hover/clip:opacity-100"
                      )}
                      aria-label="Trim end"
                    />
                  </div>
                );
              })}
            </div>

            <div
              className="pointer-events-none absolute top-0 bottom-0 z-[100]"
              style={{ left: currentTime * effectiveZoom, willChange: "left" }}
            >
              <div className="absolute top-0 -ml-[5px] h-9 w-2.5 rounded-b-sm bg-indigo-600" />
              <div className="absolute top-9 bottom-0 left-0 w-px bg-indigo-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
