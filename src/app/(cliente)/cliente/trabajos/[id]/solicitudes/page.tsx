"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { RatingStars } from "@/components/pros/rating-stars";
import { VerifiedDot } from "@/components/pros/verified-dot";
import { Icon } from "@/components/ui/icon";
import {
  acceptJobRequest,
  getClientJobRequestsWithProfessionalInfo,
  type ApiClientJobRequestWithProfessionalInfo,
} from "@/lib/api/jobRequests";
import { getCurrentProfile } from "@/lib/api/profiles";
import { jobs, professionals } from "@/lib/data";
import { getAcceptedJobRequestForJob, getEffectiveJobById, useSession } from "@/lib/store";
import { isSupabaseMode } from "@/lib/supabase/config";
import type { JobRequest } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

const REQUEST_STATUS_LABELS: Record<
  ApiClientJobRequestWithProfessionalInfo["requestStatus"],
  string
> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  rejected: "Rechazada",
  closed: "Cerrada",
  cancelled: "Cancelada",
};

const PROFESSIONAL_STATUS_LABELS: Record<
  ApiClientJobRequestWithProfessionalInfo["professionalStatus"],
  string
> = {
  pending: "Pendiente",
  approved: "Aprobado",
  blocked: "Bloqueado",
};

const VERIFICATION_STATUS_LABELS: Record<
  ApiClientJobRequestWithProfessionalInfo["professionalVerificationStatus"],
  string
> = {
  not_verified: "Sin verificar",
  pending: "Verificacion pendiente",
  verified: "Verificado",
  rejected: "Verificacion rechazada",
};

