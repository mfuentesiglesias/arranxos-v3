"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/badge";
import {
  getAgreement,
  getCommissionAmount,
  getEffectiveFinalPrice,
} from "@/lib/domain/policies";
import { getEffectiveJobs, useSession } from "@/lib/store";
import type { JobStatus } from "@/lib/types";
import { formatEuro } from "@/lib/utils";
import { professionals } from "@/lib/data";

type EconomyFilter =
  | "all"
  | "agreed"
  | "escrow_funded"
  | "completed_pending_confirmation"
  | "completed"
  | "cancelled"
  | "dispute";

const ECONOMY_JOB_STATUSES: JobStatus[] = [
  "agreed",
  "escrow_funded",
  "completed_pending_confirmation",
  "completed",
  "cancelled",
  "dispute",
];

export default function AdminEconomiaPage() {
  const session = useSession();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<EconomyFilter>("all");
  const effectiveJobs = useMemo(() => getEffectiveJobs(session), [session]);
  const disputes = session.disputes;
  const notifications = session.notifications;

  const rows = useMemo(() => {
    return effectiveJobs
      .filter((job) => ECONOMY_JOB_STATUSES.includes(job.status))
      .map((job) => {
        const agreement = getAgreement(session.agreements[job.id]);
        const finalPrice =
          getEffectiveFinalPrice(job, agreement) ?? Math.round((job.priceMin + job.priceMax) / 2);
        const commissionPct = agreement?.commissionPct ?? job.commissionPct ?? session.adminConfig.commissionPct;
        const commission = getCommissionAmount({ amount: finalPrice, commissionPct });
        const net = finalPrice - commission;
        const assignedProfessional = job.assignedProId
          ? professionals.find((professional) => professional.id === job.assignedProId)
          : undefined;
        const dispute = disputes.find((entry) => entry.jobId === job.id);
        const autoReleased = notifications.some(
          (notification) =>
            notification.jobId === job.id &&
            notification.text.includes("Auto-release demo aplicado"),
        );

        let paymentStatusLabel = "No registrado";
        if (agreement?.paymentStatus === "pending") paymentStatusLabel = "Pendiente (demo)";
        if (agreement?.paymentStatus === "protected") paymentStatusLabel = "Protegido (mock)";
        if (!agreement && ["escrow_funded", "completed_pending_confirmation", "completed", "dispute", "cancelled"].includes(job.status)) {
          paymentStatusLabel = "Protegido (mock)";
        }

        let economicBadge = "No registrado";
        if (job.status === "agreed") economicBadge = "Acuerdo pendiente de pago (demo)";
        if (job.status === "escrow_funded") economicBadge = "Pago protegido (mock)";
        if (job.status === "completed_pending_confirmation") economicBadge = "Pendiente de confirmación (demo)";
        if (job.status === "completed") {
          economicBadge = autoReleased
            ? "Completado · auto-release demo"
            : dispute && ["resolved_pro", "split"].includes(dispute.status)
              ? "Completado · disputa resuelta"
              : "Completado manual";
        }
        if (job.status === "cancelled") economicBadge = "Cancelado";
        if (job.status === "dispute") economicBadge = "Disputa abierta";

        let closureOrigin = "No registrado";
        if (job.status === "completed") {
          closureOrigin = autoReleased
            ? "Auto-release demo"
            : dispute && ["resolved_pro", "split"].includes(dispute.status)
              ? "Disputa resuelta"
              : "Confirmación manual";
        }
        if (job.status === "cancelled") {
          closureOrigin = dispute?.status === "resolved_client" ? "Disputa resuelta" : "No registrado";
        }

        return {
          job,
          agreement,
          finalPrice,
          commissionPct,
          commission,
          net,
          paymentStatusLabel,
          economicBadge,
          closureOrigin,
          paidAt: agreement?.paidAt,
          clientName: job.clientName,
          professionalName: assignedProfessional?.name ?? (job.assignedProId ? job.assignedProId : "Sin asignar"),
        };
      });
  }, [effectiveJobs, disputes, notifications, session.agreements, session.adminConfig.commissionPct]);

  const filteredRows = rows.filter((row) => {
    const matchesFilter = filter === "all" || row.job.status === filter;
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      row.job.title.toLowerCase().includes(normalizedQuery) ||
      row.clientName.toLowerCase().includes(normalizedQuery) ||
      row.professionalName.toLowerCase().includes(normalizedQuery) ||
      row.job.id.toLowerCase().includes(normalizedQuery);

    return matchesFilter && matchesQuery;
  });

  const summary = {
    withAgreement: rows.length,
    agreed: rows.filter((row) => row.job.status === "agreed").length,
    escrowFunded: rows.filter((row) => row.job.status === "escrow_funded").length,
    pendingConfirmation: rows.filter((row) => row.job.status === "completed_pending_confirmation").length,
    completed: rows.filter((row) => row.job.status === "completed").length,
    cancelled: rows.filter((row) => row.job.status === "cancelled").length,
    dispute: rows.filter((row) => row.job.status === "dispute").length,
    totalFinalPrice: rows.reduce((acc, row) => acc + row.finalPrice, 0),
    totalCommission: rows.reduce((acc, row) => acc + row.commission, 0),
    totalNet: rows.reduce((acc, row) => acc + row.net, 0),
  };

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Economía" subtitle="Visión central del flujo económico mock" />
      <ScreenBody className="px-4 pt-3 pb-6">
        <div data-testid="admin-economy-page" className="flex flex-col gap-3">
          <Card className="bg-ink-900 text-white border-ink-900" testId="admin-economy-summary">
            <div className="grid grid-cols-2 gap-3 text-[12px]">
               <SummaryMetric label="Con acuerdo (demo)" value={String(summary.withAgreement)} />
               <SummaryMetric label="Agreed (demo)" value={String(summary.agreed)} />
               <SummaryMetric label="Escrow funded (mock)" value={String(summary.escrowFunded)} />
               <SummaryMetric label="Pend. confirmación (demo)" value={String(summary.pendingConfirmation)} />
               <SummaryMetric label="Completed (demo)" value={String(summary.completed)} />
               <SummaryMetric label="Cancelled (demo)" value={String(summary.cancelled)} />
               <SummaryMetric label="Dispute (demo)" value={String(summary.dispute)} />
               <SummaryMetric label="Importe acordado (demo)" value={formatEuro(summary.totalFinalPrice)} />
               <SummaryMetric label="Comisión mock" value={formatEuro(summary.totalCommission)} />
               <SummaryMetric label="Neto pro estimado (demo)" value={formatEuro(summary.totalNet)} />
             </div>
            <div className="mt-3 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[11px] leading-snug text-white/85">
              Panel económico demo: no hay Stripe, transferencias ni pagos reales.
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                href="/admin/disputas"
                data-testid="admin-economy-disputes-link"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[12px] font-bold text-white"
              >
                <Icon name="alert" size={14} />
                Ver disputas
              </Link>
              <Link
                href="/admin/trabajos"
                data-testid="admin-economy-jobs-link"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[12px] font-bold text-white"
              >
                <Icon name="briefcase" size={14} />
                Ver trabajos
              </Link>
            </div>
          </Card>

          <div className="flex items-center gap-2 bg-white rounded-2xl px-3.5 py-2.5 border border-sand-200/70">
            <Icon name="search" size={16} stroke={2.2} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por trabajo, cliente, profesional o id…"
              className="flex-1 bg-transparent outline-none text-[14px] text-ink-800 placeholder:text-ink-400"
              data-testid="admin-economy-search"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {(
              [
                { id: "all", label: "Todos" },
                 { id: "agreed", label: "Agreed (demo)" },
                 { id: "escrow_funded", label: "Custodia mock" },
                 { id: "completed_pending_confirmation", label: "Confirmación demo" },
                 { id: "completed", label: "Completed demo" },
                 { id: "cancelled", label: "Cancelled demo" },
                 { id: "dispute", label: "Dispute demo" },
              ] as const
            ).map((option) => {
              const selected = filter === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFilter(option.id)}
                  data-testid="admin-economy-status-filter"
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border-[1.5px] whitespace-nowrap ${
                    selected
                      ? "border-coral-500 bg-coral-50 text-coral-700"
                      : "border-sand-200 text-ink-500 bg-white"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            {filteredRows.map((row) => (
              <Card key={row.job.id} testId={`admin-economy-row-${row.job.id}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <div className="font-bold text-[13.5px] text-ink-800 truncate">
                        {row.job.title}
                      </div>
                      <StatusBadge status={row.job.status} />
                    </div>
                    <div className="text-[11px] text-ink-400 leading-snug">
                      {row.job.id} · cliente {row.clientName} · pro {row.professionalName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-[14px] text-ink-900">
                      {formatEuro(row.finalPrice)}
                    </div>
                    <div className="text-[10px] text-ink-400">importe acordado (demo)</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11.5px] mb-3">
                  <MetricLine label="Estado económico" value={row.economicBadge} />
                   <MetricLine label="Payment status (mock)" value={row.paymentStatusLabel} />
                   <MetricLine label="Comisión snapshot" value={`${row.commissionPct}%`} />
                   <MetricLine label="Comisión calculada" value={formatEuro(row.commission)} />
                   <MetricLine label="Neto pro estimado (demo)" value={formatEuro(row.net)} />
                   <MetricLine label="Cierre (demo)" value={row.closureOrigin} />
                   <MetricLine label="Paid at (mock)" value={row.paidAt ? row.paidAt.slice(0, 16).replace("T", " ") : "No registrado"} />
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/cliente/trabajos/${row.job.id}`}
                    className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-3 py-1.5 text-[11.5px] font-bold text-ink-700"
                  >
                    Ver detalle
                  </Link>
                  <Link
                    href="/admin/disputas"
                    className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-3 py-1.5 text-[11.5px] font-bold text-ink-700"
                  >
                    Disputas
                  </Link>
                </div>
              </Card>
            ))}

            {filteredRows.length === 0 && (
              <Card className="text-center py-10">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sand-100 text-ink-500">
                  <Icon name="euro" size={17} />
                </div>
                <div className="font-bold text-[14px] text-ink-800 mb-1">
                  No hay trabajos económicos en este filtro.
                </div>
                <div className="text-[12px] text-ink-400 leading-snug">
                  Ajusta el filtro o la búsqueda para ver otros estados mock.
                </div>
              </Card>
            )}
          </div>
        </div>
      </ScreenBody>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-white/60">
        {label}
      </div>
      <div className="font-extrabold text-[16px] text-white">{value}</div>
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-sand-50 border border-sand-200/70 px-3 py-2">
      <div className="text-[10px] text-ink-400 font-semibold uppercase tracking-wide mb-0.5">
        {label}
      </div>
      <div className="font-semibold text-ink-800 leading-snug">{value}</div>
    </div>
  );
}
