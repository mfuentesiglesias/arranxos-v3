"use client";
import { use, useState } from "react";
import Link from "next/link";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/badge";
import { JobStatusTimeline } from "@/components/jobs/job-status-timeline";
import { MapView } from "@/components/map/map-view";
import { jobs, defaultAdminConfig } from "@/lib/data";
import { formatEuro, daysBetween } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

function Inner({ id }: { id: string }) {
  const job = jobs.find((j) => j.id === id) ?? jobs[0];
  const [requested, setRequested] = useState(false);

  // estado del pro: published → puede solicitar; agreed/escrow_funded/in_progress → puede chatear/finalizar
  const isMine = job.assignedProId === "p1";
  const accepted = ["agreed", "escrow_funded", "in_progress", "completed_pending_confirmation", "completed"].includes(job.status);
  const showApprox = !isMine && !accepted;
  const commission = Math.round(((job.priceMin + job.priceMax) / 2) * defaultAdminConfig.commissionPct / 100);

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
          <Card className="mb-3">
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
            Comisión Arranxos: <strong>{defaultAdminConfig.commissionPct}%</strong> ·
            ~ {formatEuro(commission)}. Recibirás{" "}
            <strong>{formatEuro(Math.round((job.priceMin + job.priceMax) / 2 - commission))}</strong>{" "}
            (si se acuerda en el rango medio).
          </div>
        </Card>
      </ScreenBody>

      {/* Sticky CTA */}
      <ProJobActions
        jobId={job.id}
        status={job.status}
        isMine={isMine}
        requested={requested}
        onRequest={() => setRequested(true)}
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
  status,
  isMine,
  requested,
  onRequest,
}: {
  jobId: string;
  status: string;
  isMine: boolean;
  requested: boolean;
  onRequest: () => void;
}) {
  if (status === "published" && !isMine) {
    return (
      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button
          full
          href={requested ? undefined : `/profesional/trabajos/${jobId}/solicitar`}
          onClick={requested ? undefined : onRequest}
          disabled={requested}
        >
          {requested ? "Solicitud enviada ✓" : "Solicitar este trabajo"}
        </Button>
      </div>
    );
  }
  if (status === "agreed" || status === "escrow_funded") {
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
  if (status === "in_progress") {
    return (
      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button full href={`/profesional/trabajos/${jobId}/finalizar`}>
          Marcar como terminado
        </Button>
      </div>
    );
  }
  if (status === "completed_pending_confirmation") {
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
