"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatusBar } from "@/components/layout/status-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { HeaderActionSheet } from "@/components/layout/header-action-sheet";
import { HeaderIconButton } from "@/components/layout/header-icon-button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { JobCard } from "@/components/jobs/job-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { currentPro, defaultAdminConfig, professionals } from "@/lib/data";
import { getCurrentProfile, type ApiProfile } from "@/lib/api/profiles";
import { isSupabaseMode } from "@/lib/supabase/config";
import {
  getPublishedJobsForProfessional,
  type ApiProfessionalPublishedJob,
} from "@/lib/api/jobs";
import {
  listMyProfessionalInvitations,
  type ApiProfessionalJobInvitation,
} from "@/lib/api/jobInvitations";
import {
  getCurrentProfessionalId,
  getEffectiveJobs,
  getEffectiveNotifications,
  useSession,
} from "@/lib/store";

const PROFESSIONAL_ASSIGNED_JOB_STATUSES = [
  "in_progress",
  "agreement_pending",
  "agreed",
  "escrow_funded",
  "completed_pending_confirmation",
  "dispute",
  "completed",
] as const;

const PROFESSIONAL_ACTIVE_JOB_STATUSES = [
  "in_progress",
  "agreement_pending",
  "agreed",
  "escrow_funded",
  "completed_pending_confirmation",
  "dispute",
] as const;

const PROFESSIONAL_PENDING_ACTION_STATUSES = [
  "agreement_pending",
  "agreed",
  "escrow_funded",
  "completed_pending_confirmation",
  "dispute",
] as const;

