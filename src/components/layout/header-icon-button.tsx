"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  light?: boolean;
  className?: string;
}

export function HeaderIconButton({
  label,
  onClick,
  children,
  light = false,
  className,
}: Props) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full transition active:scale-[0.98]",
        light ? "bg-white/20 text-white" : "bg-sand-100 text-ink-700",
        className,
      )}
    >
      {children}
    </button>
  );
}
