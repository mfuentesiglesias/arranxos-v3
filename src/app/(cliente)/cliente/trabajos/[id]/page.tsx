"use client";
import { use, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { HeaderActionSheet } from "@/components/layout/header-action-sheet";
import { HeaderIconButton } from "@/components/layout/header-icon-button";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/badge";
import { JobStatusTimeline } from "@/components/jobs/job-status-timeline";
import { getJobAgreementContext, type ApiJobAgreementContext } from "@/lib/api/agreements";
import { getMyReviewForJob, type ApiReview } from "@/lib/api/reviews";
import {
  createSearchTicketFromJob as createRealSearchTicketFromJob,
  getMySearchTicketByJobId,
  type ApiSearchTicket,
} from "@/lib/api/searchTickets";
import {
  getMyJobById,
  toMockJob,
  type ApiClientJob,
} from "@/lib/api/clientJobs";
import {
  getClientJobRequestsWithProfessionalInfo,
  acceptJobRequest as acceptRealJobRequest,
  type ApiClientJobRequestWithProfessionalInfo,
} from "@/lib/api/jobRequests";
import { jobs, professionals } from "@/lib/data";
import {
  getActiveNegotiation,
  canAutoReleaseCompletedJob,
  getAgreement,
  getEffectiveFinalPrice,
  getJobActionsForClient,
  getPostPaymentJobActionsForClient,
  getSearchTicketClientState,
  hasAgreement,
} from "@/lib/domain/policies";
import {
  getAgreementByJobId,
  getAcceptedJobRequestForJob,
  getEffectiveAdminConfig,
  getEffectiveJobById,
  getJobOutreachMeta,
  getNegotiationByJobId,
  getReviewForJobByReviewer,
  getSearchTicketByJobId,
  useSession,
} from "@/lib/store";
import type { JobRequest, JobStatus } from "@/lib/types";
import { isSupabaseMode } from "@/lib/supabase/config";
import { daysBetween, formatEuro } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

interface DetailReviewSummary {
  rating: number;
  comment: string | null;
  createdAt?: string | null;
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

function Inner({ id }: { id: string }) {
  const isSupabase = isSupabaseMode();
  type RequestingProEntry = {
    professional: (typeof professionals)[number];
    jobRequest?: JobRequest;
  };
  type ActualRequestingProEntry = {
    professional: (typeof professionals)[number];
    jobRequest: JobRequest;
  };

  const [moreOpen, setMoreOpen] = useState(false);
  const search = useSearchParams();
  const justPublished = search?.get("justPublished") === "1";
  const session = useSession();
  const adminConfig = useSession(getEffectiveAdminConfig);
  const effectiveJob = getEffectiveJobById(session, id);
  const jobRequests = useSession((s) => s.jobRequests);
  const agreement = useSession((s) => getAgreementByJobId(s, id));
  const negotiation = useSession((s) => getNegotiationByJobId(s, id));
  const outreachMeta = useSession((s) => getJobOutreachMeta(s, id));
  const searchTicket = useSession((s) => getSearchTicketByJobId(s, id));
  const createSearchTicket = useSession((s) => s.createSearchTicket);
  const autoReleaseCompletedJob = useSession((s) => s.autoReleaseCompletedJob);
  const submitNegotiationProposal = useSession((s) => s.submitNegotiationProposal);
  const acceptNegotiation = useSession((s) => s.acceptNegotiation);
  const jobFromSeed = effectiveJob ?? jobs.find((j) => j.id === id) ?? null;
  const jobExistsInSeed = Boolean(jobFromSeed);
  const effectiveJobRequests = (jobRequests ?? []).filter(
    (jobRequest) => jobRequest.jobId === id,
  );
  const acceptedJobRequest = getAcceptedJobRequestForJob(session, id);
  const existingClientReview = getReviewForJobByReviewer(session, id, session.currentClientId);
  const jobDispute = session.disputes.find((dispute) => dispute.jobId === id);
  const autoReleaseApplied = session.notifications.some(
    (notification) =>
      notification.jobId === id && notification.text.includes("Auto-release demo aplicado"),
  );
  const existingSearchTicket = searchTicket ?? null;
  const resolvedAgreement = getAgreement(agreement);
  const activeNegotiation = getActiveNegotiation(negotiation);

  useEffect(() => {
    if (!isSupabase || jobExistsInSeed) {
      setRealClientJob(null);
      setRealClientJobError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setRealClientJobLoading(true);
      setRealClientJobError(null);

      try {
        const apiJob = await getMyJobById(id);
        if (!cancelled) {
          if (apiJob) {
            setRealClientJob(apiJob);
          } else {
            setRealClientJobError("No pudimos cargar este trabajo o no tienes acceso a él.");
          }
        }
      } catch (error) {
        if (!cancelled) {
          setRealClientJobError(
            error instanceof Error && error.message
              ? error.message
              : "No pudimos cargar este trabajo.",
          );
        }
      } finally {
        if (!cancelled) {
          setRealClientJobLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [id, isSupabase, jobExistsInSeed]);

  const resolvedJobForInit = jobFromSeed ?? jobs[0];
  const [counterofferAmount, setCounterofferAmount] = useState(
    String(activeNegotiation?.lastAmount ?? Math.round((resolvedJobForInit.priceMin + resolvedJobForInit.priceMax) / 2)),
  );
  const [realAgreementContext, setRealAgreementContext] = useState<ApiJobAgreementContext | null>(null);
  const [realReview, setRealReview] = useState<ApiReview | null>(null);
  const [realClientJob, setRealClientJob] = useState<ApiClientJob | null>(null);
  const [realClientJobLoading, setRealClientJobLoading] = useState(false);
  const [realClientJobError, setRealClientJobError] = useState<string | null>(null);
  const [realRequests, setRealRequests] = useState<ApiClientJobRequestWithProfessionalInfo[]>([]);
  const [realRequestsLoading, setRealRequestsLoading] = useState(false);
  const [realRequestsError, setRealRequestsError] = useState<string | null>(null);
  const [acceptingRequestId, setAcceptingRequestId] = useState<string | null>(null);
  const resolvedRealJob = realClientJob ? toMockJob(realClientJob) : null;
  const job = isSupabase && resolvedRealJob ? resolvedRealJob : (jobFromSeed ?? jobs[0]);
  const finalPrice = getEffectiveFinalPrice(job, resolvedAgreement);
  const showJobContent = !(isSupabase && realClientJobLoading) && !realClientJobError;
  const [realSearchTicket, setRealSearchTicket] = useState<ApiSearchTicket | null>(null);
  const [searchTicketActionError, setSearchTicketActionError] = useState<string | null>(null);
  const [searchTicketActionNotice, setSearchTicketActionNotice] = useState<string | null>(null);
  const [creatingSearchTicketReason, setCreatingSearchTicketReason] = useState<
    "no_pros_in_zone" | "no_useful_response" | null
  >(null);
  const effectiveSearchTicket = isSupabase ? realSearchTicket : existingSearchTicket;
  const postPaymentActions = getPostPaymentJobActionsForClient({
    status: job.status,
    agreement: resolvedAgreement,
    completionDeadline: job.completionDeadline,
  });
  const assignedPro = job.assignedProId
    ? professionals.find((p) => p.id === job.assignedProId)
    : null;
  const clientActions = getJobActionsForClient({
    status: job.status,
    hasAssignedPro: Boolean(assignedPro),
    invitationCount: job.invitations ?? 0,
    invitationLimit: adminConfig.invitationLimitPerJob,
    hasAgreement: hasAgreement(resolvedAgreement),
    paymentStatus: resolvedAgreement?.paymentStatus,
    completionDeadline: job.completionDeadline,
  });
  const canOpenChat = clientActions.includes("open_chat");
  const canAcceptOffer = Boolean(
    activeNegotiation?.lastAmount &&
      activeNegotiation.proposedBy === "pro" &&
      !activeNegotiation.clientAccepted,
  );
  const canCounteroffer = Boolean(
    assignedPro &&
      (job.status === "in_progress" || job.status === "agreement_pending") &&
      !resolvedAgreement,
  );
  const searchTicketState = isSupabase && realSearchTicket
    ? "ticket_created"
    : getSearchTicketClientState({
        job,
        professionals,
        outreachMeta,
        existingTicket: isSupabase ? undefined : searchTicket,
        daysThreshold: adminConfig.searchTicketNoResponseDays,
      });
  const requestingPros =
    effectiveJobRequests.length > 0
      ? effectiveJobRequests
          .map((jobRequest) => {
            const professional = professionals.find((entry) => entry.id === jobRequest.proId);
            return professional
              ? { professional, jobRequest }
              : undefined;
          })
          .filter((request): request is ActualRequestingProEntry => Boolean(request))
      : jobExistsInSeed
        ? professionals
            .slice(0, Math.max(0, job.requests))
            .map((professional) => ({ professional, jobRequest: undefined }))
        : [];

  useEffect(() => {
    if (postPaymentActions.canAutoRelease) {
      autoReleaseCompletedJob(id);
    }
  }, [autoReleaseCompletedJob, id, postPaymentActions.canAutoRelease]);

  useEffect(() => {
    if (!isSupabase) {
      setRealAgreementContext(null);
      setRealReview(null);
      return;
    }

    let cancelled = false;

    async function loadRealReviewState() {
      try {
        const [nextAgreementContext, nextReview] = await Promise.all([
          getJobAgreementContext(id),
          getMyReviewForJob(id),
        ]);

        if (!cancelled) {
          setRealAgreementContext(nextAgreementContext);
          setRealReview(nextReview);
        }
      } catch {
        if (!cancelled) {
          setRealAgreementContext(null);
          setRealReview(null);
        }
      }
    }

    void loadRealReviewState();

    return () => {
      cancelled = true;
    };
  }, [id, isSupabase]);

  useEffect(() => {
    if (!isSupabase) {
      setRealSearchTicket(null);
      return;
    }

    let cancelled = false;

    const loadRealSearchTicket = async () => {
      try {
        const ticket = await getMySearchTicketByJobId(id);
        if (!cancelled) {
          setRealSearchTicket(ticket);
        }
      } catch {
        if (!cancelled) {
          setRealSearchTicket(null);
        }
      }
    };

    void loadRealSearchTicket();

    return () => {
      cancelled = true;
    };
  }, [id, isSupabase]);

  useEffect(() => {
    if (!isSupabase || jobExistsInSeed) {
      setRealRequests([]);
      setRealRequestsError(null);
      return;
    }

    let cancelled = false;

    const loadRealRequests = async () => {
      setRealRequestsLoading(true);
      setRealRequestsError(null);

      try {
        const requests = await getClientJobRequestsWithProfessionalInfo(id);
        if (!cancelled) {
          setRealRequests(requests);
        }
      } catch (error) {
        if (!cancelled) {
          setRealRequestsError(
            error instanceof Error && error.message
              ? error.message
              : "No pudimos cargar las solicitudes reales.",
          );
        }
      } finally {
        if (!cancelled) {
          setRealRequestsLoading(false);
        }
      }
    };

    void loadRealRequests();

    return () => {
      cancelled = true;
    };
  }, [id, isSupabase, jobExistsInSeed]);

  const handleAcceptRequest = async (requestId: string) => {
    setAcceptingRequestId(requestId);
    try {
      await acceptRealJobRequest(requestId);
      const updated = await getClientJobRequestsWithProfessionalInfo(id);
      setRealRequests(updated);
    } catch (error) {
      setRealRequestsError(
        error instanceof Error && error.message
          ? error.message
          : "No pudimos aceptar esta solicitud. Inténtalo de nuevo.",
      );
    } finally {
      setAcceptingRequestId(null);
    }
  };

  const realJob = realAgreementContext?.status === "ready" ? realAgreementContext.job : null;
  const realAgreement = realAgreementContext?.status === "ready" ? realAgreementContext.agreement : null;
  const reviewSummary: DetailReviewSummary | undefined = isSupabase
    ? realReview
      ? {
          rating: realReview.rating,
          comment: realReview.comment,
          createdAt: realReview.createdAt,
        }
      : undefined
    : existingClientReview
      ? {
          rating: existingClientReview.rating,
          comment: existingClientReview.text,
          createdAt: existingClientReview.createdAt ?? existingClientReview.date,
        }
      : undefined;
  const canShowRealReviewBlock = Boolean(
    realJob?.status === "completed" && realAgreement?.paymentStatus === "released",
  );

  const acceptOffer = () => {
    if (!canAcceptOffer) return;
    acceptNegotiation(job.id, "client");
  };

  const sendCounteroffer = () => {
    const amount = Number(counterofferAmount || 0);
    if (!canCounteroffer || !amount) return;
    submitNegotiationProposal(job.id, "client", amount);
  };

  const applyAutoReleaseDemo = () => {
    if (!job.completionDeadline) return;
    autoReleaseCompletedJob(
      job.id,
      new Date(new Date(job.completionDeadline).getTime() + 1000).toISOString(),
    );
  };

  const createSearchTicketForJob = async (reason: "no_pros_in_zone" | "no_useful_response") => {
    if (!isSupabase) {
      createSearchTicket(job.id, reason);
      return;
    }

    setCreatingSearchTicketReason(reason);
    setSearchTicketActionError(null);
    setSearchTicketActionNotice(null);

    try {
      const ticket = await createRealSearchTicketFromJob(job.id, reason);
      setRealSearchTicket(ticket);
      setSearchTicketActionNotice("Ticket de búsqueda real creado correctamente.");
    } catch (error) {
      setSearchTicketActionError(
        error instanceof Error && error.message
          ? error.message
          : "No pudimos crear el ticket de búsqueda real.",
      );
    } finally {
      setCreatingSearchTicketReason(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar
        title={`Trabajo ${job.id}`}
        right={
          <HeaderIconButton
            label="Abrir opciones del trabajo"
            onClick={() => setMoreOpen(true)}
          >
            <Icon name="more" size={18} stroke={2} />
          </HeaderIconButton>
        }
      />

      <HeaderActionSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Opciones del trabajo"
        description="Acciones rápidas disponibles para este trabajo en la demo."
        items={[
          {
            label: "Ver solicitudes",
            description: "Revisa profesionales interesados en tu trabajo.",
            icon: "users",
            href: `/cliente/trabajos/${job.id}/solicitudes`,
          },
          {
            label: "Invitar profesionales",
            description: "Selecciona nuevos profesionales para este trabajo.",
            icon: "plus",
            href: `/cliente/trabajos/${job.id}/invitaciones`,
          },
          ...(canOpenChat
            ? [
                {
                  label: "Abrir chat",
                  description: "Accede a la negociación y seguimiento del acuerdo.",
                  icon: "chat",
                  href: `/chat/${job.id}`,
                },
              ]
            : []),
        ]}
      />

      <ScreenBody className="px-4 pt-3 pb-6">
        {isSupabase && realClientJobLoading && (
          <Card className="mb-3 text-[12px] text-ink-600 leading-snug">
            Cargando trabajo&hellip;
          </Card>
        )}

        {realClientJobError && (
          <Card className="mb-3 bg-rose-50 border-rose-100 text-[12px] text-rose-700 leading-snug">
            {realClientJobError}
          </Card>
        )}

        {realClientJobError && (
          <div className="text-center py-12">
            <div className="font-bold text-[15px] text-ink-800 mb-2">
              No pudimos cargar este trabajo
            </div>
            <div className="text-[12.5px] text-ink-400 mb-3">
              Comprueba que el identificador es correcto o vuelve a tu listado.
            </div>
            <Link
              href="/cliente/trabajos"
              className="inline-flex items-center gap-1.5 bg-coral-500 text-white rounded-full px-4 py-2 text-[13px] font-bold"
            >
              Ver mis trabajos
            </Link>
          </div>
        )}

        {showJobContent && (
          <div>
        {justPublished && (
          <Card className="bg-teal-50 border-teal-100 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-teal-500 text-white flex items-center justify-center">
                <Icon name="check" size={16} stroke={3} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-[14px] text-teal-700">
                  ¡Trabajo publicado!
                </div>
                <div className="text-[11.5px] text-teal-700/80">
                  En producción recibirías avisos cuando los profesionales
                  soliciten el trabajo.
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="mb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="font-extrabold text-[17px] text-ink-900 leading-tight">
              {job.title}
            </div>
            <StatusBadge status={job.status} />
          </div>
          <div className="text-[12px] text-ink-400 mb-3">
            {job.category} · {job.posted}
          </div>
          <p className="text-[13px] text-ink-600 leading-relaxed mb-3 whitespace-pre-wrap">
            {job.description}
          </p>
          <div className="flex flex-wrap gap-2 text-[12px] text-ink-500 border-t border-sand-200/70 pt-3">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="pin" size={12} stroke={2} />
              {job.location}
            </span>
            <span className="inline-flex items-center gap-1.5 ml-auto text-coral-600 font-bold">
              <Icon name="euro" size={12} stroke={2} />
              {formatEuro(job.priceMin)}–{formatEuro(job.priceMax)}
            </span>
          </div>
        </Card>

        <Card className="mb-3" testId={`client-job-status-${job.status}`}>
          <div className="font-bold text-[13.5px] text-ink-800 mb-3">Estado</div>
          <JobStatusTimeline status={job.status} />
        </Card>

        {activeNegotiation?.lastAmount && !resolvedAgreement && (
          <Card className="mb-3" testId="client-offer-panel">
            <div className="font-bold text-[13.5px] text-ink-800 mb-2">
              Oferta actual
            </div>
            <div className="mb-3 rounded-xl border border-sand-200/70 bg-sand-50 px-3.5 py-3 text-[12px] text-ink-600 leading-snug">
              {activeNegotiation.proposedBy === "pro"
                ? "El profesional te ha enviado una propuesta."
                : "Tu contraoferta está pendiente de revisión por el profesional."}
              <div className="mt-1 font-bold text-ink-800">
                {formatEuro(activeNegotiation.lastAmount)}
              </div>
            </div>
            {canAcceptOffer && (
              <div className="grid grid-cols-2 gap-2">
                <Button full onClick={acceptOffer} testId="client-accept-offer">
                  Aceptar presupuesto
                </Button>
                <Button full variant="outline" href={`/chat/${job.id}`}>
                  Abrir chat
                </Button>
              </div>
            )}
          </Card>
        )}

        {canCounteroffer && !resolvedAgreement && (
          <Card className="mb-3">
            <div className="font-bold text-[13.5px] text-ink-800 mb-2">
              Contraoferta
            </div>
            <Input
              label="Importe propuesto (€)"
              type="number"
              value={counterofferAmount}
              onChange={(event) => setCounterofferAmount(event.target.value)}
              data-testid="client-counteroffer-amount"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button full variant="outline" href={`/chat/${job.id}`}>
                Abrir chat
              </Button>
              <Button full onClick={sendCounteroffer} testId="client-send-counteroffer">
                Enviar contraoferta
              </Button>
            </div>
          </Card>
        )}

        {resolvedAgreement && (
          <Card className="mb-3 bg-teal-50/50 border-teal-100" testId="agreement-summary-client">
            <div className="font-bold text-[13px] text-teal-700 mb-1">
              Acuerdo alcanzado
            </div>
            <div className="text-[11.5px] text-teal-700/80 leading-snug">
              Precio final acordado: {formatEuro(resolvedAgreement.finalPrice)}.
            </div>
          </Card>
        )}

        {job.status === "dispute" && jobDispute && (
          <Card className="mb-3 bg-rose-50/70 border-rose-100" testId="client-dispute-open-state">
            <div className="font-bold text-[13px] text-rose-700 mb-1">
              Disputa abierta
            </div>
            <div className="text-[11.5px] text-rose-700/80 leading-snug">
              {jobDispute.openedBy === "client"
                ? `Hemos registrado tu disputa por "${jobDispute.reason}".`
                : `El profesional abrió una disputa por "${jobDispute.reason}".`} El acuerdo y el pago protegido mock siguen asociados a este trabajo mientras admin revisa el caso.
            </div>
          </Card>
        )}

        {job.status === "cancelled" && jobDispute?.status === "resolved_client" && (
          <Card className="mb-3 bg-teal-50/40 border-teal-100" testId="client-dispute-resolved-client-state">
            <div className="font-bold text-[13px] text-teal-700 mb-1">
              Disputa resuelta a tu favor
            </div>
            <div className="text-[11.5px] text-teal-700/80 leading-snug">
              Admin cerró este caso a favor del cliente y el trabajo quedó cancelado en la demo.
            </div>
          </Card>
        )}

        {job.status === "completed" && jobDispute && ["resolved_pro", "split"].includes(jobDispute.status) && (
          <Card className="mb-3 bg-violet-50/60 border-violet-100" testId="client-dispute-resolved-completed-state">
            <div className="font-bold text-[13px] text-violet-800 mb-1">
              Disputa cerrada
            </div>
            <div className="text-[11.5px] text-violet-700 leading-snug">
              Admin resolvió la disputa {jobDispute.status === "resolved_pro" ? "a favor del profesional" : "con resolución dividida"}. El trabajo queda completado en la demo.
            </div>
          </Card>
        )}

        {/* Solicitudes / invitaciones */}
        {isSupabase && !jobExistsInSeed && clientActions.includes("view_requests") ? (
          <Card className="mb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-[13.5px] text-ink-800">
                Solicitudes recibidas ({realRequests.length})
              </div>
            </div>
            {realRequestsLoading && (
              <div className="text-[11.5px] text-ink-400 leading-snug bg-sand-50 rounded-xl p-3">
                Cargando solicitudes&hellip;
              </div>
            )}
            {realRequestsError && (
              <div className="text-[11.5px] text-rose-600 leading-snug bg-rose-50 rounded-xl p-3 mb-2">
                {realRequestsError}
              </div>
            )}
            {!realRequestsLoading && !realRequestsError && realRequests.length === 0 && (
              <div className="text-[11.5px] text-ink-400 leading-snug bg-sand-50 rounded-xl p-3">
                Aún no hay solicitudes de profesionales.
              </div>
            )}
            {realRequests.length > 0 && (
              <div className="flex flex-col gap-2.5">
                {realRequests.slice(0, 3).map((req) => (
                  <div
                    key={req.requestId}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-sand-200"
                  >
                    <Avatar
                      initials={req.professionalAvatarInitials ?? req.professionalDisplayName.substring(0, 2).toUpperCase()}
                      size={40}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[13px] text-ink-800 truncate">
                        {req.professionalDisplayName}
                      </div>
                      <div className="text-[11px] text-ink-400">
                        {req.professionalSpecialtyLabel ?? "Sin especialidad"}
                        {req.professionalZone ? ` · ${req.professionalZone}` : ""}
                      </div>
                      {req.requestStatus === "accepted" && (
                        <div className="mt-2 inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-[10.5px] font-bold text-teal-700">
                          Solicitud aceptada
                        </div>
                      )}
                      {req.requestStatus === "pending" && (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => void handleAcceptRequest(req.requestId)}
                            disabled={acceptingRequestId !== null}
                            className="text-[11px] font-bold text-coral-600 bg-coral-50 px-2.5 py-1 rounded-lg disabled:opacity-50"
                          >
                            {acceptingRequestId === req.requestId ? "Aceptando..." : "Aceptar"}
                          </button>
                          <span className="text-[10.5px] text-ink-400">
                            La aceptación real conecta en un bloque posterior.
                          </span>
                        </div>
                      )}
                      {req.requestMessage && (
                        <div className="mt-2 text-[12px] text-ink-600 bg-sand-50 rounded-lg p-2.5 border border-sand-200/70 leading-relaxed">
                          &ldquo;{req.requestMessage}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {clientActions.includes("invite_pros") && (
              <div className="text-center text-[11.5px] text-ink-400 mt-3 pt-3 border-t border-sand-200/70">
                Las invitaciones reales se conectarán en un bloque posterior.
              </div>
            )}
          </Card>
        ) : clientActions.includes("view_requests") && (
          <Card className="mb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-[13.5px] text-ink-800">
                Solicitudes recibidas ({job.requests})
              </div>
              <Link
                href={`/cliente/trabajos/${job.id}/solicitudes`}
                className="text-[12px] text-coral-600 font-bold"
              >
                Ver todas
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              {requestingPros.slice(0, 3).map(({ professional, jobRequest }) => (
                <div
                  key={jobRequest?.id ?? professional.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-sand-200"
                >
                  <Avatar initials={professional.avatar} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[13px] text-ink-800 truncate">
                      {professional.name}
                    </div>
                    <div className="text-[11px] text-ink-400">
                      {professional.specialty} · ★ {professional.rating.toFixed(1)} · {professional.responseTime}
                    </div>
                    {jobRequest?.status === "accepted" && (
                      <div className="mt-2 inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-[10.5px] font-bold text-teal-700">
                        Solicitud aceptada
                      </div>
                    )}
                    {jobRequest?.status === "rejected" && (
                      <div className="mt-2 inline-flex rounded-full bg-sand-100 px-2.5 py-1 text-[10.5px] font-bold text-ink-500">
                        Solicitud rechazada
                      </div>
                    )}
                    {jobRequest?.message && (
                      <div className="mt-2 text-[12px] text-ink-600 bg-sand-50 rounded-lg p-2.5 border border-sand-200/70 leading-relaxed">
                        “{jobRequest.message}”
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/profesional/perfil?id=${professional.id}&jobId=${job.id}`}
                    className="text-[11.5px] font-bold text-coral-600 bg-coral-50 px-2.5 py-1.5 rounded-lg"
                  >
                    Ver
                  </Link>
                </div>
              ))}
            </div>
            {clientActions.includes("invite_pros") && (
              <Link
                href={`/cliente/trabajos/${job.id}/invitaciones`}
                className="block text-center text-[12px] font-bold text-coral-600 mt-3 pt-3 border-t border-sand-200/70"
              >
                + Invitar a otros profesionales
              </Link>
            )}
          </Card>
        )}

        {!clientActions.includes("view_requests") && acceptedJobRequest && (
          <Card className="mb-3 bg-teal-50/50 border-teal-100">
            <div className="font-bold text-[13px] text-teal-700 mb-1">
              Solicitud aceptada
            </div>
            <div className="text-[11.5px] text-teal-700/80 leading-snug">
              Has aceptado a {acceptedJobRequest.proName} para este trabajo.
            </div>
          </Card>
        )}

        {/* Pro asignado */}
        {assignedPro && (
          <Card className="mb-3">
            <div className="font-bold text-[13.5px] text-ink-800 mb-3">
              Profesional asignado
            </div>
            <div className="flex items-center gap-3 mb-3">
              <Avatar initials={assignedPro.avatar} size={48} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[14px] text-ink-800 truncate">
                  {assignedPro.name}
                </div>
                <div className="text-[12px] text-ink-400">
                  {assignedPro.specialty} · ★ {assignedPro.rating.toFixed(1)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {canOpenChat ? (
                <Link
                  href={`/chat/${job.id}`}
                  className="bg-coral-500 text-white text-center text-[12.5px] font-bold rounded-xl py-2.5"
                >
                  Abrir chat
                </Link>
              ) : (
                <div className="bg-sand-100 text-ink-500 text-center text-[12.5px] font-bold rounded-xl py-2.5">
                  Chat tras aceptación
                </div>
              )}
              <Link
                href={`/profesional/perfil?id=${assignedPro.id}`}
                className="bg-sand-100 text-ink-700 text-center text-[12.5px] font-bold rounded-xl py-2.5"
              >
                Ver perfil
              </Link>
            </div>
          </Card>
        )}

        {searchTicketActionError && (
          <Card className="mb-3 bg-rose-50 border-rose-100 text-[12px] text-rose-700 leading-snug">
            {searchTicketActionError}
          </Card>
        )}

        {searchTicketActionNotice && (
          <Card className="mb-3 bg-teal-50 border-teal-100 text-[12px] text-teal-700 leading-snug">
            {searchTicketActionNotice}
          </Card>
        )}

        {isSupabase && !jobExistsInSeed && job.status === "published" && searchTicketState !== "ticket_created" ? (
          <Card className="mb-3 bg-coral-50/50 border-coral-100">
            <div className="font-bold text-[13px] text-coral-700 mb-1">
              ¿Necesitas ayuda para encontrar profesionales?
            </div>
            <div className="text-[11.5px] text-coral-700/80 leading-snug mb-3">
              Activa la búsqueda de profesionales para que podamos ayudarte a encontrar cobertura en tu zona.
            </div>
            <Button
              size="sm"
              full
              onClick={() => void createSearchTicketForJob("no_pros_in_zone")}
              disabled={creatingSearchTicketReason !== null}
              testId="create-search-ticket"
            >
              {creatingSearchTicketReason !== null ? "Creando..." : "Activar búsqueda de profesionales"}
            </Button>
          </Card>
        ) : searchTicketState === "ticket_created" && effectiveSearchTicket ? (
          <Card className="mb-3 bg-teal-50/50 border-teal-100">
            <div className="font-bold text-[13px] text-teal-700 mb-1">
              Ticket de búsqueda creado
            </div>
            <div className="text-[11.5px] text-teal-700/80 leading-snug">
              {effectiveSearchTicket.reason === "no_pros_in_zone"
                ? "Admin ya tiene un ticket para buscar profesionales en tu zona."
                : "Admin ya tiene un ticket por falta de respuesta útil a tus invitaciones."}
            </div>
          </Card>
        ) : searchTicketState === "no_pros_cta" ? (
          <Card className="mb-3 bg-coral-50/50 border-coral-100">
            <div className="font-bold text-[13px] text-coral-700 mb-1">
              ¿Necesitas ayuda para encontrar profesionales?
            </div>
            <div className="text-[11.5px] text-coral-700/80 leading-snug mb-3">
              No vemos profesionales aprobados en tu zona para este trabajo.
            </div>
            <Button
              size="sm"
              full
              onClick={() => void createSearchTicketForJob("no_pros_in_zone")}
              disabled={creatingSearchTicketReason !== null}
              testId="create-search-ticket"
            >
              {creatingSearchTicketReason === "no_pros_in_zone" ? "Creando..." : "Crear ticket de búsqueda"}
            </Button>
          </Card>
        ) : searchTicketState === "waiting_info" ? (
          <Card className="mb-3 bg-amber-50/60 border-amber-100">
            <div className="font-bold text-[13px] text-amber-700 mb-1">
              Aún estamos esperando respuesta
            </div>
            <div className="text-[11.5px] text-amber-700/80 leading-snug">
              Si en {adminConfig.searchTicketNoResponseDays} días no recibes solicitudes, indícanoslo para ayudarte.
            </div>
          </Card>
        ) : searchTicketState === "no_response_cta" ? (
          <Card className="mb-3 bg-coral-50/50 border-coral-100">
            <div className="font-bold text-[13px] text-coral-700 mb-1">
              ¿Necesitas ayuda para encontrar profesionales?
            </div>
            <div className="text-[11.5px] text-coral-700/80 leading-snug mb-3">
              Han pasado {adminConfig.searchTicketNoResponseDays} días sin respuesta útil tras las invitaciones.
            </div>
            <Button
              size="sm"
              full
              onClick={() => void createSearchTicketForJob("no_useful_response")}
              disabled={creatingSearchTicketReason !== null}
              testId="create-search-ticket"
            >
              {creatingSearchTicketReason === "no_useful_response" ? "Creando..." : "Crear ticket de búsqueda"}
            </Button>
          </Card>
        ) : null}

        {/* CTAs según estado */}
        <ActionsForStatus
          jobId={job.id}
          status={job.status}
          priceMin={job.priceMin}
          priceMax={job.priceMax}
          finalPrice={finalPrice}
          actions={clientActions}
          postPaymentActions={postPaymentActions}
          existingReview={reviewSummary}
          completionDeadline={job.completionDeadline}
          autoReleaseApplied={autoReleaseApplied}
          onApplyAutoReleaseDemo={applyAutoReleaseDemo}
          isSupabase={isSupabase}
          canShowRealReviewBlock={canShowRealReviewBlock}
        />
        </div>
        )}
      </ScreenBody>
    </div>
  );
}

function ActionsForStatus({
  jobId,
  status,
  priceMin,
  priceMax,
  finalPrice,
  actions,
  postPaymentActions,
  existingReview,
  completionDeadline,
  autoReleaseApplied,
  onApplyAutoReleaseDemo,
  isSupabase,
  canShowRealReviewBlock,
}: {
  jobId: string;
  status: JobStatus;
  priceMin: number;
  priceMax: number;
  finalPrice?: number;
  actions: ReturnType<typeof getJobActionsForClient>;
  postPaymentActions: ReturnType<typeof getPostPaymentJobActionsForClient>;
  existingReview?: DetailReviewSummary;
  completionDeadline?: string;
  autoReleaseApplied: boolean;
  onApplyAutoReleaseDemo: () => void;
  isSupabase: boolean;
  canShowRealReviewBlock: boolean;
}) {
  if (actions.includes("pay")) {
    return (
      <Card className="mb-3 bg-amber-50/60 border-amber-100" testId="client-pay-cta-card">
        <div className="font-bold text-[13.5px] text-amber-800 mb-1">
          Acuerdo alcanzado · Falta pago
        </div>
        <div className="text-[12px] text-amber-700 mb-3">
          Completa el pago protegido mock para retener los fondos dentro de la demo.
        </div>
        <Button full href={`/cliente/trabajos/${jobId}/pagar`} testId="client-pay-protected">
          Pagar y proteger {formatEuro(finalPrice ?? Math.round((priceMin + priceMax) / 2))}
        </Button>
      </Card>
    );
  }
  if (
    actions.includes("confirm_completion") &&
    postPaymentActions.canConfirmCompletion
  ) {
    return (
      <Card className="mb-3 bg-violet-50/60 border-violet-100" testId="client-confirm-completion-card">
        <div className="font-bold text-[13.5px] text-violet-800 mb-1">
          El profesional marcó el trabajo como terminado
        </div>
        <div className="text-[12px] text-violet-700 mb-3">
          Revisa el resultado y confirma el cierre del trabajo en la demo. El pago protegido mock sigue asociado al acuerdo.
        </div>
        {completionDeadline && (
          <div className="mb-3 rounded-xl border border-violet-100 bg-white px-3 py-2 text-[11.5px] text-violet-700 leading-snug" data-testid="client-auto-release-deadline">
            Auto-release demo en {Math.max(0, daysBetween(new Date().toISOString(), completionDeadline))} día{Math.max(0, daysBetween(new Date().toISOString(), completionDeadline)) === 1 ? "" : "s"} si no confirmas ni abres disputa.
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button full href={`/cliente/trabajos/${jobId}/confirmar`} testId="client-confirm-completion">
            Confirmar trabajo
          </Button>
          {actions.includes("open_dispute") && postPaymentActions.canOpenDispute && (
            <Button full variant="outline" href={`/cliente/trabajos/${jobId}/disputa`} testId="client-open-dispute">
              Abrir disputa
            </Button>
          )}
        </div>
        <Button full variant="outline" className="mt-2" onClick={onApplyAutoReleaseDemo} testId="client-apply-auto-release-demo">
          Aplicar auto-release demo
        </Button>
      </Card>
    );
  }
  if (status === "completed") {
    return (
      <>
        <Card className="mb-3 bg-teal-50/40 border-teal-100" testId={autoReleaseApplied ? "client-auto-release-applied-state" : "client-job-completed-state"}>
          <div className="font-bold text-[13.5px] text-teal-700 mb-1">
            Trabajo completado
          </div>
          <div className="text-[11.5px] text-teal-700/80 leading-snug">
            {autoReleaseApplied
              ? "El trabajo se completó por auto-release demo tras vencer el plazo de confirmación."
              : "El cliente ya confirmó este trabajo en la demo y el acuerdo queda cerrado."} El pago protegido mock sigue visible como referencia del flujo.
          </div>
        </Card>
        {(!isSupabase || canShowRealReviewBlock) && (existingReview ? (
          <Card className="mb-3" testId="client-review-summary">
            <div className="font-bold text-[13.5px] text-ink-800 mb-1">
              Valoración del trabajo
            </div>
            <div className="text-[12px] text-ink-600 leading-snug mb-1">
              Ya has valorado este trabajo.
            </div>
            <div className="text-[12px] text-ink-600 leading-snug mb-1">
              {existingReview.rating} de 5 estrellas
            </div>
            {existingReview.comment && (
              <div className="text-[11.5px] text-ink-500 leading-snug mb-1">
                {existingReview.comment}
              </div>
            )}
            {formatReviewDate(existingReview.createdAt) && (
              <div className="text-[11px] text-ink-400 leading-snug">
                {formatReviewDate(existingReview.createdAt)}
              </div>
            )}
          </Card>
        ) : (
          <Card className="mb-3" testId="client-review-cta-card">
            <div className="font-bold text-[13.5px] text-ink-800 mb-2">
              Valoración del trabajo
            </div>
            <div className="text-[11.5px] text-ink-500 leading-snug mb-3">
              Tu opinión ayuda a otros clientes a elegir profesionales de confianza.
            </div>
            <Button full href={`/cliente/trabajos/${jobId}/valorar`} testId="client-review-cta">
              Valorar al profesional
            </Button>
          </Card>
        ))}
      </>
    );
  }
  if (
    postPaymentActions.showsProtectedPayment &&
    (
      status === "escrow_funded" ||
      status === "in_progress" ||
      status === "completed_pending_confirmation" ||
      status === "dispute"
    )
  ) {
    return (
      <Card className="mb-3 bg-teal-50/40 border-teal-100" testId="client-protected-payment-state">
        <div className="flex items-center gap-2 text-[12.5px] font-bold text-teal-700 mb-1">
          <Icon name="shield" size={14} />
          Pago protegido en custodia
        </div>
        <div className="text-[11.5px] text-teal-700/80 leading-snug">
          {formatEuro(finalPrice ?? Math.round((priceMin + priceMax) / 2))} siguen asociados al acuerdo como pago protegido mock.
        </div>
      </Card>
    );
  }
  return null;
}

export default function Page({ params }: Props) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div />}>
      <Inner id={id} />
    </Suspense>
  );
}
