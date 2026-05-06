"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function AnimatedGradientText({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative mx-auto flex max-w-fit flex-row items-center justify-center rounded-2xl bg-white/40 px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#8fdfff1f] backdrop-blur-sm transition-shadow duration-500 ease-out hover:shadow-[inset_0_-5px_10px_#8fdfff3f] dark:bg-black/40",
        className
      )}
    >
      <div
        className="absolute inset-0 block h-full w-full animate-gradient bg-gradient-to-r from-[#9c40ff]/50 via-[#5c2de0]/50 to-[#9c40ff]/50 bg-[length:var(--bg-size)_100%] p-[1px] [border-radius:inherit] [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] ![mask-composite:subtract]"
        style={{ "--bg-size": "300%" } as React.CSSProperties}
      />
      {children}
    </div>
  );
}
