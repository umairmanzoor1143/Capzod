"use client";

import { cn } from "@/lib/utils";
import React, { ReactElement, useCallback, useEffect, useRef } from "react";

export interface MagicCardProps {
  children?: React.ReactNode;
  className?: string;
  gradientSize?: number;
  gradientColor?: string;
  gradientOpacity?: number;
  gradientFrom?: string;
  gradientTo?: string;
}

export function MagicCard({
  children,
  className,
  gradientSize = 200,
  gradientColor = "#D9D9D955",
  gradientOpacity = 0.8,
  gradientFrom = "#9E7AFF",
  gradientTo = "#FE8BBB"
}: MagicCardProps): ReactElement {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!cardRef.current) return;
      const { left, top } = cardRef.current.getBoundingClientRect();
      const x = e.clientX - left;
      const y = e.clientY - top;
      cardRef.current.style.setProperty("--mouse-x", `${x}px`);
      cardRef.current.style.setProperty("--mouse-y", `${y}px`);
    },
    []
  );

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    node.addEventListener("mousemove", handleMouseMove);
    return () => node.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  return (
    <div
      ref={cardRef}
      className={cn(
        "group relative flex size-full overflow-hidden rounded-xl bg-white text-black dark:bg-zinc-900 dark:text-white",
        className
      )}
      style={
        {
          "--gradient-size": `${gradientSize}px`,
          "--gradient-color": gradientColor,
          "--gradient-opacity": gradientOpacity,
          "--gradient-from": gradientFrom,
          "--gradient-to": gradientTo
        } as React.CSSProperties
      }
    >
      <div className="relative z-10 w-full">{children}</div>
      <div
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(var(--gradient-size) circle at var(--mouse-x) var(--mouse-y), var(--gradient-color), transparent 100%)"
        }}
      />
      <div
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(var(--gradient-size) circle at var(--mouse-x) var(--mouse-y), var(--gradient-from), var(--gradient-to), transparent 100%)",
          opacity: "var(--gradient-opacity)",
          maskImage: "linear-gradient(white,white)",
          WebkitMaskImage: "linear-gradient(white,white)"
        }}
      />
    </div>
  );
}
