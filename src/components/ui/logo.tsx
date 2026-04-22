import { cn } from "@/lib/utils";

interface Props {
  size?: number;
  light?: boolean;
  compact?: boolean;
  className?: string;
}

export function Logo({ size = 32, light = false, compact = false, className }: Props) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center shadow-coral",
          light ? "bg-white/20" : "bg-coral-500",
        )}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
        }}
      >
        <svg
          width={size * 0.6}
          height={size * 0.6}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3z" />
          <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
        </svg>
      </div>
      {!compact && (
        <span
          style={{ fontSize: size * 0.65 }}
          className={cn(
            "font-extrabold tracking-tight",
            light ? "text-white" : "text-ink-900",
          )}
        >
          arranxos
        </span>
      )}
    </div>
  );
}
