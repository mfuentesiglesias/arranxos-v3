"use client";
import { useMemo, useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { RatingStars } from "@/components/pros/rating-stars";
import { StrikeBadge } from "@/components/pros/strike-badge";
import { Button } from "@/components/ui/button";
import { defaultAdminConfig } from "@/lib/data";
import { getProfessionalReliabilitySummary } from "@/lib/reliability";
import {
  getEffectiveJobs,
  getEffectiveProfessionals,
  getReviewsForProfessional,
  useSession,
} from "@/lib/store";
import type { ProStatus } from "@/lib/types";

export default function AdminProsPage() {
  const [filter, setFilter] = useState<ProStatus | "all">("pending");
  const [q, setQ] = useState("");
  const session = useSession();
  const effectiveJobs = useMemo(() => getEffectiveJobs(session), [session]);
  const effectiveProfessionals = useMemo(() => getEffectiveProfessionals(session), [session]);
  const setProfessionalStatus = useSession((s) => s.setProfessionalStatus);

  const filtered = effectiveProfessionals.filter((p) => {
    const ms = filter === "all" || p.status === filter;
    const mq =
      !q ||
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.specialty.toLowerCase().includes(q.toLowerCase()) ||
      p.location.toLowerCase().includes(q.toLowerCase());
    return ms && mq;
  });

  const counts = {
    pending: effectiveProfessionals.filter((p) => p.status === "pending").length,
    approved: effectiveProfessionals.filter((p) => p.status === "approved").length,
    blocked: effectiveProfessionals.filter((p) => p.status === "blocked").length,
  };

  const TABS: { id: ProStatus | "all"; label: string; count?: number }[] = [
    { id: "pending", label: "Pendientes", count: counts.pending },
    { id: "approved", label: "Aprobados", count: counts.approved },
    { id: "blocked", label: "Bloqueados", count: counts.blocked },
    { id: "all", label: "Todos", count: effectiveProfessionals.length },
  ];

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Profesionales" subtitle={`${effectiveProfessionals.length} totales`} />
      <ScreenBody className="px-4 pt-3 pb-6">
        <div className="flex items-center gap-2 bg-white rounded-2xl px-3.5 py-2.5 mb-3 border border-sand-200/70">
          <Icon name="search" size={16} stroke={2.2} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar nombre, especialidad…"
            className="flex-1 bg-transparent outline-none text-[14px] text-ink-800 placeholder:text-ink-400"
          />
        </div>
        <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => {
            const sel = filter === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border-[1.5px] whitespace-nowrap ${
                  sel
                    ? "border-coral-500 bg-coral-50 text-coral-700"
                    : "border-sand-200 text-ink-500 bg-white"
                }`}
              >
                {t.label}
                {t.count !== undefined && (
                  <span className={sel ? "text-coral-500" : "text-ink-400"}>
                    {" "}
                    · {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <Card className="mb-3 border-sand-200/70 bg-sand-100/70">
          <div className="text-[12px] text-ink-600 leading-snug">
            La fiabilidad mostrada aqui es un score mock/demo derivado. No cambia
            permisos, no crea bloqueos automaticos y no altera el ranking real.
          </div>
        </Card>

        <div className="flex flex-col gap-2">
          {filtered.map((p) => {
            const reliability = getProfessionalReliabilitySummary({
              professional: p,
              reviews: getReviewsForProfessional(session, p.id),
              jobs: effectiveJobs,
              disputes: session.disputes,
            });

            return (
              <Card key={p.id} className="!p-3" testId={`admin-professional-card-${p.id}`}>
                <div className="flex items-start gap-3 mb-2">
                  <Avatar initials={p.avatar} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="font-bold text-[13.5px] text-ink-800 truncate">
                        {p.name}
                      </div>
                      <StatusPill status={p.status} professionalId={p.id} />
                    </div>
                    <div className="text-[11.5px] text-ink-500 mb-1 truncate">
                      {p.specialty} · {p.location} · desde {p.since}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RatingStars value={p.rating} />
                      <span className="text-[11px] font-bold text-ink-700">
                        {p.rating.toFixed(1)}
                      </span>
                      <span className="text-[10.5px] text-ink-400">({p.reviews})</span>
                      <StrikeBadge
                        strikes={p.strikes ?? 0}
                        threshold={defaultAdminConfig.strikeAutoBlockThreshold}
                        compact
                      />
                    </div>
                  </div>
                  <div className="min-w-[78px] text-right">
                    <div
                      className="text-[20px] font-extrabold leading-none text-ink-900"
                      data-testid={`admin-professional-reliability-score-${p.id}`}
                    >
                      {reliability.score}
                    </div>
                    <div
                      className={`mt-1 text-[10.5px] font-bold uppercase tracking-wide ${getReliabilityLabelClassName(reliability.label)}`}
                      data-testid={`admin-professional-reliability-label-${p.id}`}
                    >
                      {getReliabilityLabelText(reliability.label)}
                    </div>
                    <div className="mt-1 text-[10px] text-ink-400">Mock/demo</div>
                  </div>
                </div>
                <div className="mb-2 rounded-xl border border-sand-200/70 bg-sand-50/80 px-3 py-2 text-[11px] leading-snug text-ink-500">
                  Reviews: {reliability.reviewCount} · Rating: {reliability.averageRating.toFixed(1)}
                  · Completed: {reliability.completedJobs} · Cancelled: {reliability.cancelledJobs}
                  · Disputas: {reliability.openDisputes + reliability.resolvedAgainstPro + reliability.splitDisputes}
                  · Strikes: {reliability.strikes}
                </div>
                <ProActions
                  professionalId={p.id}
                  status={p.status}
                  onApprove={() => setProfessionalStatus(p.id, "approved")}
                  onBlock={() => setProfessionalStatus(p.id, "blocked")}
                  onReinstate={() => setProfessionalStatus(p.id, "approved")}
                />
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-ink-400 text-[12.5px]">
              Sin profesionales en este estado.
            </div>
          )}
        </div>
      </ScreenBody>
    </div>
  );
}

function getReliabilityLabelText(label: "alta" | "media" | "baja") {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getReliabilityLabelClassName(label: "alta" | "media" | "baja") {
  return (
    {
      alta: "text-teal-700",
      media: "text-amber-700",
      baja: "text-rose-600",
    } satisfies Record<"alta" | "media" | "baja", string>
  )[label];
}

function StatusPill({
  status,
  professionalId,
}: {
  status: ProStatus;
  professionalId: string;
}) {
  const m = {
    pending: { label: "Pendiente", cls: "bg-amber-50 text-amber-700" },
    approved: { label: "Aprobado", cls: "bg-teal-50 text-teal-700" },
    blocked: { label: "Bloqueado", cls: "bg-rose-50 text-rose-700" },
  }[status];
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.cls}`}
      data-testid={`admin-professional-status-${professionalId}`}
    >
      {m.label}
    </span>
  );
}

function ProActions({
  professionalId,
  status,
  onApprove,
  onBlock,
  onReinstate,
}: {
  professionalId: string;
  status: ProStatus;
  onApprove: () => void;
  onBlock: () => void;
  onReinstate: () => void;
}) {
  if (status === "pending") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Button
          full
          size="sm"
          variant="outline"
          onClick={onBlock}
          testId={`admin-professional-block-${professionalId}`}
        >
          Rechazar
        </Button>
        <Button
          full
          size="sm"
          onClick={onApprove}
          testId={`admin-professional-approve-${professionalId}`}
        >
          Aprobar
        </Button>
      </div>
    );
  }
  if (status === "approved") {
    return (
      <Button
        full
        size="sm"
        variant="danger"
        onClick={onBlock}
        testId={`admin-professional-block-${professionalId}`}
      >
        Bloquear cuenta
      </Button>
    );
  }
  return (
    <Button
      full
      size="sm"
      variant="outline"
      onClick={onReinstate}
      testId={`admin-professional-reactivate-${professionalId}`}
    >
      Reactivar cuenta
    </Button>
  );
}