export default function HomeProPage() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [realProfile, setRealProfile] = useState<ApiProfile | null>(null);
  const [realPublishedJobs, setRealPublishedJobs] = useState<ApiProfessionalPublishedJob[]>([]);
  const [realInvitations, setRealInvitations] = useState<ApiProfessionalJobInvitation[]>([]);
  const [realLoading, setRealLoading] = useState(false);
  const [realError, setRealError] = useState<string | null>(null);
  const [realProfessionalApproved, setRealProfessionalApproved] = useState(false);
  const session = useSession();
  const isSupabase = isSupabaseMode();
  const currentProfessionalId = getCurrentProfessionalId(session);
  const notifications = useMemo(() => getEffectiveNotifications(session), [session]);
  const effectiveJobs = useMemo(() => getEffectiveJobs(session), [session]);
  const professional =
    professionals.find((entry) => entry.id === currentProfessionalId) ?? currentPro;
  const openJobs = useMemo(
    () =>
      effectiveJobs
        .filter((job) => job.status === "published")
        .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
        .slice(0, 4),
    [effectiveJobs],
  );
  const myAssignedJobs = useMemo(
    () =>
      effectiveJobs
        .filter(
          (job) =>
            job.assignedProId === currentProfessionalId &&
            PROFESSIONAL_ASSIGNED_JOB_STATUSES.includes(
              job.status as (typeof PROFESSIONAL_ASSIGNED_JOB_STATUSES)[number],
            ),
        )
        .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()),
    [currentProfessionalId, effectiveJobs],
  );
  const myActiveJobs = useMemo(
    () =>
      myAssignedJobs.filter((job) =>
        PROFESSIONAL_ACTIVE_JOB_STATUSES.includes(
          job.status as (typeof PROFESSIONAL_ACTIVE_JOB_STATUSES)[number],
        ),
      ),
    [myAssignedJobs],
  );
  const myPendingActionJobs = useMemo(
    () =>
      myAssignedJobs.filter((job) =>
        PROFESSIONAL_PENDING_ACTION_STATUSES.includes(
          job.status as (typeof PROFESSIONAL_PENDING_ACTION_STATUSES)[number],
        ),
      ),
    [myAssignedJobs],
  );
  const myCompletedJobsCount = useMemo(
    () => myAssignedJobs.filter((job) => job.status === "completed").length,
    [myAssignedJobs],
  );
  const myJobsPreview = useMemo(() => myActiveJobs.slice(0, 3), [myActiveJobs]);
  const headerInitials =
    isSupabase && realProfile
      ? realProfile.avatarInitials ?? realProfile.fullName.trim().charAt(0).toUpperCase()
      : professional.avatar;
  const headerName =
    isSupabase && realProfile
      ? realProfile.fullName.trim().split(/\s+/)[0] ?? professional.name.split(" ")[0]
      : professional.name.split(" ")[0];

  useEffect(() => {
    if (!isSupabase) {
      return;
    }

    let cancelled = false;

    const loadRealData = async () => {
      setRealLoading(true);
      setRealError(null);

      try {
        const [profile, publishedJobsResult, invitationsResult] = await Promise.allSettled([
          getCurrentProfile(),
          getPublishedJobsForProfessional(),
          listMyProfessionalInvitations(),
        ]);

        if (cancelled) return;

        if (profile.status === "fulfilled" && profile.value) {
          setRealProfile(profile.value);

          if (
            profile.value.role !== "professional" ||
            profile.value.professionalStatus !== "approved"
          ) {
            setRealProfessionalApproved(false);
            setRealPublishedJobs([]);
            setRealInvitations([]);
            setRealLoading(false);
            return;
          }

          setRealProfessionalApproved(true);
        } else {
          setRealProfessionalApproved(false);
          setRealPublishedJobs([]);
          setRealInvitations([]);
          if (!cancelled) setRealLoading(false);
          if (profile.status === "rejected") {
            setRealError("Tu sesión no tiene un perfil profesional válido.");
          }
          return;
        }

        if (publishedJobsResult.status === "fulfilled") {
          setRealPublishedJobs(publishedJobsResult.value);
        } else {
          setRealPublishedJobs([]);
        }

        if (invitationsResult.status === "fulfilled") {
          setRealInvitations(invitationsResult.value);
        } else {
          setRealInvitations([]);
        }
      } catch {
        if (!cancelled) {
          setRealPublishedJobs([]);
          setRealInvitations([]);
          setRealProfessionalApproved(false);
          setRealError("No pudimos cargar los datos reales. Vuelve a intentarlo más tarde.");
        }
      } finally {
        if (!cancelled) {
          setRealLoading(false);
        }
      }
    };

    void loadRealData();

    return () => {
      cancelled = true;
    };
  }, [isSupabase]);

  const realPendingInvitationsCount = realInvitations.filter(
    (inv) => inv.invitationStatus === "pending",
  ).length;
  const realInvitationsWithRequestCount = realInvitations.filter(
    (inv) => inv.requestStatus != null,
  ).length;
  const realPublishedJobsPreview = realPublishedJobs.slice(0, 4);
  const realInvitationsPreview = realInvitations
    .filter((inv) => inv.invitationStatus === "pending")
    .slice(0, 3);

  const headerKpis = isSupabase
    ? [
        ["Oportunidades", `${realPublishedJobs.length}`],
        ["Invitaciones", `${realPendingInvitationsCount}`],
        ["Solicitudes", `${realInvitationsWithRequestCount}`],
      ]
    : [
        ["Activos", `${myActiveJobs.length}`],
        ["Pendientes", `${myPendingActionJobs.length}`],
        ["Completados", `${myCompletedJobsCount}`],
      ];

  return (
    <div className="flex-1 flex flex-col" data-testid="professional-home-page">
      <StatusBar />
      {/* Header */}
      <div className="bg-gradient-to-br from-coral-600 to-coral-500 text-white px-5 pt-2 pb-6 rounded-b-[32px]">
        <div className="flex items-center justify-between mb-5">
          <Link
            href="/profesional/mi-perfil"
            className="flex items-center gap-3"
          >
            <Avatar initials={headerInitials} size={44} />
            <div>
              <div className="text-[12px] text-white/80">Hola,</div>
              <div className="font-extrabold text-[15px]">{headerName}</div>
            </div>
          </Link>
          <HeaderIconButton
            label="Abrir actividad"
            onClick={() => setNotificationsOpen(true)}
            light
          >
            <Icon name="bell" size={20} />
          </HeaderIconButton>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {headerKpis.map(([label, value]) => (
            <div
              key={label}
              className="bg-white/15 backdrop-blur rounded-2xl px-3 py-2.5"
            >
              <div className="text-[10.5px] text-white/70 font-semibold uppercase tracking-wide">
                {label}
              </div>
              <div className="font-extrabold text-[15px]">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <HeaderActionSheet
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title="Actividad"
        description="Avisos recientes relacionados con tus trabajos y cobros."
        items={notifications.map((notification) => ({
          label: notification.text,
          description: `${notification.sub ?? ""} · ${notification.time}`,
          icon:
            notification.type === "payment"
              ? "shield"
              : notification.type === "agreement"
                ? "euro"
                : notification.type === "dispute"
                  ? "alert"
                  : "bell",
          href: notification.jobId ? `/profesional/trabajos/${notification.jobId}` : undefined,
        }))}
      />

      <ScreenBody className="px-4 pt-4 pb-6">
        {isSupabase ? (
          <>
            {realLoading ? (
              <Card
                className="mb-4 bg-white border-sand-200/70"
                testId="professional-home-real-loading"
              >
                <div className="text-[12px] text-ink-500 text-center py-6">
                  Cargando datos reales…
                </div>
              </Card>
            ) : realError ? (
              <Card
                className="mb-4 bg-rose-50 border-rose-100"
                testId="professional-home-real-error"
              >
                <div className="text-[12px] text-rose-700 leading-snug">{realError}</div>
              </Card>
            ) : !realProfessionalApproved ? (
              <Card
                className="mb-4 bg-amber-50 border-amber-100"
                testId="professional-home-pending-actions"
              >
                <div className="font-bold text-[13px] text-amber-800 mb-1">
                  Profesional no aprobado
                </div>
                <div className="text-[12px] text-amber-700 leading-snug">
                  Solo un profesional aprobado puede ver oportunidades reales. Tu cuenta debe ser validada por un administrador antes de operar.
                </div>
              </Card>
            ) : (
              <>
                <Card
                  className="mb-4 bg-white border-sand-200/70"
                  testId="professional-home-real-summary"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="font-bold text-[13px] text-ink-800">Resumen real</div>
                      <div className="text-[11px] text-ink-400 leading-snug">
                        Datos reales de oportunidades publicadas e invitaciones recibidas.
                      </div>
                    </div>
                    <Link
                      href="/profesional/trabajos"
                      className="text-[11px] font-bold text-coral-600 whitespace-nowrap"
                    >
                      Ver todas
                    </Link>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <HomeStatTile
                      label="Oportunidades"
                      value={String(realPublishedJobs.length)}
                    />
                    <HomeStatTile
                      label="Invitaciones"
                      value={String(realPendingInvitationsCount)}
                    />
                    <HomeStatTile
                      label="Solicitudes"
                      value={String(realInvitationsWithRequestCount)}
                    />
                  </div>
                </Card>

                <Card className="mb-4 bg-teal-50 border-teal-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center">
                      <Icon name="shield" size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-[13px] text-teal-700">
                        Cuenta conectada a Dersux
                      </div>
                      <div className="text-[11px] text-teal-700/80">
                        La dirección exacta y el chat solo se activan si el cliente acepta una solicitud.
                      </div>
                    </div>
                  </div>
                </Card>

                {realPublishedJobsPreview.length > 0 && (
                  <>
                    <SectionHeading
                      title="Oportunidades publicadas"
                      action="Ver todas"
                      href="/profesional/trabajos"
                    />
                    <div
                      className="flex flex-col gap-2.5 mb-5"
                      data-testid="professional-home-real-opportunities"
                    >
                      {realPublishedJobsPreview.map((job) => (
                        <Card key={job.id} className="bg-white border-sand-200/70">
                          <div className="mb-1.5 flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1 text-[14px] font-bold leading-tight text-ink-800">
                              {job.title}
                            </div>
                            <span className="rounded-full bg-sand-100 px-2.5 py-1 text-[10.5px] font-bold text-ink-500 whitespace-nowrap">
                              Publicado
                            </span>
                          </div>

                          {(job.categoryName || job.serviceName) && (
                            <div className="mb-2 flex flex-wrap gap-1.5">
                              {job.categoryName && (
                                <span className="inline-flex rounded-full bg-sand-100 px-2.5 py-1 text-[10.5px] font-bold text-ink-500">
                                  {job.categoryName}
                                </span>
                              )}
                              {job.serviceName && (
                                <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-[10.5px] font-bold text-teal-700">
                                  {job.serviceName}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="mb-2 flex items-center gap-1.5 text-[12px] text-ink-400">
                            <Icon name="pin" size={12} stroke={2} />
                            <span className="truncate">
                              {job.approxLocation ?? "Ubicación aproximada no disponible"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-coral-600">
                              {job.priceMin != null && job.priceMax != null
                                ? `${job.priceMin.toLocaleString("es-ES")} € – ${job.priceMax.toLocaleString("es-ES")} €`
                                : "Precio no disponible"}
                            </span>
                            <span className="text-[11px] font-medium text-ink-400">
                              orientativo
                            </span>
                          </div>

                          <div className="mt-3 pt-3 border-t border-sand-200/70">
                            <Link
                              href={`/profesional/trabajos/${job.id}`}
                              className="inline-flex items-center justify-center rounded-2xl border border-sand-200 bg-white px-4 py-2 text-[12px] font-bold text-coral-600 transition hover:bg-coral-50"
                            >
                              Ver detalle
                            </Link>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </>
                )}

                {realInvitationsPreview.length > 0 && (
                  <>
                    <SectionHeading
                      title="Invitaciones recibidas"
                      action="Ver todas"
                      href="/profesional/trabajos"
                    />
                    <div
                      className="flex flex-col gap-2.5 mb-5"
                      data-testid="professional-home-real-invitations"
                    >
                      {realInvitationsPreview.map((invitation) => (
                        <Card
                          key={invitation.invitationId}
                          className="bg-white border-sand-200/70"
                        >
                          <div className="mb-1.5 flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1 text-[14px] font-bold leading-tight text-ink-800">
                              {invitation.jobTitle}
                            </div>
                            <span className="rounded-full bg-coral-50 px-2.5 py-1 text-[10.5px] font-bold text-coral-700 whitespace-nowrap">
                              {invitation.invitationStatus === "pending"
                                ? "Pendiente"
                                : invitation.invitationStatus === "accepted"
                                  ? "Aceptada"
                                  : invitation.invitationStatus}
                            </span>
                          </div>

                          {invitation.requestStatus && (
                            <div className="mb-2">
                              <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[10.5px] font-bold text-sky-700">
                                Solicitud {invitation.requestStatus === "pending" ? "pendiente" : invitation.requestStatus}
                              </span>
                            </div>
                          )}

                          <div className="mb-2 flex items-center gap-1.5 text-[12px] text-ink-400">
                            <Icon name="pin" size={12} stroke={2} />
                            <span className="truncate">
                              {invitation.approxLocation ?? "Ubicación aproximada no disponible"}
                            </span>
                          </div>

                          <div className="mt-3 pt-3 border-t border-sand-200/70">
                            <Link
                              href={`/profesional/trabajos/${invitation.jobId}?invitationId=${encodeURIComponent(invitation.invitationId)}`}
                              className="inline-flex items-center justify-center rounded-2xl border border-sand-200 bg-white px-4 py-2 text-[12px] font-bold text-coral-600 transition hover:bg-coral-50"
                            >
                              Ver detalle
                            </Link>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </>
                )}

                {!realLoading &&
                  !realError &&
                  realProfessionalApproved &&
                  realPublishedJobsPreview.length === 0 &&
                  realInvitationsPreview.length === 0 && (
                    <Card className="mb-4 bg-white border-sand-200/70">
                      <div className="text-[12px] text-ink-500 text-center py-6 leading-snug">
                        No hay oportunidades ni invitaciones todavía.
                      </div>
                    </Card>
                  )}

                <Card>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-coral-50 text-coral-600 flex items-center justify-center flex-shrink-0">
                      <Icon name="trending" size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-[13.5px] text-ink-800 mb-0.5">
                        Trabajos activos y pagos
                      </div>
                      <div className="text-[12px] text-ink-500 leading-snug">
                        La lista de trabajos activos, pagos y el historial completo se conectarán próximamente. Por ahora puedes ver y solicitar oportunidades desde{" "}
                        <Link href="/profesional/trabajos" className="font-bold text-coral-600 underline">
                          Trabajos
                        </Link>.
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </>
        ) : (
          <>
            <Card className="mb-4" testId="professional-home-pending-actions">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="font-bold text-[13px] text-ink-800">Resumen profesional</div>
                  <div className="text-[11px] text-ink-400 leading-snug">
                    Basado en trabajos efectivos asignados en esta demo.
                  </div>
                </div>
                <Link href="/profesional/trabajos?mine=1" className="text-[11px] font-bold text-coral-600">
                  Ver todos
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <HomeStatTile label="Activos" value={String(myActiveJobs.length)} />
                <HomeStatTile label="Pendientes" value={String(myPendingActionJobs.length)} />
                <HomeStatTile label="Cerrados" value={String(myCompletedJobsCount)} />
              </div>
            </Card>

            {/* Verification card */}
            <Card className="mb-4 bg-teal-50 border-teal-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center">
                  <Icon name="shield" size={18} />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-[13px] text-teal-700">
                    Cuenta validada demo · {professional.reliability ?? currentPro.reliability}% fiabilidad demo
                  </div>
                  <div className="text-[11px] text-teal-700/80">
                    Datos simulados para la demo. En producción, la validación sería
                    operativa.
                  </div>
                </div>
              </div>
            </Card>

            {/* Oportunidades */}
            <SectionHeading
              title="Trabajos cerca de ti"
              action="Ver todos"
              href="/profesional/trabajos"
            />
            <div className="flex flex-col gap-2.5 mb-5">
              {openJobs.map((j) => (
                <JobCard
                  key={j.id}
                  job={j}
                  href={`/profesional/trabajos/${j.id}`}
                  approxLocation
                  showDistance={`${1 + (parseInt(j.id.replace("j", "")) % 7)} km`}
                />
              ))}
            </div>

            {/* En curso */}
            {myJobsPreview.length > 0 && (
              <>
                <SectionHeading
                  title="Tus trabajos activos"
                  action="Ver todos"
                  href="/profesional/trabajos?mine=1"
                />
                <div className="flex flex-col gap-2.5 mb-5" data-testid="professional-home-active-jobs">
                  {myJobsPreview.map((j) => (
                    <JobCard
                      key={j.id}
                      job={j}
                      href={`/profesional/trabajos/${j.id}`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Tips */}
            <Card>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-coral-50 text-coral-600 flex items-center justify-center flex-shrink-0">
                  <Icon name="trending" size={18} />
                </div>
                <div>
                  <div className="font-bold text-[13.5px] text-ink-800 mb-0.5">
                    Consejo Dersux
                  </div>
                  <div className="text-[12px] text-ink-500 leading-snug">
                    Responde en menos de 1 h para aparecer primero en los resultados.
                    Tu tiempo medio actual: <strong>{professional.responseTime}</strong>.
                    Comisión plataforma: {defaultAdminConfig.commissionPct}%.
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}
      </ScreenBody>
    </div>
  );
}

function HomeStatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sand-200/70 bg-sand-50/80 px-3 py-2.5">
      <div className="font-extrabold text-[16px] text-ink-900">{value}</div>
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">
        {label}
      </div>
    </div>
  );
}
