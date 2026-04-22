import Link from "next/link";

interface Props {
  title: string;
  action?: string;
  href?: string;
  onClick?: () => void;
}

export function SectionHeading({ title, action, href, onClick }: Props) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="font-bold text-[15px] text-ink-800 tracking-tight">{title}</span>
      {action && href && (
        <Link href={href} className="text-[13px] font-semibold text-coral-600">
          {action}
        </Link>
      )}
      {action && onClick && (
        <button onClick={onClick} className="text-[13px] font-semibold text-coral-600">
          {action}
        </button>
      )}
    </div>
  );
}
