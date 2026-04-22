"use client";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  title?: ReactNode;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  light?: boolean;
  border?: boolean;
  transparent?: boolean;
}

export function TopBar({
  title,
  subtitle,
  back,
  onBack,
  right,
  light = false,
  border = true,
  transparent = false,
}: Props) {
  const router = useRouter();
  const color = light ? "text-white" : "text-ink-800";
  return (
    <div
      className={cn(
        "flex-shrink-0 px-4 pb-3 flex items-center gap-2 relative",
        !transparent && (light ? "" : "bg-white"),
        border && !transparent && "border-b border-sand-200",
      )}
    >
      {back && (
        <button
          onClick={() => (onBack ? onBack() : router.back())}
          className={cn(
            "w-9 h-9 rounded-full border-0 flex items-center justify-center flex-shrink-0 transition active:scale-95",
            light ? "bg-white/15 text-white" : "bg-sand-100 text-ink-800",
          )}
          aria-label="Atrás"
        >
          <Icon name="back" size={18} stroke={2.2} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        {title && (
          <div className={cn("font-bold text-[17px] leading-tight tracking-tight truncate", color)}>
            {title}
          </div>
        )}
        {subtitle && (
          <div
            className={cn(
              "text-[12px] mt-0.5 truncate",
              light ? "text-white/70" : "text-ink-400",
            )}
          >
            {subtitle}
          </div>
        )}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}
