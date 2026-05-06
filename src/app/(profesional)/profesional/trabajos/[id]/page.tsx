"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { JobStatusTimeline } from "@/components/jobs/job-status-timeline";
import { MapView } from "@/components/map/map-view";
import { jobs } from "@/lib/data";
import {
  getActiveNegotiation,
  canAutoReleaseCompletedJob,
  canSeeExactLocation,
  getAgreement,
  getCommissionAmount,
  getEffectiveFinalPrice,
  getJobActionsForPro,
  hasAgreement,
} from "@/lib/domain/policies";
import {
  getAgreementByJobId,
  getCurrentProfessionalId,
  getEffectiveAdminConfig,
  getEffectiveJobById,
  getJobRequestForProfessional,
  getNegotiationByJobId,
  useSession,
} from "@/lib/store";
import type { JobStatus } from "@/lib/types";
import { formatEuro, daysBetween } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

function Inner({ id }: { id: string }) {
  const session = useSession();
  const currentProfessionalId = getCurrentProfessionalId(session);
  const adminConfig = useSession(getEffectiveAdminConfig);
  const effectiveJob = getEffectiveJobById(session, id);
  const existingRequest = getJobRequestForProfessional(session, id, currentProfessionalId);
  const jobDispute = session.disputes.find((dispute) => dispute.jobId === id);
  const agreement = useSession((s) => getAgreementByJobId(s, id));
  const negotiation = useSession((s) => getNegotiationByJobId(s, id));
  const autoReleaseCompletedJob = useSession((s) => s.autoReleaseCompletedJob);
  const submitNegotiationProposal = useSession((s) => s.submitNegotiationProposal);
  const acceptNegotiation = useSession((s) => s.acceptNegotiation);
  const job = effectiveJob ?? jobs[0];
  const resolvedAgreement = getAgreement(agreement);
  const activeNegotiation = getActiveNegotiation(negotiation);
  const [proposalAmount, setProposalAmount] = useState(
    String(activeNegotiation?.lastAmount ?? Math.round((job.priceMin + job.priceMax) / 2)),
  );

  const isMine = job.assignedProId === currentProfessionalId;
  const canSeeLocation = canSeeExactLocation({
    viewerRole: "professional",
    proStatus: "approved",
    jobStatus: job.status,
    assignedProId: job.assignedProId,
    currentProfessionalId,
  });
  const proActions = getJobActionsForPro({
    status: job.status,
    isAssignedToCurrentPro: isMine,
    hasAgreement: hasAgreement(resolvedAgreement),
    paymentStatus: resolvedAgreement?.paymentStatus,
  });
  const accepted = canSeeLocation;
  const showApprox = !canSeeLocation;
  const commissionPct = resolvedAgreement?.commissionPct ?? job.commissionPct ?? adminConfig.commissionPct;
  const agreedAmount = getEffectiveFinalPrice(job, resolvedAgreement) ?? Math.round((job.priceMin + job.priceMax) / 2);
  const commission = getCommissionAmount({ amount: agreedAmount, commissionPct });
  const canAutoRelease = canAutoReleaseCompletedJob({
    status: job.status,
    agreement: resolvedAgreement,
    completionDeadline: job.completionDeadline,
  });
  const canProposeBudget =
    isMine &&
    (job.status === "in_progress" || job.status === "agreement_pending") &&
    !resolvedAgreement;
  const canAcceptClientCounter = Boolean(
    canProposeBudget &&
      activeNegotiation?.lastAmount &&
      activeNegotiation.proposedBy === "client" &&
      !activeNegotiation.proAccepted,
  );

  const sendProposal = () => {
    const amount = Number(proposalAmount || 0);
    if (!canProposeBudget || !amount) return;
    submitNegotiationProposal(job.id, "pro", amount);
  };

  const acceptCounteroffer = () => {
    if (!canAcceptClientCounter) return;
    acceptNegotiation(job.id, "pro");
  };

  useEffect(() => {
    if (canAutoRelease) {
      autoReleaseCompletedJob(id);
    }
  }, [autoReleaseCompletedJob, canAutoRelease, id]);

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title={job.title} subtitle={job.category} />

      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="mb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="font-extrabold text-[16px] text-ink-900 leading-tight">
              {job.title}
            </div>
            <StatusBadge status={job.status} />
          </div>
          <div className="text-[12px] text-ink-400 mb-3">{job.posted}</div>
          <p className="text-[13px] text-ink-600 leading-relaxed mb-3 whitespace-pre-wrap">
            {job.description}
          </p>
          <div className="flex flex-wrap gap-2 text-[12px] text-ink-500 border-t border-sand-200/70 pt-3">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="pin" size={12} stroke={2} />
              {showApprox ? job.locationApprox : job.location}
            </span>
            <span className="inline-flex items-center gap-1.5 ml-auto text-coral-600 font-bold">
              <Icon name="euro" size={12} stroke={2} />
              {formatEuro(job.priceMin)}–{formatEuro(job.priceMax)}
            </span>
          </div>
        </Card>

        <Card className="mb-3 !p-0 overflow-hidden">
          <MapView
            height={180}
            blurred={showApprox}
            pins={
              !showApprox
                ? [{ id: "j", x: 50, y: 50, label: job.location, type: "coral" }]
                : []
            }
          />
          <div className="px-4 py-3 text-[11.5px] text-ink-400">
            {showApprox
              ? "Ubicación aproximada. Se revela cuando el cliente acepta tu propuesta."
              : "Ubicación exacta del trabajo."}
          </div>
        </Card>

        {/* Cliente */}
        <Card className="mb-3">
          <div className="flex items-center gap-3">
            <Avatar initials={job.clientAvatar} size={44} />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[13.5px] text-ink-800 truncate">
                {accepted ? job.clientName : `Cliente verificado`}
              </div>
              <div className="text-[11.5px] text-ink-500">
                ★ {job.clientRating.toFixed(1)} · {job.requests} solicitudes
              </div>
            </div>
            {accepted && isMine && (
              <Link
                href={`/chat/${job.id}`}
                className="bg-coral-500 text-white text-[12px] font-bold px-3 py-2 rounded-xl"
              >
                Chat
              </Link>
            )}
          </div>
        </Card>

        {/* Timeline + countdown */}
        {accepted && (
          <Card className="mb-3" testId={`pro-job-status-${job.status}`}>
            <div className="font-bold text-[13.5px] text-ink-800 mb-3">Estado</div>
            <JobStatusTimeline status={job.status} />
            {job.completionDeadline && job.status === "completed_pending_confirmation" && (
              <CountdownBox deadline={job.completionDeadline} />
            )}
          </Card>
        )}

        {/* Comisión */}
        <Card className="mb-3 bg-sand-50">
          <div className="text-[12px] text-ink-500 leading-snug">
            Comisión Arranxos: <strong>{commissionPct}%</strong> ·
            ~ {formatEuro(commission)}. Recibirás{" "}
            <strong>{formatEuro(agreedAmount - commission)}</strong>{" "}
            {resolvedAgreement
              ? "según el acuerdo actual."
              : "(si se acuerda en el rango medio)."}
          </div>
        </Card>

        {canProposeBudget && (
          <Card className="mb-3" testId="pro-offer-panel">
            <div className="font-bold text-[13.5px] text-ink-800 mb-2">
              Propuesta de presupuesto
            </div>
            {activeNegotiation?.lastAmount && (
              <div className="mb-3 rounded-xl border border-sand-200/70 bg-sand-50 px-3.5 py-3 text-[12px] text-ink-600 leading-snug">
                Oferta actual: <strong>{formatEuro(activeNegotiation.lastAmount)}</strong>
                {activeNegotiation.proposedBy === "client"
                  ? " · contraoferta del cliente"
                  : " · propuesta enviada por ti"}
              </div>
            )}
            <Input
              label="Importe propuesto (€)"
              type="number"
              value={proposalAmount}
              onChange={(event) => setProposalAmount(event.target.value)}
              data-testid="pro-offer-amount"
              note="El precio final solo se cierra cuando ambas partes aceptan la misma oferta."
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button full onClick={sendProposal} testId="pro-send-offer">
                Enviar propuesta
              </Button>
              <Button
                full
                variant="outline"
                onClick={acceptCounteroffer}
                disabled={!canAcceptClientCounter}
                testId="pro-accept-counteroffer"
              >
                Aceptar contraoferta
              </Button>
            </div>
          </Card>
        )}

        {resolvedAgreement && (
          <Card className="mb-3 bg-teal-50/50 border-teal-100" testId="agreement-summary-pro">
            <div className="font-bold text-[13px] text-teal-700 mb-1">
              Acuerdo alcanzado
            </div>
            <div className="text-[11.5px] text-teal-700/80 leading-snug">
              Precio final acordado: {formatEuro(resolvedAgreement.finalPrice)}.
            </div>
          </Card>
        )}

        {resolvedAgreement && job.status === "agreed" && (
          <Card className="mb-3 bg-amber-50/60 border-amber-100" testId="pro-payment-pending-state">
            <div className="font-bold text-[13px] text-amber-800 mb-1">
              Pendiente de pago protegido
            </div>
            <div className="text-[11.5px] text-amber-700 leading-snug">
              El cliente ya aceptó el acuerdo. Falta financiarlo en la demo para que el dinero quede retenido.
            </div>
          </Card>
        )}

        {resolvedAgreement && job.status === "escrow_funded" && (
          <Card className="mb-3 bg-teal-50/40 border-teal-100" testId="pro-payment-protected-state">
            <div className="flex items-center gap-2 text-[12.5px] font-bold text-teal-700 mb-1">
              <Icon name="shield" size={14} />
              Pago protegido confirmado
            </div>
            <div className="text-[11.5px] text-teal-700/80 leading-snug">
              Los fondos ya están retenidos en la demo. Ya puedes marcar el trabajo como terminado cuando acabes.
            </div>
          </Card>
        )}

        {resolvedAgreement && job.status === "completed_pending_confirmation" && (
          <Card className="mb-3 bg-violet-50/60 border-violet-100" testId="pro-completion-pending-state">
            <div className="font-bold text-[13px] text-violet-800 mb-1">
              Trabajo marcado como terminado
            </div>
            <div className="text-[11.5px] text-violet-700 leading-snug">
              El cliente debe revisar el resultado y confirmar el cierre del trabajo. El pago protegido mock sigue asociado al acuerdo.
            </div>
          </Card>
        )}

        {resolvedAgreement && job.status === "completed" && (
          <Card className="mb-3 bg-teal-50/40 border-teal-100" testId="pro-job-completed-state">
            <div className="font-bold text-[13px] text-teal-700 mb-1">
              Trabajo completado
            </div>
            <div className="text-[11.5px] text-teal-700/80 leading-snug">
              El cliente ya confirmó este trabajo en la demo y el acuerdo queda cerrado. El pago protegido mock queda visible como referencia del flujo.
            </div>
          </Card>
        )}

        {job.status === "dispute" && jobDispute && (
          <Card className="mb-3 bg-rose-50/70 border-rose-100" testId="pro-dispute-open-state">
            <div className="font-bold text-[13px] text-rose-700 mb-1">
              Disputa abierta
            </div>
            <div className="text-[11.5px] text-rose-700/80 leading-snug">
              El cliente abrió una disputa por "{jobDispute.reason}". El acuerdo y el pago protegido mock siguen asociados al trabajo mientras admin lo revisa.
            </div>
          </Card>
        )}

        {job.status === "cancelled" && jobDispute?.status === "resolved_client" && (
          <Card className="mb-3 bg-sand-100 border-sand-200" testId="pro-dispute-cancelled-state">
            <div className="font-bold text-[13px] text-ink-700 mb-1">
              Disputa resuelta a favor del cliente
            </div>
            <div className="text-[11.5px] text-ink-500 leading-snug">
              Admin cerró este caso a favor del cliente y el trabajo quedó cancelado en la demo.
            </div>
          </Card>
        )}

        {job.status === "completed" && jobDispute && ["resolved_pro", "split"].includes(jobDispute.status) && (
          <Card className="mb-3 bg-violet-50/60 border-violet-100" testId="pro-dispute-resolved-completed-state">
            <div className="font-bold text-[13px] text-violet-800 mb-1">
              Disputa cerrada
            </div>
            <div className="text-[11.5px] text-violet-700 leading-snug">
              Admin resolvió la disputa {jobDispute.status === "resolved_pro" ? "a tu favor" : "con resolución dividida"}. El trabajo queda completado en la demo.
            </div>
          </Card>
        )}

        {existingRequest?.status === "accepted" && !accepted && (
          <Card className="mb-3 bg-teal-50/50 border-teal-100">
            <div className="font-bold text-[13px] text-teal-700 mb-1">
              Trabajo asignado
            </div>
            <div className="text-[11.5px] text-teal-700/80 leading-snug">
              El cliente ya aceptó tu solicitud para este trabajo.
            </div>
          </Card>
        )}

        {existingRequest?.status === "rejected" && (
          <Card className="mb-3 bg-sand-100 border-sand-200">
            <div className="font-bold text-[13px] text-ink-700 mb-1">
              Solicitud cerrada
            </div>
            <div className="text-[11.5px] text-ink-500 leading-snug">
              El cliente ya eligió otra solicitud para este trabajo.
            </div>
          </Card>
        )}
      </ScreenBody>

      {/* Sticky CTA */}
        <ProJobActions
          jobId={job.id}
          actions={proActions}
          requested={Boolean(existingRequest)}
          status={job.status}
          isAssignedToCurrentPro={isMine}
        />
      </div>
  );
}

