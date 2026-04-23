"use client";
import { use, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { HeaderActionSheet } from "@/components/layout/header-action-sheet";
import { HeaderIconButton } from "@/components/layout/header-icon-button";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/badge";
import { JobStatusTimeline } from "@/components/jobs/job-status-timeline";
import { jobs, professionals } from "@/lib/data";
import {
  getAgreement,
  getEffectiveFinalPrice,
  getJobActionsForClient,
  getPostPaymentJobActionsForClient,
  hasAgreement,
} from "@/lib/domain/policies";
import {
  getAgreementByJobId,
  getEffectiveAdminConfig,
  getEffectiveJobById,
  useSession,
} from "@/lib/store";
import type { JobStatus } from "@/lib/types";
import { formatEuro } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

function Inner({ id }: { id: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const search = useSearchParams();
  const justPublished = search.get("justPublished") === "1";
  const adminConfig = useSession(getEffectiveAdminConfig);
  const effectiveJob = useSession((s) => getEffectiveJobById(s, id));
  const agreement = useSession((s) => getAgreementByJobId(s, id));
  const job = effectiveJob ?? jobs[0];
  const resolvedAgreement = getAgreement(agreement);
  const finalPrice = getEffectiveFinalPrice(job, resolvedAgreement);
  const postPaymentActions = getPostPaymentJobActionsForClient({
    status: job.status,
    agreement: resolvedAgreement,
  });
  const requestingPros = professionals.slice(0, Math.max(2, job.requests));
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
  });
  const canOpenChat = clientActions.includes("open_chat");

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
          {
            label: "Abrir chat",
            description: canOpenChat
              ? "Accede a la negociación y seguimiento del acuerdo."
              : "Disponible cuando el profesional haya sido aceptado.",
            icon: "chat",
            href: canOpenChat ? `/chat/${job.id}` : undefined,
          },
        ]}
      />

      <ScreenBody className="px-4 pt-3 pb-6">
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
                  Te avisamos cuando los profesionales soliciten el trabajo.
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

        <Card className="mb-3">
          <div className="font-bold text-[13.5px] text-ink-800 mb-3">Estado</div>
          <JobStatusTimeline status={job.status} />
        </Card>

        {/* Solicitudes / invitaciones */}
        {clientActions.includes("view_requests") && (
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
              {requestingPros.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-sand-200"
                >
                  <Avatar initials={p.avatar} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[13px] text-ink-800 truncate">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-ink-400">
                      {p.specialty} · ★ {p.rating.toFixed(1)} · {p.responseTime}
                    </div>
                  </div>
                  <Link
                    href={`/profesional/perfil?id=${p.id}&jobId=${job.id}`}
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

        {/* CTAs según estado */}
        <ActionsForStatus
          jobId={job.id}
          status={job.status}
          priceMin={job.priceMin}
          priceMax={job.priceMax}
          finalPrice={finalPrice}
          actions={clientActions}
          postPaymentActions={postPaymentActions}
        />
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
}: {
  jobId: string;
  status: JobStatus;
  priceMin: number;
  priceMax: number;
  finalPrice?: number;
  actions: ReturnType<typeof getJobActionsForClient>;
  postPaymentActions: ReturnType<typeof getPostPaymentJobActionsForClient>;
}) {
  if (actions.includes("pay")) {
    return (
      <Card className="mb-3 bg-amber-50/60 border-amber-100">
        <div className="font-bold text-[13.5px] text-amber-800 mb-1">
          Acuerdo alcanzado · Falta pago
        </div>
        <div className="text-[12px] text-amber-700 mb-3">
          Para que el trabajo comience, transfiere el pago al sistema de
          custodia. Liberamos el dinero al confirmar.
        </div>
        <Button full href={`/cliente/trabajos/${jobId}/pagar`}>
          Pagar {formatEuro(finalPrice ?? Math.round((priceMin + priceMax) / 2))} con custodia
        </Button>
      </Card>
    );
  }
  if (
    actions.includes("confirm_completion") &&
    actions.includes("open_dispute") &&
    postPaymentActions.canConfirmCompletion
  ) {
    return (
      <Card className="mb-3 bg-violet-50/60 border-violet-100">
        <div className="font-bold text-[13.5px] text-violet-800 mb-1">
          El profesional marcó el trabajo como terminado
        </div>
        <div className="text-[12px] text-violet-700 mb-3">
          Confirma para liberar el pago. Si algo no va bien, abre una disputa.
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button full href={`/cliente/trabajos/${jobId}/confirmar`}>
            Confirmar
          </Button>
          <Button full variant="outline" href={`/cliente/trabajos/${jobId}/disputa`}>
            Abrir disputa
          </Button>
        </div>
      </Card>
    );
  }
  if (actions.includes("rate_pro") && postPaymentActions.canRatePro) {
    return (
      <Card className="mb-3">
        <div className="font-bold text-[13.5px] text-ink-800 mb-2">
          ¿Cómo fue el trabajo?
        </div>
        <Button full href={`/cliente/trabajos/${jobId}/valorar`}>
          Valorar profesional
        </Button>
      </Card>
    );
  }
  if (postPaymentActions.showsProtectedPayment && (status === "escrow_funded" || status === "in_progress")) {
    return (
      <Card className="mb-3 bg-teal-50/40 border-teal-100">
        <div className="flex items-center gap-2 text-[12.5px] font-bold text-teal-700 mb-1">
          <Icon name="shield" size={14} />
          Pago protegido en custodia
        </div>
        <div className="text-[11.5px] text-teal-700/80 leading-snug">
          {formatEuro(finalPrice ?? Math.round((priceMin + priceMax) / 2))} retenidos hasta que confirmes
          el trabajo.
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
