"use client";

import { useMemo, useState } from "react";
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
  const session = useSession();
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
            <Avatar initials={professional.avatar} size={44} />
            <div>
              <div className="text-[12px] text-white/80">Hola,</div>
              <div className="font-extrabold text-[15px]">
                {professional.name.split(" ")[0]}
              </div>
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
          {[
            ["Activos", `${myActiveJobs.length}`],
            ["Pendientes", `${myPendingActionJobs.length}`],
            ["Completados", `${myCompletedJobsCount}`],
          ].map(([l, v]) => (
            <div
              key={l}
              className="bg-white/15 backdrop-blur rounded-2xl px-3 py-2.5"
            >
              <div className="text-[10.5px] text-white/70 font-semibold uppercase tracking-wide">
                {l}
              </div>
              <div className="font-extrabold text-[15px]">{v}</div>
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
                Cuenta verificada · {professional.reliability ?? currentPro.reliability}% fiabilidad
              </div>
              <div className="text-[11px] text-teal-700/80">
                Ganas más visibilidad completando tu perfil al 100%.
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
                Consejo Arranxos
              </div>
              <div className="text-[12px] text-ink-500 leading-snug">
                Responde en menos de 1 h para aparecer primero en los resultados.
                Tu tiempo medio actual: <strong>{professional.responseTime}</strong>.
                Comisión plataforma: {defaultAdminConfig.commissionPct}%.
              </div>
            </div>
          </div>
        </Card>
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
