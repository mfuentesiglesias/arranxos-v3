import type { JobStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS: { key: JobStatus | "after"; label: string }[] = [
  { key: "published", label: "Publicado" },
  { key: "agreement_pending", label: "Negociando" },
  { key: "agreed", label: "Acordado" },
  { key: "escrow_funded", label: "Pago protegido" },
  { key: "in_progress", label: "En curso" },
  { key: "completed_pending_confirmation", label: "Confirmando" },
  { key: "completed", label: "Completado" },
];

const ORDER: JobStatus[] = STEPS.map((s) => s.key as JobStatus);

export function JobStatusTimeline({ status }: { status: JobStatus }) {
  if (status === "cancelled" || status === "dispute") {
    const tone =
      status === "cancelled"
        ? "bg-sand-100 text-ink-600"
        : "bg-rose-50 text-rose-700";
    return (
      <div className={cn("rounded-xl px-4 py-3 text-[13px] font-semibold", tone)}>
        {status === "cancelled" ? "Trabajo cancelado" : "Disputa abierta · pendiente de resolución"}
      </div>
    );
  }
  const currentIdx = ORDER.indexOf(status);
  return (
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
      {STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={step.key} className="flex items-center gap-1 flex-shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                  done && "bg-teal-500 text-white",
                  active && "bg-coral-500 text-white ring-4 ring-coral-100",
                  !done && !active && "bg-sand-200 text-ink-400",
                )}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] whitespace-nowrap",
                  active ? "text-ink-800 font-bold" : "text-ink-400 font-medium",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("w-4 h-0.5 mb-4", done ? "bg-teal-500" : "bg-sand-200")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
