import { cn } from "@/lib/utils";

interface Props {
  value: number;
  size?: number;
  className?: string;
}

export function RatingStars({ value, size = 13, className }: Props) {
  const filled = Math.round(value);
  return (
    <span className={cn("inline-flex text-amber-500", className)} style={{ fontSize: size, letterSpacing: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i}>{i < filled ? "★" : "☆"}</span>
      ))}
    </span>
  );
}
