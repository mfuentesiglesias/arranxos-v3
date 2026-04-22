import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { formatEuro } from "@/lib/utils";

export function MessageBubble({
  msg,
  selfRole,
}: {
  msg: ChatMessage;
  selfRole: "client" | "pro";
}) {
  if (msg.from === "system") {
    return (
      <div className="flex justify-center my-3">
        <div
          className={cn(
            "rounded-2xl px-4 py-3 max-w-[80%] text-[13px] font-semibold flex items-center gap-2",
            msg.type === "agreement"
              ? "bg-teal-50 text-teal-700"
              : msg.type === "proposal"
              ? "bg-amber-50 text-amber-700"
              : "bg-sand-100 text-ink-600",
          )}
        >
          <Icon
            name={msg.type === "agreement" ? "shield" : msg.type === "proposal" ? "euro" : "bell"}
            size={16}
          />
          <span>
            {msg.text}
            {msg.proposalAmount && (
              <span className="ml-1 font-extrabold">{formatEuro(msg.proposalAmount)}</span>
            )}
          </span>
        </div>
      </div>
    );
  }

  const mine = msg.from === selfRole;
  return (
    <div className={cn("flex mb-2", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug",
          mine
            ? "bg-coral-500 text-white rounded-br-md"
            : "bg-white border border-sand-200 text-ink-800 rounded-bl-md",
        )}
      >
        {msg.text}
        <div
          className={cn(
            "text-[10px] mt-1 font-medium",
            mine ? "text-white/70" : "text-ink-400",
          )}
        >
          {msg.time}
          {msg.flagged && (
            <span className="ml-2 text-amber-200">⚠ revisado</span>
          )}
        </div>
      </div>
    </div>
  );
}
