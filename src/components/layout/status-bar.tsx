import { cn } from "@/lib/utils";

export function StatusBar({ light = false }: { light?: boolean }) {
  const color = light ? "text-white" : "text-ink-800";
  const pillBg = light ? "bg-white/20" : "bg-ink-100/50";
  return (
    <div
      className={cn(
        "hidden h-11 items-center justify-between px-5 pl-5 pr-[22px] flex-shrink-0 relative z-10 lg:flex",
      )}
    >
      <span className={cn("text-[13px] font-bold tracking-tight", color)}>9:41</span>
      <div className={cn("w-[90px] h-6 rounded-full flex items-center justify-center gap-px", pillBg)}>
        <svg width="36" height="12" viewBox="0 0 36 12" className={color}>
          <rect x="0" y="3" width="5" height="9" rx="1.2" fill="currentColor" opacity="0.4" />
          <rect x="7" y="2" width="5" height="10" rx="1.2" fill="currentColor" opacity="0.6" />
          <rect x="14" y="0" width="5" height="12" rx="1.2" fill="currentColor" />
          <rect x="23" y="2" width="11" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.8" />
          <rect x="24.5" y="3.5" width="7" height="5" rx="0.8" fill="currentColor" opacity="0.8" />
          <rect x="34" y="4" width="1.5" height="4" rx="0.5" fill="currentColor" opacity="0.5" />
        </svg>
      </div>
    </div>
  );
}
