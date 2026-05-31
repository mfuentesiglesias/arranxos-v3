"use client";
import { use, useEffect, useMemo, useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { RatingStars } from "@/components/pros/rating-stars";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getMyJobById, type ApiClientJob } from "@/lib/api/clientJobs";
import {
  createJobInvitation,
  listInvitableProfessionalsForJob,
  type ApiInvitableProfessionalCandidate,
} from "@/lib/api/jobInvitations";
import { jobs, professionals } from "@/lib/data";
import {
  getProfessionalsInZoneForJob,
  getSearchTicketClientState,
} from "@/lib/domain/policies";
import {
  getEffectiveAdminConfig,
  getEffectiveJobById,
  useSession,
} from "@/lib/store";
import type { JobStatus } from "@/lib/types";
import { isSupabaseMode } from "@/lib/supabase/config";

interface Props {
  params: Promise<{ id: string }>;
}

function getMatchBadge(candidate: ApiInvitableProfessionalCandidate) {
  switch (candidate.matchKind) {
    case "service":
      return { label: "Coincide con el servicio", color: "coral" as const };
    case "category":
      return { label: "Coincide con la categoría", color: "sky" as const };
    default:
      return { label: "Candidato disponible", color: "sand" as const };
  }
}

function getInvitationStatusLabel(status: ApiInvitableProfessionalCandidate["invitationStatus"]) {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "accepted":
      return "Aceptada";
    case "rejected":
      return "Rechazada";
    case "expired":
      return "Caducada";
    case "cancelled":
      return "Cancelada";
    default:
      return null;
  }
}

