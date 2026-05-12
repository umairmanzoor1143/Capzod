"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {Check, Download, Eye, Loader2, Pencil, Play, Trash2} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import type {CommunitySubtitleStyle} from "@/lib/community-styles";
import {apiRecordStyleView} from "@/lib/api";
import {cn} from "@/lib/utils";

const StylePreviewSurface = dynamic(
  () => import("./StylePreviewSurface").then((m) => m.StylePreviewSurface),
  {ssr: false}
);

type Action =
  | {kind: "import"; imported: boolean; loading?: boolean; onClick: () => void}
  | {
      kind: "edit";
      href?: string;
      onClick?: () => void;
      onDelete?: () => void;
      deleting?: boolean;
    }
  | {kind: "none"};

type BadgeTone = "indigo" | "fuchsia" | "emerald" | "amber" | "rose";

const BADGE_TONE: Record<BadgeTone, string> = {
  indigo: "bg-indigo-500 text-white border-transparent",
  fuchsia: "bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white border-transparent",
  emerald: "bg-emerald-500 text-white border-transparent",
  amber: "bg-amber-500 text-white border-transparent",
  rose: "bg-rose-500 text-white border-transparent",
};

export function StyleGalleryCard({
  style,
  badge,
  action,
  onPreview,
}: {
  style: CommunitySubtitleStyle;
  badge?: {label: string; tone: BadgeTone};
  action: Action;
  onPreview?: () => void;
}) {
  const [hovering, setHovering] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `styleView:${style.id}`;
    if (sessionStorage.getItem(key)) return;
    void apiRecordStyleView(style.id).then((ok) => {
      if (ok) sessionStorage.setItem(key, "1");
    });
  }, [style.id]);

  return (
    <Card
      className="group relative overflow-hidden border-slate-200/80 bg-white p-0 shadow-sm shadow-slate-900/[0.03] ring-1 ring-slate-900/[0.02] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-float"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        className={cn(
          "relative aspect-[16/10] overflow-hidden bg-black",
          onPreview && "cursor-pointer"
        )}
        onClick={onPreview}
      >
        <StylePreviewSurface style={style} playing={hovering} />

        {badge && (
          <Badge
            className={cn(
              "absolute left-2 top-2 z-10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md pointer-events-none",
              BADGE_TONE[badge.tone]
            )}
          >
            {badge.label}
          </Badge>
        )}

        {/* Play hint top-right */}
        <div className="absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-full bg-white/90 text-slate-800 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 pointer-events-none">
          <Play className="size-3.5 fill-current" />
        </div>
      </div>

      <div className="space-y-2 p-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-800">{style.name}</h3>
          <p className="flex items-center gap-1 truncate text-[11px] text-slate-500">
            by {style.authorName}
            <Check className="size-3 text-indigo-500" />
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Stats imports={style.importCount ?? 0} views={style.viewCount ?? 0} />
          <ActionButton action={action} />
        </div>
      </div>
    </Card>
  );
}

function Stats({views, imports}: {views: number; imports: number}) {
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));
  return (
    <div className="flex items-center gap-2.5 text-[11px] text-slate-500">
      <span className="inline-flex items-center gap-1" title="Views">
        <Eye className="size-3" />
        {fmt(views)}
      </span>
      <span className="inline-flex items-center gap-1" title="Imports">
        <Download className="size-3" />
        {fmt(imports)}
      </span>
    </div>
  );
}

function ActionButton({action}: {action: Action}) {
  if (action.kind === "none") return null;

  if (action.kind === "edit") {
    return (
      <div className="flex items-center gap-1.5">
        {action.onDelete && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={action.deleting}
            className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            aria-label="Delete style"
            onClick={(e) => {
              e.stopPropagation();
              action.onDelete?.();
            }}
          >
            {action.deleting ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Trash2 className="size-3" />
            )}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2.5 text-[11px]"
          onClick={(e) => {
            e.stopPropagation();
            action.onClick?.();
          }}
        >
          <Pencil className="size-3" />
          Edit
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant={action.imported ? "secondary" : "outline"}
      size="sm"
      disabled={action.imported || action.loading}
      onClick={(e) => {
        e.stopPropagation();
        action.onClick();
      }}
      className={cn(
        "h-7 gap-1 px-2.5 text-[11px]",
        action.imported && "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
      )}
    >
      {action.loading ? (
        <Loader2 className="size-3 animate-spin" />
      ) : action.imported ? (
        <Check className="size-3" />
      ) : (
        <Download className="size-3" />
      )}
      {action.imported ? "Imported" : "Import"}
    </Button>
  );
}
