"use client";
import { use } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { JobStatusTimeline } from "@/components/jobs/job-status-timeline";
import { jobs } from "@/lib/data";
import {
  getAgreement,
  getCommissionAmount,
  getEffectiveFinalPrice,
  getPostPaymentJobActionsForPro,
} from "@/lib/domain/policies";
import {
  getAgreementByJobId,
  getCurrentProfessionalId,
  getEffectiveAdminConfig,
  getEffectiveJobById,
  useSession,
} from "@/lib/store";
import { formatEuro, daysBetween } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

function Inner({ id }: { id: string }) {
  const currentProfessionalId = useSession(getCurrentProfessionalId);
  const adminConfig = useSession(getEffectiveAdminConfig);
  const effectiveJob = useSession((s) => getEffectiveJobById(s, id));
  const agreement = useSession((s) => getAgreementByJobId(s, id));
  const markJobInProgress = useSession((s) => s.markJobInProgress);
  const job = effectiveJob ?? jobs.find((j) => j.id === id) ?? jobs[0];
  const resolvedAgreement = getAgreement(agreement);
  const total =
    getEffectiveFinalPrice(job, resolvedAgreement) ??
    Math.round((job.priceMin + job.priceMax) / 2);
  const commissionPct = resolvedAgreement?.commissionPct ?? job.commissionPct ?? adminConfig.commissionPct;
  const commission = getCommissionAmount({ amount: total, commissionPct });
  const youGet = total - commission;
  const proPostPaymentActions = getPostPaymentJobActionsForPro({
    status: job.status,
    agreement: resolvedAgreement,
    isAssignedToCurrentPro: job.assignedProId === currentProfessionalId,
  });
  const days =
    job.completionDeadline && job.status === "completed_pending_confirmation"
      ? Math.max(0, daysBetween(new Date().toISOString(), job.completionDeadline))
      : null;

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Seguimiento" subtitle={job.title} />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="mb-3">
          <div className="font-bold text-[13.5px] text-ink-800 mb-3">
            Estado del trabajo
          </div>
          <JobStatusTimeline status={job.status} />
        </Card>

        {days !== null && (
          <Card className="bg-amber-50 border-amber-100 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center">
                <Icon name="clock" size={18} />
              </div>
              <div>
                <div className="font-bold text-[13px] text-amber-700">
                  Auto-liberación en {days} día{days === 1 ? "" : "s"}
                </div>
                <div className="text-[11.5px] text-amber-700/80">
                  Si el cliente no responde, el pago se libera automáticamente.
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="mb-3">
          <div className="font-bold text-[13.5px] text-ink-800 mb-3">Cliente</div>
          <div className="flex items-center gap-3 mb-3">
            <Avatar initials={job.clientAvatar} size={48} />
            <div className="flex-1">
              <div className="font-bold text-[14px] text-ink-800">
                {job.clientName}
              </div>
              <div className="text-[11.5px] text-ink-500">
                ★ {job.clientRating.toFixed(1)} · {job.location}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button full variant="outline" href={`/chat/${job.id}`}>
              Abrir chat
            </Button>
            {proPostPaymentActions.canStartJob ? (
              <Button full onClick={() => markJobInProgress(job.id)}>
                Marcar en curso
              </Button>
            ) : proPostPaymentActions.canMarkCompleted ? (
              <Button full href={`/profesional/trabajos/${job.id}/finalizar`}>
                Marcar terminado
              </Button>
            ) : (
              <Button full disabled>
                {proPostPaymentActions.awaitingClientConfirmation
                  ? "Esperando confirmación"
                  : "Seguimiento activo"}
              </Button>
            )}
          </div>
        </Card>

        <Card className="mb-3 bg-teal-50/40 border-teal-100">
          <div className="font-bold text-[13px] text-teal-700 mb-2">
            Pago en custodia
          </div>
          <div className="text-[12px] text-teal-700/80 mb-3 leading-snug">
            {formatEuro(total)} retenidos por Arranxos. Se liberan tras
            confirmación o tras {adminConfig.autoReleaseDays} días sin
            respuesta del cliente.
          </div>
          <div className="bg-white rounded-xl p-3 border border-teal-100 text-[12.5px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-ink-500">Total acordado</span>
              <span className="font-bold text-ink-800">{formatEuro(total)}</span>
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-ink-500">
                Comisión ({commissionPct}%)
              </span>
              <span className="font-bold text-ink-800">
                −{formatEuro(commission)}
              </span>
            </div>
            <div className="border-t border-sand-200 mt-1.5 pt-1.5 flex items-center justify-between">
              <span className="font-bold text-ink-800">Tú recibirás</span>
              <span className="font-extrabold text-teal-600">
                {formatEuro(youGet)}
              </span>
            </div>
          </div>
        </Card>
      </ScreenBody>
    </div>
  );
}

export default function Page({ params }: Props) {
  const { id } = use(params);
  return <Inner id={id} />;
}
