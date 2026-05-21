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
import { Input, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { JobStatusTimeline } from "@/components/jobs/job-status-timeline";
import { MapView } from "@/components/map/map-view";
import { getJobAgreementContext, type ApiJobAgreementContext } from "@/lib/api/agreements";
import { createJobRequest } from "@/lib/api/jobRequests";
import { getPublishedJobForProfessional, type ApiProfessionalPublishedJob } from "@/lib/api/jobs";
import { getCurrentProfile } from "@/lib/api/profiles";
import { getMyReviewForJob, type ApiReview } from "@/lib/api/reviews";
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
import { isSupabaseMode } from "@/lib/supabase/config";
import type { JobStatus } from "@/lib/types";
import { formatEuro, daysBetween } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

function formatReviewDate(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ReviewStatusCard({
  jobId,
  review,
}: {
  jobId: string;
  review: ApiReview | null;
}) {
  return review ? (
    <Card className="mb-3" testId="pro-review-summary">
      <div className="font-bold text-[13.5px] text-ink-800 mb-1">Valoración del cliente</div>
      <div className="text-[12px] text-ink-600 leading-snug mb-1">Ya has valorado este trabajo.</div>
      <div className="text-[12px] text-ink-600 leading-snug mb-1">{review.rating} de 5 estrellas</div>
      {review.comment && <div className="text-[11.5px] text-ink-500 leading-snug mb-1">{review.comment}</div>}
      {formatReviewDate(review.createdAt) && (
        <div className="text-[11px] text-ink-400 leading-snug">{formatReviewDate(review.createdAt)}</div>
      )}
    </Card>
  ) : (
    <Card className="mb-3" testId="pro-review-cta-card">
      <div className="font-bold text-[13.5px] text-ink-800 mb-2">Valoración del cliente</div>
      <div className="text-[11.5px] text-ink-500 leading-snug mb-3">
        Tu opinión ayuda a mejorar la confianza dentro de Arranxos.
      </div>
      <Button full href={`/profesional/trabajos/${jobId}/valorar`} testId="pro-review-cta">
        Valorar al cliente
      </Button>
    </Card>
  );
}

function Inner({ id }: { id: string }) {
  const isSupabase = isSupabaseMode();
  const session = useSession();
  const currentProfessionalId = getCurrentProfessionalId(session);
  const adminConfig = useSession(getEffectiveAdminConfig);
  const effectiveJob = getEffectiveJobById(session, id);
  const existingRequest = getJobRequestForProfessional(session, id, currentProfessionalId);
  const jobDispute = session.disputes.find((dispute) => dispute.jobId === id);
  const autoReleaseApplied = session.notifications.some(
    (notification) =>
      notification.jobId === id && notification.text.includes("Auto-release demo aplicado"),
  );
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
  const [realJob, setRealJob] = useState<ApiProfessionalPublishedJob | null>(null);
  const [realAgreementContext, setRealAgreementContext] = useState<ApiJobAgreementContext | null>(null);
  const [realReview, setRealReview] = useState<ApiReview | null>(null);
  const [realJobLoading, setRealJobLoading] = useState(false);
  const [realJobError, setRealJobError] = useState<string | null>(null);
  const [isRealProfessionalApproved, setIsRealProfessionalApproved] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestSending, setRequestSending] = useState(false);
  const [requestState, setRequestState] = useState<"idle" | "sent" | "duplicate">("idle");
  const [requestError, setRequestError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isSupabase) {
      return;
    }

    let cancelled = false;

    const loadRealJob = async () => {
      setRealJobLoading(true);
      setRealJobError(null);
      setRequestError(null);
      setRequestState("idle");

      try {
        const [profile, nextAgreementContext, nextReview] = await Promise.all([
          getCurrentProfile(),
          getJobAgreementContext(id),
          getMyReviewForJob(id),
        ]);

        const isHistoricalCompletedJob = Boolean(
          profile?.role === "professional" &&
            nextAgreementContext.status === "ready" &&
            nextAgreementContext.job?.status === "completed" &&
            nextAgreementContext.agreement?.paymentStatus === "released",
        );

        if (!profile) {
          if (!cancelled) {
            setIsRealProfessionalApproved(false);
            setRealJob(null);
            setRealAgreementContext(nextAgreementContext);
            setRealReview(nextReview);
            setRealJobLoading(false);
            setRealJobError("Tu sesión no tiene un perfil profesional válido.");
          }
          return;
        }

        if (isHistoricalCompletedJob) {
          if (!cancelled) {
            setIsRealProfessionalApproved(true);
            setRealJob(null);
            setRealAgreementContext(nextAgreementContext);
            setRealReview(nextReview);
            setRealJobLoading(false);
          }
          return;
        }

        if (profile.role !== "professional" || profile.professionalStatus !== "approved") {
          if (!cancelled) {
            setIsRealProfessionalApproved(false);
            setRealJob(null);
            setRealAgreementContext(nextAgreementContext);
            setRealReview(nextReview);
            setRealJobLoading(false);
          }
          return;
        }

        const publishedJob = await getPublishedJobForProfessional(id);

        if (!cancelled) {
          setIsRealProfessionalApproved(true);
          setRealJob(publishedJob);
          setRealAgreementContext(nextAgreementContext);
          setRealReview(nextReview);
          setRealJobLoading(false);
        }
      } catch {
        if (!cancelled) {
          setIsRealProfessionalApproved(false);
          setRealJob(null);
          setRealAgreementContext(null);
          setRealReview(null);
          setRealJobLoading(false);
          setRealJobError("No pudimos cargar este trabajo real ahora mismo.");
        }
      }
    };

    void loadRealJob();

    return () => {
      cancelled = true;
    };
  }, [id, isSupabase]);

  const sendRealRequest = async () => {
    if (!realJob || requestSending || requestState !== "idle") {
      return;
    }

    setRequestSending(true);
    setRequestError(null);

    try {
      await createJobRequest(realJob.id, requestMessage);
      setRequestState("sent");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No pudimos enviar la solicitud. Inténtalo de nuevo.";

      if (message === "Ya has solicitado este trabajo.") {
        setRequestState("duplicate");
      } else {
        setRequestError(message);
      }
    } finally {
      setRequestSending(false);
    }
  };

  const realCompletedJob = realAgreementContext?.status === "ready" ? realAgreementContext.job : null;
  const realCompletedAgreement = realAgreementContext?.status === "ready" ? realAgreementContext.agreement : null;
  const showRealReviewBlock = Boolean(
    realCompletedJob?.status === "completed" &&
      realCompletedAgreement?.paymentStatus === "released",
  );

  if (isSupabase) {
    return (
      <div className="flex-1 flex flex-col bg-sand-50">
        <StatusBar />
        <TopBar title={realJob?.title ?? "Detalle del trabajo"} subtitle="Oportunidad real" />

        <ScreenBody className="px-4 pt-3 pb-6">
          {!isRealProfessionalApproved && !realJobLoading && !realJobError && (
            <Card className="mb-3 bg-amber-50/70 border-amber-100">
              <div className="font-bold text-[13px] text-amber-800 mb-1">
                Acceso restringido
              </div>
              <div className="text-[11.5px] text-amber-700 leading-snug">
                Solo profesionales aprobados pueden solicitar trabajos reales.
              </div>
            </Card>
          )}

          {realJobError && (
            <Card className="mb-3 bg-rose-50/70 border-rose-100">
              <div className="font-bold text-[13px] text-rose-700 mb-1">No disponible</div>
              <div className="text-[11.5px] text-rose-700/80 leading-snug">{realJobError}</div>
            </Card>
          )}

          {realJobLoading && (
            <Card className="mb-3">
              <div className="text-[12px] text-ink-500 text-center py-4">Cargando trabajo real…</div>
            </Card>
          )}

          {isRealProfessionalApproved && !realJobLoading && !realJobError && !realJob && (
            <Card className="mb-3 bg-amber-50/70 border-amber-100">
              <div className="font-bold text-[13px] text-amber-800 mb-1">Trabajo no disponible</div>
              <div className="text-[11.5px] text-amber-700 leading-snug">
                Este trabajo ya no está disponible para nuevas solicitudes.
              </div>
            </Card>
          )}

          {realJob && (
            <>
              <Card className="mb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-extrabold text-[16px] text-ink-900 leading-tight">
                    {realJob.title}
                  </div>
                  <StatusBadge status={"published" as JobStatus} />
                </div>
                <div className="text-[12px] text-ink-400 mb-3">
                  {formatPublishedJobDate(realJob.createdAt)}
                </div>
                <p className="text-[13px] text-ink-600 leading-relaxed mb-3 whitespace-pre-wrap">
                  {realJob.description}
                </p>
                {(realJob.categoryName || realJob.serviceName) && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {realJob.categoryName && (
                      <span className="inline-flex rounded-full bg-sand-100 px-2.5 py-1 text-[10.5px] font-bold text-ink-500">
                        {realJob.categoryName}
                      </span>
                    )}
                    {realJob.serviceName && (
                      <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-[10.5px] font-bold text-teal-700">
                        {realJob.serviceName}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 text-[12px] text-ink-500 border-t border-sand-200/70 pt-3">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="pin" size={12} stroke={2} />
                    {realJob.approxLocation ?? "Ubicación aproximada no disponible"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 ml-auto text-coral-600 font-bold">
                    <Icon name="euro" size={12} stroke={2} />
                    {formatPublishedJobPrice(realJob.priceMin, realJob.priceMax)}
                  </span>
                </div>
              </Card>

              <Card className="mb-3 bg-sky-50/60 border-sky-100">
                <div className="text-[11.5px] text-sky-800 leading-snug">
                  Dirección exacta y chat solo tras aceptación.
                </div>
                <div className="mt-2 text-[11.5px] text-sky-700/80 leading-snug">
                  El precio mostrado es orientativo. El precio final se acordará dentro de Arranxos.
                </div>
              </Card>

              {showRealReviewBlock && <ReviewStatusCard jobId={id} review={realReview} />}

              {requestState === "sent" && (
                <Card className="mb-3 bg-teal-50 border-teal-100">
                  <div className="font-bold text-[13px] text-teal-700 mb-1">Solicitud enviada</div>
                  <div className="text-[11.5px] text-teal-700/80 leading-snug">
                    El cliente podrá revisar tu solicitud en cuanto acceda al trabajo.
                  </div>
                </Card>
              )}

              {requestState === "duplicate" && (
                <Card className="mb-3 bg-amber-50 border-amber-100">
                  <div className="font-bold text-[13px] text-amber-800 mb-1">Solicitud ya registrada</div>
                  <div className="text-[11.5px] text-amber-700 leading-snug">
                    Ya has solicitado este trabajo.
                  </div>
                </Card>
              )}

              {requestError && (
                <Card className="mb-3 bg-rose-50 border-rose-100">
                  <div className="font-bold text-[13px] text-rose-700 mb-1">No pudimos enviar la solicitud</div>
                  <div className="text-[11.5px] text-rose-700/80 leading-snug">{requestError}</div>
                </Card>
              )}

              <Card className="mb-3">
                <div className="font-bold text-[13.5px] text-ink-800 mb-2">Mensaje opcional</div>
                <Textarea
                  label="Mensaje para el cliente"
                  value={requestMessage}
                  onChange={(event) => setRequestMessage(event.target.value)}
                  placeholder="Preséntate brevemente y explica por qué encajas para este trabajo."
                  rows={5}
                  disabled={requestState !== "idle" || requestSending}
                />
                <div className="mt-3">
                  <Button
                    full
                    onClick={sendRealRequest}
                    disabled={!realJob || requestSending || requestState !== "idle"}
                  >
                    {requestSending
                      ? "Enviando…"
                      : requestState === "sent"
                      ? "Solicitud enviada"
                      : requestState === "duplicate"
                      ? "Ya solicitado"
                      : "Enviar solicitud"}
                  </Button>
                </div>
              </Card>
            </>
          )}

          {!realJob && showRealReviewBlock && (
            <>
              <Card className="mb-3 bg-teal-50/40 border-teal-100" testId="pro-job-completed-state">
                <div className="font-bold text-[13px] text-teal-700 mb-1">Trabajo completado</div>
                <div className="text-[11.5px] text-teal-700/80 leading-snug">
                  El cliente ya confirmó este trabajo y el acuerdo quedó cerrado en Supabase mode.
                </div>
              </Card>
              <ReviewStatusCard jobId={id} review={realReview} />
            </>
          )}
        </ScreenBody>
      </div>
    );
  }

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
                {accepted ? job.clientName : "Cliente de la demo"}
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
              ? "según el acuerdo actual de esta demo."
              : "(si se acuerda en el rango medio de la simulación)."}
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
              Pendiente de pago protegido (mock)
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
            {job.completionDeadline && (
              <div className="mt-2 text-[11px] font-semibold text-violet-700/80">
                Auto-release demo en {Math.max(0, daysBetween(new Date().toISOString(), job.completionDeadline))} día{Math.max(0, daysBetween(new Date().toISOString(), job.completionDeadline)) === 1 ? "" : "s"}.
              </div>
            )}
            {isMine && (
              <Button
                full
                className="mt-3"
                variant="outline"
                href={`/profesional/trabajos/${job.id}/disputa`}
                testId="pro-open-dispute"
              >
                Abrir disputa
              </Button>
            )}
          </Card>
        )}

        {resolvedAgreement && job.status === "completed" && (
          <Card className="mb-3 bg-teal-50/40 border-teal-100" testId={autoReleaseApplied ? "pro-auto-release-completed-state" : "pro-job-completed-state"}>
            <div className="font-bold text-[13px] text-teal-700 mb-1">
              Trabajo completado
            </div>
            <div className="text-[11.5px] text-teal-700/80 leading-snug">
              {autoReleaseApplied
                ? "El trabajo se completó por auto-release demo tras vencer el plazo de confirmación."
                : "El cliente ya confirmó este trabajo en la demo y el acuerdo queda cerrado."} El pago protegido mock queda visible como referencia del flujo.
            </div>
          </Card>
        )}

        {job.status === "dispute" && jobDispute && (
          <Card className="mb-3 bg-rose-50/70 border-rose-100" testId="pro-dispute-open-state">
            <div className="font-bold text-[13px] text-rose-700 mb-1">
              Disputa abierta
            </div>
            <div className="text-[11.5px] text-rose-700/80 leading-snug">
              {jobDispute.openedBy === "professional"
                ? `Has abierto una disputa por "${jobDispute.reason}".`
                : `El cliente abrió una disputa por "${jobDispute.reason}".`} El acuerdo y el pago protegido mock siguen asociados al trabajo mientras admin lo revisa.
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

function formatPublishedJobDate(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "Publicado recientemente";
  }

  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

function formatPublishedJobPrice(priceMin: number | null, priceMax: number | null) {
  if (typeof priceMin === "number" && typeof priceMax === "number") {
    return `${priceMin}€–${priceMax}€`;
  }

  if (typeof priceMin === "number") {
    return `Desde ${priceMin}€`;
  }

  if (typeof priceMax === "number") {
    return `Hasta ${priceMax}€`;
  }

  return "A negociar";
}
