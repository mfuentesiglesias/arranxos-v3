import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  note?: string;
  wrapperClassName?: string;
}

export function Input({
  label,
  note,
  wrapperClassName,
  className,
  ...rest
}: InputProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
      {label && (
        <label className="text-[13px] font-semibold text-ink-500">
          {label}
        </label>
      )}
      <input className={cn("input-base", className)} {...rest} />
      {note && <span className="text-[11px] text-ink-400">{note}</span>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  note?: string;
  wrapperClassName?: string;
}

export function Textarea({
  label,
  note,
  wrapperClassName,
  className,
  ...rest
}: TextareaProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
      {label && (
        <label className="text-[13px] font-semibold text-ink-500">
          {label}
        </label>
      )}
      <textarea
        className={cn("input-base resize-y min-h-[90px]", className)}
        {...rest}
      />
      {note && <span className="text-[11px] text-ink-400">{note}</span>}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  note?: string;
  wrapperClassName?: string;
  children: ReactNode;
}

export function Select({
  label,
  note,
  wrapperClassName,
  className,
  children,
  ...rest
}: SelectProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
      {label && (
        <label className="text-[13px] font-semibold text-ink-500">
          {label}
        </label>
      )}
      <select className={cn("input-base appearance-none", className)} {...rest}>
        {children}
      </select>
      {note && <span className="text-[11px] text-ink-400">{note}</span>}
    </div>
  );
}
