"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import type { ReactNode } from "react";

interface HeaderActionItem {
  label: string;
  description?: string;
  icon?: string;
  href?: string;
  onClick?: () => void;
}

interface Props {
  open: boolean;
  title: string;
  description?: string;
  items?: HeaderActionItem[];
  onClose: () => void;
  children?: ReactNode;
}

export function HeaderActionSheet({
  open,
  title,
  description,
  items = [],
  onClose,
  children,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[350] bg-black/45" onClick={onClose}>
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 shadow-cardHover animate-slideUp md:left-1/2 md:right-auto md:top-1/2 md:bottom-auto md:w-[360px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[16px] text-ink-800 tracking-tight">{title}</div>
            {description && (
              <div className="mt-1 text-[12px] leading-snug text-ink-400">{description}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-sand-100 text-ink-600 active:scale-[0.98]"
            aria-label="Cerrar panel"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {items.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-sand-200/70 bg-sand-50/70">
            {items.map((item, index) => {
              const content = (
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 text-left active:bg-sand-100/80",
                    index !== items.length - 1 && "border-b border-sand-200/70",
                  )}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-ink-600 shadow-card">
                    <Icon name={item.icon ?? "info"} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-ink-800">{item.label}</div>
                    {item.description && (
                      <div className="mt-0.5 text-[11.5px] leading-snug text-ink-400">
                        {item.description}
                      </div>
                    )}
                  </div>
                  {item.href && <Icon name="forward" size={14} className="text-ink-400" />}
                </div>
              );

              if (item.href) {
                return (
                  <Link key={item.label} href={item.href} onClick={onClose}>
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={item.label}
                  onClick={() => {
                    item.onClick?.();
                    onClose();
                  }}
                  className="w-full"
                >
                  {content}
                </button>
              );
            })}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
