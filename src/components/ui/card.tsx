import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
  padded?: boolean;
  testId?: string;
}

export function Card({ children, className, onClick, href, padded = true, testId }: Props) {
  const base = cn(
    "rounded-2xl bg-white border border-sand-200/70 shadow-card transition",
    padded && "p-4",
    (onClick || href) && "cursor-pointer hover:shadow-cardHover hover:border-sand-300/70",
    className,
  );
  if (href)
    return (
      <Link href={href} className={base} data-testid={testId}>
        {children}
      </Link>
    );
  if (onClick)
    return (
      <div onClick={onClick} className={base} data-testid={testId}>
        {children}
      </div>
    );
  return <div className={base} data-testid={testId}>{children}</div>;
}