export default function Page({ params }: Props) {
  const { id } = use(params);
  const session = useSession();
  const adminConfig = useSession(getEffectiveAdminConfig);
  const isSupabase = isSupabaseMode();
  const effectiveJob = useMemo(() => getEffectiveJobById(session, id), [session, id]);
  const jobFromSeed = effectiveJob ?? jobs.find((j) => j.id === id) ?? null;
  const jobExistsInSeed = Boolean(jobFromSeed);
  const useRealJob = isSupabase && !jobExistsInSeed;
  const outreachMeta = session.jobOutreachMeta[id];
  const searchTicket = useMemo(
    () => session.searchTickets.find((ticket) => ticket.jobId === id),
    [session.searchTickets, id],
  );
  const recordInvitationsSent = useSession((s) => s.recordInvitationsSent);
  const createSearchTicket = useSession((s) => s.createSearchTicket);
  const job = jobFromSeed ?? jobs[0];
  const limit = adminConfig.invitationLimitPerJob;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sent, setSent] = useState(false);
  const [realClientJob, setRealClientJob] = useState<ApiClientJob | null>(null);
  const [realClientJobLoading, setRealClientJobLoading] = useState(false);
  const [realClientJobError, setRealClientJobError] = useState<string | null>(null);
  const [realCandidates, setRealCandidates] = useState<ApiInvitableProfessionalCandidate[]>([]);
  const [realCandidatesLoading, setRealCandidatesLoading] = useState(false);
  const [realCandidatesError, setRealCandidatesError] = useState<string | null>(null);
  const [invitingProfessionalId, setInvitingProfessionalId] = useState<string | null>(null);
  const [invitationSuccessMessage, setInvitationSuccessMessage] = useState<string | null>(null);
  const [invitationErrorMessage, setInvitationErrorMessage] = useState<string | null>(null);
  const prosInZone = getProfessionalsInZoneForJob(job, professionals);
  const searchTicketState = getSearchTicketClientState({
    job,
    professionals,
    outreachMeta,
    existingTicket: searchTicket,
    daysThreshold: adminConfig.searchTicketNoResponseDays,
  });

  useEffect(() => {
    if (!useRealJob) {
      setRealClientJob(null);
      setRealClientJobError(null);
      setRealClientJobLoading(false);
      return;
    }

    let cancelled = false;

    const loadRealJob = async () => {
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

    void loadRealJob();

    return () => {
      cancelled = true;
    };
  }, [id, useRealJob]);

  useEffect(() => {
    if (!useRealJob) {
      setRealCandidates([]);
      setRealCandidatesError(null);
      setRealCandidatesLoading(false);
      return;
    }

    let cancelled = false;

    const loadRealCandidates = async () => {
      setRealCandidatesLoading(true);
      setRealCandidatesError(null);

      try {
        const candidates = await listInvitableProfessionalsForJob(id);
        if (!cancelled) {
          setRealCandidates(candidates);
        }
      } catch (error) {
        if (!cancelled) {
          setRealCandidatesError(
            error instanceof Error && error.message
              ? error.message
              : "No pudimos cargar los profesionales disponibles.",
          );
        }
      } finally {
        if (!cancelled) {
          setRealCandidatesLoading(false);
        }
      }
    };

    void loadRealCandidates();

    return () => {
      cancelled = true;
    };
  }, [id, useRealJob]);

  const toggle = (proId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(proId)) next.delete(proId);
      else if (next.size < limit) next.add(proId);
      return next;
    });
  };

  const candidates = professionals.filter((p) => p.status === "approved").slice(0, 12);

  const send = () => {
    recordInvitationsSent(id, selected.size);
    setSent(true);
    setTimeout(() => history.back(), 700);
  };

  const createTicketForJob = async (reason: "no_pros_in_zone" | "no_useful_response") => {
    createSearchTicket(id, reason);
  };

  const handleInviteProfessional = async (professionalId: string) => {
    setInvitationSuccessMessage(null);
    setInvitationErrorMessage(null);
    setInvitingProfessionalId(professionalId);

    try {
      const invitation = await createJobInvitation(id, professionalId);
      setInvitationSuccessMessage("Invitación enviada al profesional Dersux.");

      try {
        const [updatedCandidates, updatedJob] = await Promise.all([
          listInvitableProfessionalsForJob(id),
          getMyJobById(id),
        ]);

        setRealCandidates(updatedCandidates);
        setRealCandidatesError(null);

        if (updatedJob) {
          setRealClientJob(updatedJob);
          setRealClientJobError(null);
        }
      } catch {
        setRealCandidates((current) =>
          current.map((candidate) =>
            candidate.professionalId === professionalId
              ? {
                  ...candidate,
                  invitationId: invitation.invitationId,
                  invitationStatus: invitation.status,
                  invitationCreatedAt: invitation.createdAt,
                }
              : candidate,
          ),
        );
        setRealClientJob((current) =>
          current
            ? {
                ...current,
                invitedCount: current.invitedCount + 1,
                invitationsSentAt: invitation.createdAt,
              }
            : current,
        );
      }
    } catch (error) {
      setInvitationErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "No pudimos enviar la invitación real. Inténtalo de nuevo.",
      );

      try {
        const [updatedCandidates, updatedJob] = await Promise.all([
          listInvitableProfessionalsForJob(id),
          getMyJobById(id),
        ]);

        setRealCandidates(updatedCandidates);
        setRealCandidatesError(null);

        if (updatedJob) {
          setRealClientJob(updatedJob);
          setRealClientJobError(null);
        }
      } catch {
        // Keep the existing list and safe error message if refresh fails.
      }
    } finally {
      setInvitingProfessionalId(null);
    }
  };

  if (useRealJob) {
    const realJobStatus = (realClientJob?.status ?? "published") as JobStatus;

    return (
      <div className="flex-1 flex flex-col bg-sand-50">
        <StatusBar />
        <TopBar
          title="Invitar profesionales"
          subtitle={realClientJob?.title ?? "Trabajo real"}
        />
        <ScreenBody className="px-4 pt-3 pb-6">
          {realClientJobLoading ? (
            <Card className="bg-white border-sand-200 text-[13px] text-ink-600 leading-snug">
              Cargando trabajo real...
            </Card>
          ) : realClientJobError ? (
            <Card className="bg-rose-50 border-rose-100 text-[12px] text-rose-700 leading-snug">
              {realClientJobError}
            </Card>
          ) : realClientJob ? (
            <>
              <Card className="bg-white border-sand-200 mb-3">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-[14px] font-bold text-ink-800 leading-snug">
                      {realClientJob.title}
                    </div>
                    <div className="text-[12px] text-ink-500 mt-1">
                      {realClientJob.approxLocation ?? "Ubicación aproximada no disponible"}
                    </div>
                  </div>
                  <StatusBadge status={realJobStatus} />
                </div>

                <div className="text-[12px] text-ink-600 leading-snug">
                  La invitación real se preparó a nivel seguro en backend. El límite por trabajo se validará server-side con <code>admin_config.invitation_limit_per_job</code>.
                </div>
              </Card>

              <Card className="bg-amber-50/60 border-amber-100 mb-3 text-[12px] text-amber-700 leading-snug">
                Mostrando solo datos públicos mínimos de profesionales Dersux. Invitar no abre chat ni revela la dirección exacta.
              </Card>

              {invitationErrorMessage && (
                <Card
                  className="bg-rose-50 border-rose-100 mb-3 text-[12px] text-rose-700 leading-snug"
                  testId="real-invitation-error"
                >
                  {invitationErrorMessage}
                </Card>
              )}

              {invitationSuccessMessage && (
                <Card
                  className="bg-teal-50 border-teal-100 mb-3 text-[12px] text-teal-700 leading-snug"
                  testId="real-invitation-success"
                >
                  {invitationSuccessMessage}
                </Card>
              )}

              {realCandidatesLoading ? (
                <Card
                  className="bg-white border-sand-200 text-[13px] text-ink-600 leading-snug"
                  testId="real-invitation-candidates-loading"
                >
                  Cargando profesionales disponibles...
                </Card>
              ) : realCandidatesError ? (
                <Card
                  className="bg-rose-50 border-rose-100 text-[12px] text-rose-700 leading-snug"
                  testId="real-invitation-candidates-error"
                >
                  {realCandidatesError}
                </Card>
              ) : realCandidates.length === 0 ? (
                <Card
                  className="bg-white border-sand-200 text-[12px] text-ink-600 leading-snug"
                  testId="real-invitation-candidates-empty"
                >
                  No encontramos profesionales aprobados para mostrar en este trabajo todavía.
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {realCandidates.map((candidate) => {
                    const matchBadge = getMatchBadge(candidate);
                    const invitationStatusLabel = getInvitationStatusLabel(candidate.invitationStatus);

                    return (
                      <Card
                        key={candidate.professionalId}
                        className="bg-white border-sand-200"
                        testId={`real-invitation-candidate-${candidate.professionalId}`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar initials={candidate.avatarInitials ?? "PD"} size={44} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div>
                                <div className="font-bold text-[13.5px] text-ink-800 truncate">
                                  {candidate.displayName}
                                </div>
                                <div className="text-[11px] font-semibold text-coral-600">
                                  Profesional Dersux
                                </div>
                              </div>
                              <Badge color={matchBadge.color}>{matchBadge.label}</Badge>
                            </div>

                            <div className="text-[11.5px] text-ink-500">
                              {(candidate.specialtyLabel ?? "Especialidad no disponible")}
                              {candidate.zone ? ` · ${candidate.zone}` : ""}
                            </div>

                            {candidate.matchedServiceName && (
                              <div className="mt-1 text-[11px] text-ink-500">
                                Servicio relacionado: {candidate.matchedServiceName}
                                {candidate.isPrimaryService ? " · principal" : ""}
                              </div>
                            )}

                            {candidate.reviewCount > 0 && candidate.averageRating !== null ? (
                              <div className="mt-2 flex items-center gap-1.5">
                                <RatingStars value={candidate.averageRating} />
                                <span className="text-[11px] font-bold text-ink-700">
                                  {candidate.averageRating.toFixed(1)}
                                </span>
                                <span className="text-[11px] text-ink-400">
                                  ({candidate.reviewCount} reseñas)
                                </span>
                              </div>
                            ) : (
                              <div className="mt-2 text-[11px] text-ink-400 italic">
                                Sin reseñas visibles todavía.
                              </div>
                            )}

                            {candidate.invitationStatus && (
                              <div className="mt-2 flex items-center gap-2" data-testid={`invitation-status-${candidate.professionalId}`}>
                                <Badge color="teal">Ya invitado</Badge>
                                {invitationStatusLabel && <Badge color="sand">{invitationStatusLabel}</Badge>}
                              </div>
                            )}

                            <Button
                              full
                              variant={candidate.invitationStatus ? "outline" : "primary"}
                              disabled={Boolean(candidate.invitationStatus) || invitingProfessionalId !== null}
                              onClick={
                                candidate.invitationStatus
                                  ? undefined
                                  : () => void handleInviteProfessional(candidate.professionalId)
                              }
                              className="mt-3"
                              testId={`invite-professional-${candidate.professionalId}`}
                            >
                              {candidate.invitationStatus
                                ? "Ya invitado"
                                : invitingProfessionalId === candidate.professionalId
                                  ? "Enviando..."
                                  : "Invitar"}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}
        </ScreenBody>

        <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
          <Button full variant="outline" href={`/cliente/trabajos/${id}`}>
            Volver al detalle
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar
        title="Invitar profesionales"
        subtitle={`Máx. ${limit} invitaciones · ${job.title}`}
      />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="bg-amber-50/50 border-amber-100 mb-3">
          <div className="text-[12px] text-amber-700 leading-snug">
            Las invitaciones permiten avisar a profesionales seleccionados sobre
            tu trabajo. Hasta <strong>{limit}</strong> por trabajo (configurable
            por admin).
          </div>
        </Card>

        {searchTicketState === "ticket_created" ? (
          <Card className="bg-teal-50/50 border-teal-100 mb-3">
            <div className="text-[12px] text-teal-700 leading-snug">
              Ya existe un ticket de búsqueda para este trabajo. Admin puede seguirlo desde panel y tú recibirás avisos en notificaciones.
            </div>
          </Card>
        ) : searchTicketState === "no_pros_cta" ? (
          <Card className="bg-coral-50/50 border-coral-100 mb-3">
            <div className="text-[12px] text-coral-700 leading-snug mb-3">
              No detectamos profesionales cercanos para este trabajo. Puedes crear un ticket para que admin impulse la búsqueda.
            </div>
            <Button
              size="sm"
              full
              onClick={() => void createTicketForJob("no_pros_in_zone")}
            >
              Crear ticket de búsqueda
            </Button>
          </Card>
        ) : searchTicketState === "waiting_info" ? (
          <Card className="bg-amber-50/60 border-amber-100 mb-3">
            <div className="text-[12px] text-amber-700 leading-snug">
              Si en {adminConfig.searchTicketNoResponseDays} días no recibes solicitudes, indícanoslo para ayudarte.
            </div>
          </Card>
        ) : searchTicketState === "no_response_cta" ? (
          <Card className="bg-coral-50/50 border-coral-100 mb-3">
            <div className="text-[12px] text-coral-700 leading-snug mb-3">
              Han pasado {adminConfig.searchTicketNoResponseDays} días sin respuesta útil tras las invitaciones. Puedes crear ticket de búsqueda.
            </div>
            <Button
              size="sm"
              full
              onClick={() => void createTicketForJob("no_useful_response")}
            >
              Crear ticket de búsqueda
            </Button>
          </Card>
        ) : null}

        {prosInZone.length === 0 && (
          <div className="text-[11px] text-ink-400 px-1 mb-2">
            No hay profesionales aprobados en la zona detectada del trabajo.
          </div>
        )}

        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[12.5px] font-bold text-ink-700">
            {selected.size}/{limit} seleccionados
          </span>
          <button
            onClick={() => setSelected(new Set())}
            disabled={selected.size === 0}
            className="text-[12px] font-bold text-coral-600 disabled:opacity-40"
          >
            Limpiar
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {candidates.map((p) => {
            const sel = selected.has(p.id);
            const disabled = !sel && selected.size >= limit;
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                disabled={disabled}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border-[1.5px] transition text-left ${
                  sel
                    ? "border-coral-500 bg-coral-50"
                    : "border-sand-200 bg-white"
                } ${disabled ? "opacity-40" : ""}`}
              >
                <Avatar initials={p.avatar} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[13.5px] text-ink-800 truncate">
                    {p.name}
                  </div>
                  <div className="text-[11.5px] text-ink-500 mb-1">
                    {p.specialty} · {p.location}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RatingStars value={p.rating} />
                    <span className="text-[11px] font-bold text-ink-700">
                      {p.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center transition ${
                    sel
                      ? "bg-coral-500 border-coral-500 text-white"
                      : "border-sand-300 bg-white"
                  }`}
                >
                  {sel && <Icon name="check" size={12} stroke={3} />}
                </div>
              </button>
            );
          })}
        </div>
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button full onClick={send} disabled={selected.size === 0 || sent}>
          {sent
            ? `${selected.size} invitaciones enviadas ✓`
            : `Invitar a ${selected.size} profesional${selected.size === 1 ? "" : "es"}`}
        </Button>
      </div>
    </div>
  );
}
