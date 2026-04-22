import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

interface Props {
  strikes: number;
  threshold?: number;
  compact?: boolean;
}

export function StrikeBadge({ strikes, threshold = 3, compact = false }: Props) {
  if (strikes === 0) {
    return compact ? null : (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 rounded-full px-2 py-0.5">
        <Icon name="shield" size={12} stroke={2.2} />
        Sin strikes
      </span>
    );
  }
  const severity = strikes >= threshold ? "rose" : strikes >= 2 ? "amber" : "sand";
  const cls =
    severity === "rose"
      ? "text-rose-600 bg-rose-50"
      : severity === "amber"
      ? "text-amber-700 bg-amber-50"
      : "text-ink-600 bg-sand-100";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5",
        cls,
      )}
    >
      <Icon name="alert" size={12} stroke={2.2} />
      {strikes} strike{strikes !== 1 ? "s" : ""}
    </span>
  );
}
