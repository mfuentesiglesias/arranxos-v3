import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  white?: boolean;
}

export function ScreenBody({ children, className, padded = false, white = false }: Props) {
  return (
    <div
      className={cn(
        "app-scroll flex-1 min-h-0",
        white ? "bg-white" : "bg-sand-50",
      )}
    >
      <div className={cn("min-h-full", padded && "p-4", className)}>{children}</div>
      <div className="app-scroll-body-spacer" aria-hidden="true" />
    </div>
  );
}

export function Screen({ children, className, white = false }: Props) {
  return (
    <div
      className={cn(
        "flex-1 min-h-0 flex flex-col overflow-hidden",
        white ? "bg-white" : "bg-sand-50",
        className,
      )}
    >
      {children}
    </div>
  );
}
