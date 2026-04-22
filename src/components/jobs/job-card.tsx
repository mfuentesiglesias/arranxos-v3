import Link from "next/link";
import type { Job } from "@/lib/types";
import { StatusBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { formatEuro } from "@/lib/utils";

interface Props {
  job: Job;
  href?: string;
  approxLocation?: boolean; // pro view before acceptance
  showDistance?: string;
}

export function JobCard({ job, href, approxLocation = false, showDistance }: Props) {
  const content = (
    <div className="card cursor-pointer px-[18px] py-[17px] transition hover:shadow-cardHover">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 text-[15px] font-bold leading-tight text-ink-800">
          {job.title}
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="mb-2 flex items-center gap-1.5 text-[12px] text-ink-400">
        <Icon name="pin" size={12} stroke={2} />
        <span className="truncate">
          {approxLocation ? job.locationApprox : job.location}
        </span>
        {showDistance && (
          <span className="whitespace-nowrap font-semibold text-coral-600">· {showDistance}</span>
        )}
        <span className="ml-auto whitespace-nowrap text-ink-400">{job.posted}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[13px] font-bold text-coral-600">
          {formatEuro(job.priceMin)}–{formatEuro(job.priceMax)}
        </span>
        <span className="text-[11px] font-medium text-ink-400">orientativo</span>
        <span className="ml-auto text-[12px] text-ink-400">
          {job.requests} solicitud{job.requests === 1 ? "" : "es"}
        </span>
      </div>
    </div>
  );
  if (href) return <Link href={href} className="block">{content}</Link>;
  return content;
}
