import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
  padded?: boolean;
}

export function Card({ children, className, onClick, href, padded = true }: Props) {
  const base = cn(
    "rounded-2xl bg-white border border-sand-200/70 shadow-card transition",
    padded && "p-4",
    (onClick || href) && "cursor-pointer hover:shadow-cardHover hover:border-sand-300/70",
    className,
  );
  if (href)
    return (
      <Link href={href} className={base}>
        {children}
      </Link>
    );
  if (onClick)
    return (
      <div onClick={onClick} className={base}>
        {children}
      </div>
    );
  return <div className={base}>{children}</div>;
}
