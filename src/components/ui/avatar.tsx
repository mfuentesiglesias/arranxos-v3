import { cn } from "@/lib/utils";

const PALETTE = [
  { bg: "bg-coral-100", text: "text-coral-700" },
  { bg: "bg-teal-100", text: "text-teal-700" },
  { bg: "bg-sand-200", text: "text-ink-700" },
  { bg: "bg-sky-100", text: "text-sky-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
];

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface Props {
  initials: string;
  size?: number;
  className?: string;
}

export function Avatar({ initials, size = 40, className }: Props) {
  const { bg, text } = PALETTE[hash(initials) % PALETTE.length];
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold flex-shrink-0",
        bg,
        text,
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.floor(size * 0.36),
        letterSpacing: "-0.5px",
      }}
    >
      {initials}
    </div>
  );
}
