"use client";

import { Check, Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getCommunityStyleAccent,
  getCommunityStylePreviewClass,
  type CommunitySubtitleStyle,
} from "@/lib/community-styles";
import { cn } from "@/lib/utils";

export function CommunityStylePreview({
  style,
  active = false,
  compact = false,
  importing = false,
  action,
  onClick,
}: {
  style: CommunitySubtitleStyle;
  active?: boolean;
  compact?: boolean;
  importing?: boolean;
  action?: "import" | "imported" | "select" | "none";
  onClick?: () => void;
}) {
  const accent = getCommunityStyleAccent(style);
  const previewClass = getCommunityStylePreviewClass(style);

  return (
    <Card
      onClick={onClick}
      className={cn(
        "group relative rounded-md border shadow-none transition-all overflow-hidden",
        onClick && "cursor-pointer",
        compact ? "p-2" : "p-3",
        active
          ? "border-primary ring-2 ring-primary/30 bg-primary/5"
          : "border-input hover:border-slate-300"
      )}
    >
      <div
        className={cn(
          "rounded-sm flex items-center justify-center px-3",
          compact ? "h-14 mb-2" : "h-24 mb-3"
        )}
        style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)" }}
      >
        <span
          className={cn(
            "leading-none truncate w-full text-center",
            compact ? "text-[11px]" : "text-sm",
            previewClass
          )}
          style={{
            color: accent,
            fontFamily: style.typography.fontFamily,
            fontWeight: style.typography.fontWeight,
            letterSpacing: style.typography.letterSpacing,
            textTransform: style.typography.textTransform,
            background: style.behavior.background,
            boxShadow: style.behavior.boxShadow,
            textShadow: style.behavior.textShadow,
            WebkitTextStroke: style.behavior.stroke,
            borderRadius: style.behavior.radius,
            padding: style.behavior.padding,
          }}
        >
          {style.name.toUpperCase()}
        </span>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                "font-semibold truncate",
                compact ? "text-[11px]" : "text-sm",
                active ? "text-primary" : "text-slate-800"
              )}
            >
              {style.name}
            </span>
            {style.status !== "approved" && (
              <Badge variant="outline" className="h-4 px-1.5 text-[9px] uppercase">
                {style.status}
              </Badge>
            )}
          </div>
          {!compact && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {style.description || "A custom creator subtitle style."}
            </p>
          )}
          <p className="text-[10px] text-slate-400 mt-1 truncate">
            by {style.authorName}
          </p>
        </div>

        {active && (
          <span className="shrink-0 grid place-items-center w-4 h-4 rounded-full bg-primary text-primary-foreground">
            <Check size={10} />
          </span>
        )}
      </div>

      {action && action !== "none" && (
        <Button
          type="button"
          size="sm"
          variant={action === "imported" ? "secondary" : "default"}
          disabled={action === "imported" || importing}
          onClick={(event) => {
            event.stopPropagation();
            onClick?.();
          }}
          className="mt-3 w-full h-8 text-xs"
        >
          {importing ? (
            <Loader2 className="size-3 animate-spin" />
          ) : action === "imported" ? (
            <Check className="size-3" />
          ) : (
            <Download className="size-3" />
          )}
          {action === "imported" ? "Imported" : "Import style"}
        </Button>
      )}
    </Card>
  );
}
