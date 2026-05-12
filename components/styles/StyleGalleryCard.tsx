"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {Check, Download, Loader2, Pencil, Play, Trash2} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import type {CommunitySubtitleStyle} from "@/lib/community-styles";
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

  return (
    <Card
      className="group relative overflow-hidden border-slate-200 bg-white p-0 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
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
          <Stats createdAt={style.createdAt} />
          <ActionButton action={action} />
        </div>
      </div>
    </Card>
  );
}

function Stats({createdAt}: {createdAt: string}) {
  const seed = new Date(createdAt).getTime();
  const downloads = 100 + (seed % 4900);
  const likes = 20 + (seed % 480);
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));
  return (
    <div className="flex items-center gap-2.5 text-[11px] text-slate-500">
      <span className="inline-flex items-center gap-1">
        <Download className="size-3" />
        {fmt(downloads)}
      </span>
      <span className="inline-flex items-center gap-1">
        <Heart />
        {likes}
      </span>
    </div>
  );
}

function Heart() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
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