function formatRequestCreatedAt(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function getProfessionalAvatarInitials(
  request: ApiClientJobRequestWithProfessionalInfo,
): string {
  if (request.professionalAvatarInitials) {
    return request.professionalAvatarInitials;
  }

  const fallback = request.professionalDisplayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return fallback || "PR";
}

export default function Page({ params }: Props) {
  const { id } = use(params);
  type RequestorEntry = {
    professional: (typeof professionals)[number];
    jobRequest?: JobRequest;
  };
  type ActualRequestorEntry = {
    professional: (typeof professionals)[number];
    jobRequest: JobRequest;
  };
  const isSupabase = isSupabaseMode();
  const session = useSession();
  const effectiveResolvedJob = getEffectiveJobById(session, id);
  const acceptedJobRequest = getAcceptedJobRequestForJob(session, id);
  const jobRequests = useSession((s) => s.jobRequests);
  const job = effectiveResolvedJob ?? jobs.find((j) => j.id === id) ?? jobs[0];
  const [sort, setSort] = useState<"relevant" | "rating" | "price">("relevant");
  const [supabaseRequests, setSupabaseRequests] = useState<
    ApiClientJobRequestWithProfessionalInfo[]
  >([]);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [isLoadingSupabaseRequests, setIsLoadingSupabaseRequests] = useState(false);
  const [acceptingRequestId, setAcceptingRequestId] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState<string | null>(null);
  const [supabaseReloadKey, setSupabaseReloadKey] = useState(0);
  const effectiveJobRequests = (jobRequests ?? []).filter(
    (jobRequest) => jobRequest.jobId === id,
  );
  const jobExistsInSeed = jobs.some((seedJob) => seedJob.id === id);
  const requestors =
    effectiveJobRequests.length > 0
      ? effectiveJobRequests
          .map((jobRequest) => {
            const professional = professionals.find((entry) => entry.id === jobRequest.proId);
            return professional
              ? { professional, jobRequest }
              : undefined;
          })
          .filter((request): request is ActualRequestorEntry => Boolean(request))
      : jobExistsInSeed
        ? professionals
            .filter((p) => p.status === "approved")
            .slice(0, job.requests || 3)
            .map((professional) => ({ professional, jobRequest: undefined }))
        : [];

  const sorted = [...requestors].sort((a: RequestorEntry, b: RequestorEntry) => {
    if (sort === "rating") return b.professional.rating - a.professional.rating;
    if (sort === "price") {
      return (a.professional.reviews ?? 0) - (b.professional.reviews ?? 0);
    }
    return 0;
  });

  useEffect(() => {
    if (!isSupabase) {
      return;
    }

    let isCancelled = false;

    async function loadSupabaseRequests() {
      setIsLoadingSupabaseRequests(true);
      setSupabaseError(null);

      try {
        const currentProfile = await getCurrentProfile();

        if (!currentProfile || currentProfile.role !== "client") {
          throw new Error("No puedes ver las solicitudes de este trabajo.");
        }

        const requests = await getClientJobRequestsWithProfessionalInfo(id);

        if (!isCancelled) {
          setSupabaseRequests(requests);
        }
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "No pudimos cargar las solicitudes de este trabajo.";

        if (!isCancelled) {
          setSupabaseRequests([]);
          setSupabaseError(message);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingSupabaseRequests(false);
        }
      }
    }

    void loadSupabaseRequests();

    return () => {
      isCancelled = true;
    };
  }, [id, isSupabase, supabaseReloadKey]);

  const handleAcceptSupabaseRequest = async (
    request: ApiClientJobRequestWithProfessionalInfo,
  ) => {
    if (request.requestStatus !== "pending" || acceptingRequestId) {
      return;
    }

    const confirmed = window.confirm(
      "Al aceptar se creará el chat y se revelará la dirección exacta solo al profesional aceptado. ¿Quieres continuar?",
    );

    if (!confirmed) {
      return;
    }

    setAcceptError(null);
    setAcceptSuccess(null);
    setAcceptingRequestId(request.requestId);

    try {
      await acceptJobRequest(request.requestId);
      setSupabaseRequests((currentRequests) =>
        currentRequests.map((currentRequest) => {
          if (currentRequest.requestId === request.requestId) {
            return { ...currentRequest, requestStatus: "accepted" };
          }

          if (currentRequest.requestStatus === "pending") {
            return { ...currentRequest, requestStatus: "closed" };
          }

          return currentRequest;
        }),
      );
      setAcceptSuccess(`Solicitud aceptada para ${request.professionalDisplayName}.`);
      setSupabaseReloadKey((currentValue) => currentValue + 1);
    } catch (error) {
      setAcceptError(
        error instanceof Error && error.message
          ? error.message
          : "No pudimos aceptar la solicitud. Inténtalo de nuevo.",
      );
    } finally {
      setAcceptingRequestId(null);
    }
  };

  if (isSupabase) {
    return (
      <div className="flex-1 flex flex-col bg-sand-50">
        <StatusBar />
        <TopBar
          title={`Solicitudes${isLoadingSupabaseRequests ? "" : ` (${supabaseRequests.length})`}`}
          subtitle="Solicitudes reales recibidas"
        />
        <ScreenBody className="px-4 pt-3 pb-6">
          <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12px] leading-relaxed text-amber-900">
            Al aceptar se creará el chat y se revelará la dirección exacta solo al profesional aceptado.
          </div>

          {acceptSuccess ? (
            <div className="mb-3 rounded-2xl border border-teal-200 bg-teal-50 px-3.5 py-3 text-[12px] leading-relaxed text-teal-800">
              {acceptSuccess}
            </div>
          ) : null}

          {acceptError ? (
            <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[12px] leading-relaxed text-rose-800">
              {acceptError}
            </div>
          ) : null}

          {supabaseError ? (
            <Card>
              <div className="text-[13px] font-semibold text-rose-700">{supabaseError}</div>
              <div className="mt-1 text-[12px] text-ink-500">
                Revisa tu sesion o el estado actual del trabajo antes de volver a intentarlo.
              </div>
            </Card>
          ) : isLoadingSupabaseRequests ? (
            <Card>
              <div className="text-[13px] font-semibold text-ink-800">
                Cargando solicitudes reales...
              </div>
              <div className="mt-1 text-[12px] text-ink-500">
                Estamos consultando la informacion publica minima de los profesionales.
              </div>
            </Card>
          ) : supabaseRequests.length === 0 ? (
            <Card>
              <div className="text-[13px] font-semibold text-ink-800">
                Aun no has recibido solicitudes reales.
              </div>
              <div className="mt-1 text-[12px] text-ink-500">
                Cuando lleguen nuevas solicitudes para este trabajo, apareceran aqui.
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-2.5">
              {supabaseRequests.map((request) => (
                <Card key={request.requestId}>
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <Avatar initials={getProfessionalAvatarInitials(request)} size={48} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[14.5px] text-ink-800 truncate">
                        {request.professionalDisplayName}
                      </div>
                      <div className="text-[12px] text-ink-500 mb-2">
                        {request.professionalSpecialtyLabel ?? "Especialidad no indicada"} · {" "}
                        {request.professionalZone ?? "Zona no indicada"}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="rounded-xl border border-sand-200/80 bg-sand-50 px-2.5 py-2">
                          <div className="text-[10.5px] uppercase tracking-wide text-ink-400">
                            Estado profesional
                          </div>
                          <div className="text-[12px] font-bold text-ink-800">
                            {PROFESSIONAL_STATUS_LABELS[request.professionalStatus]}
                          </div>
                        </div>
                        <div className="rounded-xl border border-sand-200/80 bg-sand-50 px-2.5 py-2">
                          <div className="text-[10.5px] uppercase tracking-wide text-ink-400">
                            Verificacion
                          </div>
                          <div className="text-[12px] font-bold text-ink-800">
                            {VERIFICATION_STATUS_LABELS[request.professionalVerificationStatus]}
                          </div>
                        </div>
                        <div className="rounded-xl border border-sand-200/80 bg-sand-50 px-2.5 py-2">
                          <div className="text-[10.5px] uppercase tracking-wide text-ink-400">
                            Perfil publico
                          </div>
                          <div className="text-[12px] font-bold text-ink-800">
                            {request.professionalPublicProfileEnabled ? "Activo" : "Desactivado"}
                          </div>
                        </div>
                        <div className="rounded-xl border border-sand-200/80 bg-sand-50 px-2.5 py-2">
                          <div className="text-[10.5px] uppercase tracking-wide text-ink-400">
                            Estado solicitud
                          </div>
                          <div className="text-[12px] font-bold text-ink-800">
                            {REQUEST_STATUS_LABELS[request.requestStatus]}
                          </div>
                        </div>
                      </div>

                      <div className="text-[12px] text-ink-600 bg-sand-50 rounded-lg p-2.5 border border-sand-200/70 mb-2 leading-relaxed">
                        “{request.requestMessage ?? "Sin mensaje adicional del profesional."}”
                      </div>

                      <div className="mb-3 text-[11.5px] text-ink-500">
                        Recibida el {formatRequestCreatedAt(request.requestCreatedAt)}
                      </div>

                      {request.requestStatus === "pending" ? (
                        <button
                          type="button"
                          onClick={() => void handleAcceptSupabaseRequest(request)}
                          disabled={Boolean(acceptingRequestId)}
                          className={`w-full rounded-xl px-3 py-2 text-[12px] font-bold transition-colors ${
                            acceptingRequestId
                              ? "bg-sand-100 text-ink-400 cursor-not-allowed"
                              : "bg-coral-500 text-white shadow-coral"
                          }`}
                        >
                          {acceptingRequestId === request.requestId
                            ? "Aceptando..."
                            : "Aceptar solicitud"}
                        </button>
                      ) : (
                        <div className="rounded-xl border border-sand-200 bg-sand-50 px-3 py-2 text-[12px] font-semibold text-ink-500">
                          Estado actual: {REQUEST_STATUS_LABELS[request.requestStatus]}.
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScreenBody>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title={`Solicitudes (${job.requests})`} subtitle={job.title} />
      <ScreenBody className="px-4 pt-3 pb-6">
        <div className="flex items-center gap-2 mb-3">
          {(["relevant", "rating", "price"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1.5 rounded-full text-[11.5px] font-bold border-[1.5px] ${
                sort === s
                  ? "border-coral-500 bg-coral-50 text-coral-700"
                  : "border-sand-200 text-ink-500 bg-white"
              }`}
            >
              {s === "relevant"
                ? "Relevancia"
                : s === "rating"
                ? "Mejor valorados"
                : "Más económicos"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          {sorted.map(({ professional, jobRequest }) => (
            <Card key={jobRequest?.id ?? professional.id}>
              <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <Avatar initials={professional.avatar} size={48} />
                  {professional.verified && <VerifiedDot size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[14.5px] text-ink-800 truncate">
                    {professional.name}
                  </div>
                  <div className="text-[12px] text-ink-500 mb-1">
                    {professional.specialty} · {professional.distance ?? professional.location}
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <RatingStars value={professional.rating} />
                    <span className="text-[11.5px] font-bold text-ink-800">
                      {professional.rating.toFixed(1)}
                    </span>
                    <span className="text-[11px] text-ink-400">
                      ({professional.reviews})
                    </span>
                  </div>
                  <div className="text-[12px] text-ink-600 bg-sand-50 rounded-lg p-2.5 border border-sand-200/70 mb-3 leading-relaxed">
                    “{jobRequest?.message ?? `${professional.bio?.slice(0, 110) ?? "Profesional disponible"}…`}”
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/profesional/perfil?id=${professional.id}&jobId=${job.id}`}
                      className="text-center text-[12px] font-bold py-2.5 rounded-xl bg-sand-100 text-ink-700"
                    >
                      Ver perfil
                    </Link>
                    <Link
                      href={
                        jobRequest?.status === "pending" && !acceptedJobRequest
                          ? `/cliente/trabajos/${job.id}/aceptar?proId=${professional.id}&requestId=${jobRequest.id}`
                          : `/cliente/trabajos/${job.id}`
                      }
                      className={`text-center text-[12px] font-bold py-2.5 rounded-xl ${
                        jobRequest?.status === "accepted"
                          ? "bg-teal-50 text-teal-700"
                          : jobRequest?.status === "pending" && !acceptedJobRequest
                            ? "bg-coral-500 text-white shadow-coral"
                            : "bg-sand-100 text-ink-500"
                      }`}
                    >
                      {jobRequest?.status === "accepted"
                        ? "Aceptada"
                        : jobRequest?.status === "rejected"
                          ? "Rechazada"
                          : jobRequest?.status === "closed"
                            ? "Cerrada"
                            : "Aceptar"}
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Link
          href={`/cliente/trabajos/${job.id}/invitaciones`}
          className="mt-4 flex items-center justify-center gap-1.5 text-[12.5px] font-bold text-coral-600 bg-coral-50 rounded-full py-2.5"
        >
          <Icon name="plus" size={14} stroke={2.5} />
          Invitar a otros profesionales
        </Link>
      </ScreenBody>
    </div>
  );
}
