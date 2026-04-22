import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "dark";

const variants: Record<Variant, string> = {
  primary:
    "bg-coral-500 text-white shadow-coral hover:bg-coral-600 active:scale-[0.98]",
  secondary:
    "bg-sand-100 text-ink-700 hover:bg-sand-200 active:scale-[0.98]",
  outline:
    "border-[1.5px] border-sand-200 bg-white text-ink-700 hover:bg-sand-50 active:scale-[0.98]",
  ghost: "text-ink-500 hover:bg-sand-100 active:scale-[0.98]",
  danger:
    "bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-[0.98]",
  dark: "bg-ink-800 text-white hover:bg-ink-900 active:scale-[0.98]",
};

interface Props {
  children: ReactNode;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  full?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
  className?: string;
  type?: "button" | "submit";
  icon?: ReactNode;
}

const sizes = {
  sm: "px-3.5 py-2 text-[13px] rounded-full font-semibold",
  md: "px-5 py-3 text-[15px] rounded-full font-bold",
  lg: "px-6 py-3.5 text-[16px] rounded-full font-bold",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  full,
  disabled,
  onClick,
  href,
  className,
  type = "button",
  icon,
}: Props) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:pointer-events-none",
    sizes[size],
    variants[variant],
    full && "w-full",
    className,
  );
  if (href)
    return (
      <Link href={href} className={cls} aria-disabled={disabled}>
        {icon}
        {children}
      </Link>
    );
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {icon}
      {children}
    </button>
  );
}
