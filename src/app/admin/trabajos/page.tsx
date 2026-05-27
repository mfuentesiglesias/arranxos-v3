"use client";
import { useEffect, useMemo, useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import {
  getAdminJobs,
  type ApiAdminJobListItem,
} from "@/lib/api/adminJobs";
import { getEffectiveAdminConfig, getEffectiveJobs, useSession } from "@/lib/store";
import { isSupabaseMode } from "@/lib/supabase/config";
import type { JobStatus } from "@/lib/types";
import { formatEuro } from "@/lib/utils";
import Link from "next/link";

const FILTERS: { id: JobStatus | "all"; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "published", label: "Publicados" },
  { id: "agreement_pending", label: "Negociando" },
  { id: "escrow_funded", label: "En custodia" },
  { id: "in_progress", label: "En curso" },
  { id: "completed", label: "Completados" },
  { id: "dispute", label: "Disputa" },
  { id: "cancelled", label: "Cancelados" },
];

function formatAdminJobDate(value: string) {
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

function getShortId(value: string) {
  return value.slice(0, 8);
}

function SupabaseAdminTrabajosPage() {
  const [filter, setFilter] = useState<JobStatus | "all">("all");
  const [q, setQ] = useState("");
  const [jobs, setJobs] = useState<ApiAdminJobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadJobs() {
      setLoading(true);
      setPageError(null);

      try {
        const nextJobs = await getAdminJobs();

        if (!isCancelled) {
          setJobs(nextJobs ?? []);
        }
      } catch (error) {
        if (!isCancelled) {
          setJobs([]);
          setPageError(
            error instanceof Error && error.message
              ? error.message
              : "No pudimos cargar los trabajos reales.",
          );
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void loadJobs();

    return () => {
      isCancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      const matchesStatus = filter === "all" || job.status === filter;
      const query = q.trim().toLowerCase();
      const haystack = [
        job.title,
        job.approxLocation ?? "",
        job.clientName ?? "",
        job.professionalName ?? "",
        job.categoryName ?? "",
        job.serviceName ?? "",
        job.id,
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!query || haystack.includes(query));
    });
  }, [filter, jobs, q]);

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Trabajos" subtitle={loading ? "Cargando trabajos reales..." : `${jobs.length} trabajos reales`} />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="mb-3 border-teal-100 bg-teal-50/40">
          <div className="font-bold text-[13px] text-teal-700 mb-1">Trabajos reales Supabase</div>
          <div className="text-[11.5px] text-teal-700/80 leading-snug">
            Listado real con ubicacion aproximada y datos seguros. No muestra direccion exacta, emails ni telefonos.
          </div>
        </Card>

        {loading && (
          <Card className="mb-3 text-[12px] text-ink-600 leading-snug">
            Estamos cargando los trabajos reales.
          </Card>
        )}

        {pageError && (
          <Card className="mb-3 bg-rose-50 border-rose-100 text-[12px] text-rose-700 leading-snug">
            {pageError}
          </Card>
        )}

        <div className="flex items-center gap-2 bg-white rounded-2xl px-3.5 py-2.5 mb-3 border border-sand-200/70">
          <Icon name="search" size={16} stroke={2.2} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por titulo, cliente, profesional o ubicacion aproximada..."
            className="flex-1 bg-transparent outline-none text-[14px] text-ink-800 placeholder:text-ink-400"
          />
        </div>

        <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide">
          {FILTERS.map((f) => {
            const sel = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border-[1.5px] whitespace-nowrap ${
                  sel
                    ? "border-coral-500 bg-coral-50 text-coral-700"
                    : "border-sand-200 text-ink-500 bg-white"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          {filtered.map((job) => (
            <Card key={job.id} className="!p-3" testId={`admin-jobs-row-${job.id}`}>
              <div className="flex items-start gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] text-ink-400 font-bold">{getShortId(job.id)}</span>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="font-bold text-[13.5px] text-ink-800 truncate">{job.title}</div>
                  <div className="text-[11.5px] text-ink-500 truncate">
                    {(job.categoryName ?? "Sin categoria")} · {(job.serviceName ?? "Sin servicio")} · Ubicacion aproximada: {job.approxLocation ?? "No registrada"}
                  </div>
                  <div className="mt-1 text-[11px] text-ink-400 truncate">
                    Cliente: {job.clientName ?? getShortId(job.clientId)}
                    {job.assignedProfessionalId
                      ? ` · Pro asignado: ${job.professionalName ?? getShortId(job.assignedProfessionalId)}`
                      : " · Sin profesional asignado"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[12.5px] text-coral-600">
                    {formatEuro(job.priceMin ?? 0)}–{formatEuro(job.priceMax ?? 0)}
                  </div>
                  <div className="text-[10.5px] text-ink-400">{formatAdminJobDate(job.createdAt)}</div>
                </div>
              </div>
              <Link
                href={`/cliente/trabajos/${job.id}`}
                className="text-[11.5px] font-bold text-coral-600 inline-flex items-center gap-1"
              >
                Ver detalle
                <Icon name="forward" size={12} stroke={2.5} />
              </Link>
            </Card>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-10 text-ink-400 text-[12.5px]">
              Sin trabajos reales en este filtro.
            </div>
          )}
        </div>
      </ScreenBody>
    </div>
  );
}

function MockAdminTrabajosPage() {
  const [filter, setFilter] = useState<JobStatus | "all">("all");
  const [q, setQ] = useState("");
  const session = useSession();
  const effectiveJobs = useMemo(() => getEffectiveJobs(session), [session]);
  const adminConfig = useSession(getEffectiveAdminConfig);

  const filtered = effectiveJobs.filter((j) => {
    const ms = filter === "all" || j.status === filter;
    const mq =
      !q ||
      j.title.toLowerCase().includes(q.toLowerCase()) ||
      j.location.toLowerCase().includes(q.toLowerCase()) ||
      j.clientName.toLowerCase().includes(q.toLowerCase());
    return ms && mq;
  });

  const totalValue = filtered.reduce(
    (acc, j) => acc + (j.priceMin + j.priceMax) / 2,
    0,
  );
  const commissionValue = Math.round(
    (totalValue * adminConfig.commissionPct) / 100,
  );

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Trabajos" subtitle={`${effectiveJobs.length} totales`} />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="mb-3 !p-3 bg-ink-900 text-white border-ink-900">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10.5px] text-white/60 uppercase tracking-wide font-semibold">
                Valor filtrado
              </div>
              <div className="font-extrabold text-[18px]">
                {formatEuro(totalValue)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10.5px] text-white/60 uppercase tracking-wide font-semibold">
                Comisión ({adminConfig.commissionPct}%)
              </div>
              <div className="font-extrabold text-[18px] text-coral-400">
                {formatEuro(commissionValue)}
              </div>
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-2 bg-white rounded-2xl px-3.5 py-2.5 mb-3 border border-sand-200/70">
          <Icon name="search" size={16} stroke={2.2} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título, cliente, zona…"
            className="flex-1 bg-transparent outline-none text-[14px] text-ink-800 placeholder:text-ink-400"
          />
        </div>

        <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide">
          {FILTERS.map((f) => {
            const sel = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border-[1.5px] whitespace-nowrap ${
                  sel
                    ? "border-coral-500 bg-coral-50 text-coral-700"
                    : "border-sand-200 text-ink-500 bg-white"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          {filtered.map((j) => (
            <Card key={j.id} className="!p-3" testId={`admin-jobs-row-${j.id}`}>
              <div className="flex items-start gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] text-ink-400 font-bold">
                      {j.id}
                    </span>
                    <StatusBadge status={j.status} />
                  </div>
                  <div className="font-bold text-[13.5px] text-ink-800 truncate">
                    {j.title}
                  </div>
                  <div className="text-[11.5px] text-ink-500 truncate">
                    {j.category} · {j.location} · {j.clientName}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[12.5px] text-coral-600">
                    {formatEuro(j.priceMin)}–{formatEuro(j.priceMax)}
                  </div>
                  <div className="text-[10.5px] text-ink-400">{j.posted}</div>
                </div>
              </div>
              <Link
                href={`/cliente/trabajos/${j.id}`}
                className="text-[11.5px] font-bold text-coral-600 inline-flex items-center gap-1"
              >
                Ver detalle
                <Icon name="forward" size={12} stroke={2.5} />
              </Link>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-ink-400 text-[12.5px]">
              Sin trabajos en este filtro.
            </div>
          )}
        </div>
      </ScreenBody>
    </div>
  );
}

export default function AdminTrabajosPage() {
  return isSupabaseMode() ? <SupabaseAdminTrabajosPage /> : <MockAdminTrabajosPage />;
}
