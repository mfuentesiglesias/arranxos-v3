export function Divider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-sand-200" />
      {label && (
        <span className="text-[12px] text-ink-400 font-medium whitespace-nowrap">
          {label}
        </span>
      )}
      <div className="flex-1 h-px bg-sand-200" />
    </div>
  );
}
