import Link from "next/link";
import type { Professional } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { RatingStars } from "./rating-stars";
import { VerifiedDot } from "./verified-dot";

interface Props {
  pro: Professional;
  href?: string;
  onClick?: () => void;
  showDistance?: boolean;
}

export function ProCard({ pro, href, onClick, showDistance = true }: Props) {
  const content = (
    <div className="card flex gap-3 items-start cursor-pointer hover:shadow-cardHover transition">
      <div className="relative flex-shrink-0">
        <Avatar initials={pro.avatar} size={48} />
        {pro.verified && <VerifiedDot size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="font-bold text-[15px] text-ink-800 truncate">
            {pro.name}
          </div>
          {pro.badge && (
            <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
              {pro.badge}
            </span>
          )}
        </div>
        <div className="text-[13px] text-ink-500 mb-1.5">
          {pro.specialty} · {pro.location}
        </div>
        {pro.rating > 0 ? (
          <div className="flex items-center gap-1.5">
            <RatingStars value={pro.rating} />
            <span className="text-[12px] font-bold text-ink-800">
              {pro.rating.toFixed(1)}
            </span>
            <span className="text-[12px] text-ink-400">
              ({pro.reviews} reseñas)
            </span>
            {showDistance && pro.distance && (
              <span className="ml-auto text-[12px] text-coral-600 font-semibold">
                {pro.distance}
              </span>
            )}
          </div>
        ) : (
          <div className="text-[12px] text-ink-400 italic">
            Nuevo profesional, sin reseñas aún
          </div>
        )}
      </div>
    </div>
  );

  if (href) return <Link href={href} className="block">{content}</Link>;
  if (onClick) return <div onClick={onClick}>{content}</div>;
  return content;
}
