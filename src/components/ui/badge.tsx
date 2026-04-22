import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { JobStatus } from "@/lib/types";

interface BadgeProps {
  children: ReactNode;
  color?: "coral" | "teal" | "amber" | "rose" | "sky" | "violet" | "sand" | "ink";
  className?: string;
}

const COLORS = {
  coral: "bg-coral-50 text-coral-700",
  teal: "bg-teal-50 text-teal-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-600",
  sky: "bg-sky-50 text-sky-700",
  violet: "bg-violet-50 text-violet-700",
  sand: "bg-sand-100 text-ink-600",
  ink: "bg-ink-800 text-white",
};

export function Badge({ children, color = "sand", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap",
        COLORS[color],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const STATUS_META: Record<
  JobStatus,
  { label: string; color: BadgeProps["color"]; icon?: string }
> = {
  published: { label: "Publicado", color: "sky" },
  in_progress: { label: "En curso", color: "coral" },
  agreement_pending: { label: "Negociando", color: "amber" },
  agreed: { label: "Acordado", color: "teal" },
  escrow_funded: { label: "Pago protegido", color: "teal", icon: "🛡" },
  completed_pending_confirmation: { label: "Confirmando", color: "violet" },
  completed: { label: "Completado ✓", color: "teal" },
  dispute: { label: "Disputa", color: "rose" },
  cancelled: { label: "Cancelado", color: "sand" },
};

export function StatusBadge({ status }: { status: JobStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge color={meta.color}>
      {meta.icon && <span>{meta.icon}</span>}
      {meta.label}
    </Badge>
  );
}
