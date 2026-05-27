"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import {
  getAdminJobRequests,
  type ApiAdminJobRequestListItem,
} from "@/lib/api/adminJobRequests";
import { isSupabaseMode } from "@/lib/supabase/config";

type JobRequestFilter = "all" | "pending" | "accepted" | "rejected" | "closed" | "cancelled";

const FILTERS: { id: JobRequestFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "pending", label: "Pending" },
  { id: "accepted", label: "Accepted" },
  { id: "rejected", label: "Rejected" },
  { id: "closed", label: "Closed" },
  { id: "cancelled", label: "Cancelled" },
];

function formatRequestDate(value: string) {
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

function getStatusPillClassName(status: string) {
  switch (status) {
    case "accepted":
      return "bg-teal-50 text-teal-700";
    case "rejected":
      return "bg-rose-50 text-rose-700";
    case "closed":
      return "bg-sand-200 text-ink-600";
    case "cancelled":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-coral-50 text-coral-700";
  }
}

function SupabaseAdminSolicitudesPage() {
  const [filter, setFilter] = useState<JobRequestFilter>("all");
  const [q, setQ] = useState("");
  const [requests, setRequests] = useState<ApiAdminJobRequestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadRequests() {
      setLoading(true);
      setPageError(null);

      try {
        const nextRequests = await getAdminJobRequests();

        if (!isCancelled) {
          setRequests(nextRequests ?? []);
        }
      } catch (error) {
        if (!isCancelled) {
          setRequests([]);
          setPageError(
            error instanceof Error && error.message
              ? error.message
              : "No pudimos cargar las solicitudes reales.",
          );
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void loadRequests();

    return () => {
      isCancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return requests.filter((request) => {
      const matchesStatus = filter === "all" || request.status === filter;
      const query = q.trim().toLowerCase();
      const haystack = [
        request.jobTitle ?? "",
        request.jobStatus ?? "",
        request.approxLocation ?? "",
        request.clientName ?? "",
        request.professionalName ?? "",
        request.categoryName ?? "",
        request.serviceName ?? "",
        request.id,
        request.jobId,
        request.professionalId,
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!query || haystack.includes(query));
    });
  }, [filter, q, requests]);

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Solicitudes" subtitle={loading ? "Cargando solicitudes reales..." : `${requests.length} solicitudes reales`} />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="mb-3 border-teal-100 bg-teal-50/40">
          <div className="font-bold text-[13px] text-teal-700 mb-1">Solicitudes reales Supabase</div>
          <div className="text-[11.5px] text-teal-700/80 leading-snug">
            Solo lectura · sin emails, teléfonos ni dirección exacta.
          </div>
        </Card>

        {loading && (
          <Card className="mb-3 text-[12px] text-ink-600 leading-snug">
            Estamos cargando las solicitudes reales.
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
            placeholder="Buscar por trabajo, cliente, profesional o ubicación aproximada..."
            className="flex-1 bg-transparent outline-none text-[14px] text-ink-800 placeholder:text-ink-400"
          />
        </div>

        <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide">
          {FILTERS.map((option) => {
            const selected = filter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border-[1.5px] whitespace-nowrap ${
                  selected
                    ? "border-coral-500 bg-coral-50 text-coral-700"
                    : "border-sand-200 text-ink-500 bg-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          {filtered.map((request) => (
            <Card key={request.id} className="!p-3" testId={`admin-job-request-row-${request.id}`}>
              <div className="flex items-start gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusPillClassName(request.status)}`}>
                      {request.status}
                    </span>
                    <span className="text-[10px] text-ink-400 font-bold">{getShortId(request.id)}</span>
                  </div>
                  <div className="font-bold text-[13.5px] text-ink-800 truncate">
                    {request.jobTitle ?? `Trabajo ${getShortId(request.jobId)}`}
                  </div>
                  <div className="text-[11.5px] text-ink-500 truncate">
                    Estado trabajo: {request.jobStatus ?? "No registrado"} · Ubicación aproximada: {request.approxLocation ?? "No registrada"}
                  </div>
                  <div className="mt-1 text-[11px] text-ink-400 truncate">
                    Cliente: {request.clientName ?? "Cliente no registrado"} · Profesional: {request.professionalName ?? getShortId(request.professionalId)}
                  </div>
                  <div className="mt-1 text-[11px] text-ink-400 truncate">
                    {(request.categoryName ?? "Sin categoría")} · {(request.serviceName ?? "Sin servicio")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10.5px] text-ink-400">{formatRequestDate(request.createdAt)}</div>
                </div>
              </div>
            </Card>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-10 text-ink-400 text-[12.5px]">
              Sin solicitudes reales en este filtro.
            </div>
          )}
        </div>
      </ScreenBody>
    </div>
  );
}

function MockAdminSolicitudesPage() {
  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Solicitudes" subtitle="Disponible en Supabase" />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="border-amber-100 bg-amber-50">
          <div className="font-bold text-[13px] text-amber-700 mb-1">Listado real disponible en modo Supabase</div>
          <div className="text-[11.5px] text-amber-700/80 leading-snug">
            Esta pantalla se activa con `NEXT_PUBLIC_DATA_MODE=supabase`. En mock no intenta leer solicitudes reales.
          </div>
        </Card>
      </ScreenBody>
    </div>
  );
}

export default function AdminSolicitudesPage() {
  return isSupabaseMode() ? <SupabaseAdminSolicitudesPage /> : <MockAdminSolicitudesPage />;
}
