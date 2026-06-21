"use client";
import { useEffect, useMemo, useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { JobCard } from "@/components/jobs/job-card";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";
import { getEffectiveJobs, useSession } from "@/lib/store";
import { isSupabaseMode } from "@/lib/supabase/config";
import { listMyJobs, toMockJob, type ApiClientJob } from "@/lib/api/clientJobs";
import type { Job } from "@/lib/types";

type Filter = "activos" | "pendientes" | "completados" | "cancelados";

export default function TrabajosPage() {
  const [filter, setFilter] = useState<Filter>("activos");
  const session = useSession();
  const currentClientId = session.currentClientId;
  const isSupabase = isSupabaseMode();
  const effectiveJobs = getEffectiveJobs(session);
  const [realJobs, setRealJobs] = useState<ApiClientJob[]>([]);
  const [loadingReal, setLoadingReal] = useState(false);
  const [errorReal, setErrorReal] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabase) {
      setRealJobs([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoadingReal(true);
      setErrorReal(null);

      try {
        const jobs = await listMyJobs();
        if (!cancelled) {
          setRealJobs(jobs);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorReal(
            error instanceof Error && error.message
              ? error.message
              : "No pudimos cargar tus trabajos reales.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingReal(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [isSupabase]);

  const mockClientJobs = effectiveJobs.filter((j) => j.clientId === currentClientId);

  const realDisplayJobs = useMemo(
    () => realJobs.map((apiJob) => toMockJob(apiJob)),
    [realJobs],
  );

  const mine: Job[] = isSupabase ? realDisplayJobs : mockClientJobs;

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
        <Card className="mb-3 bg-sky-50/60 border-sky-100" testId="client-jobs-chat-link">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-bold text-[13px] text-sky-800">Ver chats</div>
              <div className="text-[11.5px] text-sky-700/80 leading-snug">
                Accede a tus conversaciones abiertas con profesionales aceptados.
              </div>
            </div>
            <Link
              href="/cliente/chat"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-3 py-2 text-[12px] font-bold text-sky-700 border border-sky-100"
            >
              Abrir
            </Link>
          </div>
        </Card>

        {isSupabase && loadingReal && (
          <Card className="mb-3 text-[12px] text-ink-600 leading-snug">
            Cargando tus trabajos reales…
          </Card>
        )}

        {errorReal && (
          <Card className="mb-3 bg-rose-50 border-rose-100 text-[12px] text-rose-700 leading-snug">
            {errorReal}
          </Card>
        )}

        {!isSupabase && shown.length === 0 || isSupabase && !loadingReal && !errorReal && shown.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-sand-100 mx-auto flex items-center justify-center mb-4">
              <Icon name="briefcase" size={28} className="text-ink-400" />
            </div>
            <div className="font-bold text-[15px] text-ink-800 mb-1">
              {isSupabase ? "Aún no tienes trabajos publicados" : "Nada por aquí"}
            </div>
            <div className="text-[12.5px] text-ink-400 mb-4 max-w-[220px] mx-auto leading-snug">
              {isSupabase
                ? "Cuando publiques un trabajo aparecerá aquí."
                : "No tienes trabajos en esta categoría. Publica uno nuevo y recibe propuestas en horas."}
            </div>
            <Link
              href="/cliente/publicar"
              className="inline-flex items-center gap-1.5 bg-coral-500 text-white rounded-full px-4 py-2 text-[13px] font-bold"
            >
              {isSupabase ? "Publicar trabajo" : "Publicar trabajo"}
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