function CountdownBox({ deadline }: { deadline: string }) {
  const days = Math.max(0, daysBetween(new Date().toISOString(), deadline));
  return (
    <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 text-[12px] text-amber-700 font-semibold flex items-center gap-2">
      <Icon name="clock" size={14} />
      Auto-liberación en {days} día{days === 1 ? "" : "s"} si el cliente no
      confirma.
    </div>
  );
}

function ProJobActions({
  jobId,
  actions,
  requested,
  status,
  isAssignedToCurrentPro,
}: {
  jobId: string;
  actions: ReturnType<typeof getJobActionsForPro>;
  requested: boolean;
  status: JobStatus;
  isAssignedToCurrentPro: boolean;
}) {
  if (actions.includes("request_job")) {
    return (
      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button
          full
          href={requested ? undefined : `/profesional/trabajos/${jobId}/solicitar`}
          disabled={requested}
        >
          {requested ? "Solicitud enviada ✓" : "Solicitar este trabajo"}
        </Button>
      </div>
    );
  }
  if (isAssignedToCurrentPro && status === "escrow_funded") {
    return (
      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button full href={`/profesional/trabajos/${jobId}/finalizar`} testId="pro-mark-completed-cta">
          Marcar trabajo terminado
        </Button>
      </div>
    );
  }
  if (isAssignedToCurrentPro && status === "completed_pending_confirmation") {
    return (
      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70 text-center text-[12px] text-ink-500">
        Esperando confirmación del cliente
      </div>
    );
  }
  if (isAssignedToCurrentPro && status === "completed") {
    return (
      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70 text-center text-[12px] text-teal-700 font-semibold">
        Trabajo completado
      </div>
    );
  }
  if (isAssignedToCurrentPro && (status === "in_progress" || status === "agreement_pending")) {
    return (
      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70 grid grid-cols-2 gap-2">
        <Button full variant="outline" href={`/chat/${jobId}`} testId="pro-open-chat-cta">
          Abrir chat
        </Button>
        <Button full href={`/profesional/trabajos/${jobId}/seguimiento`} testId="pro-view-tracking-cta">
          Ver seguimiento
        </Button>
      </div>
    );
  }
  if (actions.includes("open_chat") && actions.includes("view_tracking")) {
    return (
      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70 grid grid-cols-2 gap-2">
        <Button full variant="outline" href={`/chat/${jobId}`}>
          Abrir chat
        </Button>
        <Button full href={`/profesional/trabajos/${jobId}/seguimiento`}>
          Ver seguimiento
        </Button>
      </div>
    );
  }
  if (actions.includes("mark_completed")) {
    return (
      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button full href={`/profesional/trabajos/${jobId}/finalizar`}>
          Marcar como terminado
        </Button>
      </div>
    );
  }
  if (actions.includes("awaiting_client_confirmation")) {
    return (
      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70 text-center text-[12px] text-ink-500">
        Esperando confirmación del cliente
      </div>
    );
  }
  return null;
}

export default function Page({ params }: Props) {
  const { id } = use(params);
  return <Inner id={id} />;
}
