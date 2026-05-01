"use client";
import { useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { JobCard } from "@/components/jobs/job-card";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { getEffectiveJobs, useSession } from "@/lib/store";

type Filter = "activos" | "pendientes" | "completados" | "cancelados";

export default function TrabajosPage() {
  const [filter, setFilter] = useState<Filter>("activos");
  const session = useSession();
  const currentClientId = session.currentClientId;
  const effectiveJobs = getEffectiveJobs(session);
  const mine = effectiveJobs.filter((j) => j.clientId === currentClientId);

  const groups: Record<Filter, typeof mine> = {
    activos: mine.filter((j) =>
      [
        "published",
        "in_progress",
        "agreement_pending",
        "agreed",
        "escrow_funded",
        "completed_pending_confirmation",
      ].includes(j.status),
    ),
    pendientes: mine.filter((j) =>
      ["agreement_pending", "completed_pending_confirmation"].includes(j.status),
    ),
    completados: mine.filter((j) => j.status === "completed"),
    cancelados: mine.filter((j) => ["cancelled", "dispute"].includes(j.status)),
  };

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "activos", label: "Activos", count: groups.activos.length },
    { id: "pendientes", label: "Pendientes", count: groups.pendientes.length },
    { id: "completados", label: "Completados", count: groups.completados.length },
    { id: "cancelados", label: "Otros", count: groups.cancelados.length },
  ];

  const shown = groups[filter];

  return (
    <div className="flex-1 flex flex-col">
      <StatusBar />
      <div className="px-5 pt-2 pb-3 bg-white border-b border-sand-200/70">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-extrabold text-[20px] text-ink-900 tracking-tight">
            Mis trabajos
          </h1>
          <Link
            href="/cliente/publicar"
            className="bg-coral-500 text-white w-9 h-9 rounded-full flex items-center justify-center shadow-coral"
          >
            <Icon name="plus" size={18} stroke={2.5} />
          </Link>
        </div>
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 scrollbar-hide">
          {filters.map((f) => {
            const sel = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold border-[1.5px] transition whitespace-nowrap ${
                  sel
                    ? "border-coral-500 bg-coral-50 text-coral-700"
                    : "border-sand-200 bg-white text-ink-500"
                }`}
              >
                {f.label}{" "}
                <span className={sel ? "text-coral-500" : "text-ink-400"}>
                  · {f.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <ScreenBody className="px-4 pt-4 pb-6">
        {shown.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-sand-100 mx-auto flex items-center justify-center mb-4">
              <Icon name="briefcase" size={28} className="text-ink-400" />
            </div>
            <div className="font-bold text-[15px] text-ink-800 mb-1">
              Nada por aquí
            </div>
            <div className="text-[12.5px] text-ink-400 mb-4 max-w-[220px] mx-auto leading-snug">
              No tienes trabajos en esta categoría. Publica uno nuevo y recibe
              propuestas en horas.
            </div>
            <Link
              href="/cliente/publicar"
              className="inline-flex items-center gap-1.5 bg-coral-500 text-white rounded-full px-4 py-2 text-[13px] font-bold"
            >
              Publicar trabajo
              <Icon name="forward" size={14} stroke={2.5} />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {shown.map((j) => (
              <JobCard
                key={j.id}
                job={j}
                href={`/cliente/trabajos/${j.id}`}
              />
            ))}
          </div>
        )}
      </ScreenBody>
    </div>
  );
}
