"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBar } from "@/components/layout/status-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import {
  listMyProfessionalChats,
  type ApiProfessionalChatThread,
} from "@/lib/api/chat";
import { getCurrentProfile } from "@/lib/api/profiles";
import { isSupabaseMode } from "@/lib/supabase/config";

function formatChatDate(value: string | null): string {
  if (!value) {
    return "Sin actividad reciente";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatPriceRange(priceMin: number | null, priceMax: number | null): string {
  if (typeof priceMin === "number" && typeof priceMax === "number") {
    return `${priceMin}€–${priceMax}€`;
  }

  if (typeof priceMin === "number") {
    return `Desde ${priceMin}€`;
  }

  if (typeof priceMax === "number") {
    return `Hasta ${priceMax}€`;
  }

  return "A negociar";
}

function getJobStatusLabel(status: ApiProfessionalChatThread["jobStatus"]): string {
  switch (status) {
    case "in_progress":
      return "En curso";
    case "agreement_pending":
      return "Presupuesto pendiente";
    case "agreed":
      return "Acordado";
    case "escrow_funded":
      return "Pago protegido";
    case "completed_pending_confirmation":
      return "Pendiente confirmación";
    case "completed":
      return "Completado";
    case "dispute":
      return "Disputa";
    case "cancelled":
      return "Cancelado";
    case "published":
      return "Publicado";
  }
}

export default function ProfessionalChatPage() {
  const isSupabase = isSupabaseMode();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [threads, setThreads] = useState<ApiProfessionalChatThread[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadChats = async () => {
      setLoading(true);
      setError(null);
      setBlocked(false);

      if (!isSupabase) {
        if (!cancelled) {
          setThreads([]);
          setLoading(false);
        }
        return;
      }

      try {
        const profile = await getCurrentProfile();

        if (
          !profile ||
          profile.role !== "professional" ||
          profile.professionalStatus !== "approved"
        ) {
          if (!cancelled) {
            setBlocked(true);
            setThreads([]);
            setLoading(false);
          }
          return;
        }

        const nextThreads = await listMyProfessionalChats();

        if (!cancelled) {
          setThreads(nextThreads);
          setLoading(false);
        }
      } catch (nextError) {
        if (!cancelled) {
          setThreads([]);
          setLoading(false);
          setError(
            nextError instanceof Error && nextError.message
              ? nextError.message
              : "No pudimos cargar tus chats reales ahora mismo.",
          );
        }
      }
    };

    void loadChats();

    return () => {
      cancelled = true;
    };
  }, [isSupabase]);

  return (
    <div className="flex-1 flex flex-col" data-testid="professional-chat-page">
      <StatusBar />
      <div className="bg-white border-b border-sand-200/70 px-5 pt-2 pb-3">
        <div className="font-extrabold text-[20px] text-ink-900 tracking-tight">Chats</div>
        <div className="mt-1 text-[12px] text-ink-500 leading-snug">
          Los chats se abren cuando un cliente acepta una solicitud.
        </div>
      </div>

      <ScreenBody className="px-4 pt-4 pb-6">
        {loading ? (
          <Card className="bg-white border-sand-200/70" testId="professional-chat-loading">
            <div className="py-6 text-center text-[12px] text-ink-500">Cargando chats reales…</div>
          </Card>
        ) : blocked ? (
          <Card className="bg-amber-50 border-amber-100">
            <div className="font-bold text-[13px] text-amber-800 mb-1">Acceso restringido</div>
            <div className="text-[12px] text-amber-700 leading-snug">
              Solo un profesional aprobado puede acceder a chats reales.
            </div>
          </Card>
        ) : error ? (
          <Card className="bg-rose-50 border-rose-100" testId="professional-chat-error">
            <div className="font-bold text-[13px] text-rose-700 mb-1">No disponible</div>
            <div className="text-[12px] text-rose-700/80 leading-snug">{error}</div>
          </Card>
        ) : threads.length === 0 ? (
          <Card className="bg-white border-sand-200/70" testId="professional-chat-empty">
            <div className="py-6 text-center text-[12px] text-ink-500 leading-snug">
              Todavía no tienes chats abiertos en esta cuenta profesional.
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-2.5 pb-20" data-testid="professional-chat-list">
            {threads.map((thread) => (
              <Card
                key={thread.chatId}
                className="bg-white border-sand-200/70"
                testId="professional-chat-card"
              >
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 text-[14px] font-bold leading-tight text-ink-800">
                    {thread.jobTitle}
                  </div>
                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10.5px] font-bold text-sky-700 whitespace-nowrap">
                    {getJobStatusLabel(thread.jobStatus)}
                  </span>
                </div>

                {(thread.categoryName || thread.serviceName) && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {thread.categoryName && (
                      <span className="inline-flex rounded-full bg-sand-100 px-2.5 py-1 text-[10.5px] font-bold text-ink-500">
                        {thread.categoryName}
                      </span>
                    )}
                    {thread.serviceName && (
                      <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-[10.5px] font-bold text-teal-700">
                        {thread.serviceName}
                      </span>
                    )}
                  </div>
                )}

                <div className="mb-2 flex items-center gap-1.5 text-[12px] text-ink-400">
                  <Icon name="pin" size={12} stroke={2} />
                  <span className="truncate">
                    {thread.approxLocation ?? "Ubicación aproximada no disponible"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[12px]">
                  <span className="font-bold text-coral-600">
                    {formatPriceRange(thread.priceMin, thread.priceMax)}
                  </span>
                  <span className="text-[11px] font-medium text-ink-400">orientativo</span>
                  <span className="ml-auto whitespace-nowrap text-[11px] text-ink-400">
                    {formatChatDate(thread.lastMessageAt ?? thread.createdAt)}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-sand-200/70">
                  <Link
                    href={`/chat/${thread.jobId}`}
                    className="inline-flex items-center justify-center rounded-2xl border border-sand-200 bg-white px-4 py-2 text-[12px] font-bold text-coral-600 transition hover:bg-coral-50"
                  >
                    Abrir chat
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScreenBody>
    </div>
  );
}
