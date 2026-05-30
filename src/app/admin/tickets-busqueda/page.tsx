"use client";
import { useEffect, useMemo, useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { getEffectiveSearchTickets, useSession } from "@/lib/store";
import { isSupabaseMode } from "@/lib/supabase/config";
import {
  listAdminSearchTickets,
  updateSearchTicketStatus,
  type ApiSearchTicket,
} from "@/lib/api/searchTickets";

export default function AdminTicketsPage() {
  const list = useSession(getEffectiveSearchTickets);
  const setSearchTicketStatus = useSession((s) => s.setSearchTicketStatus);
  const isSupabase = isSupabaseMode();
  const [realTickets, setRealTickets] = useState<ApiSearchTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionTicketId, setActionTicketId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!isSupabase) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setPageError(null);

      try {
        const tickets = await listAdminSearchTickets();
        if (!cancelled) {
          setRealTickets(tickets);
        }
      } catch (error) {
        if (!cancelled) {
          setPageError(
            error instanceof Error && error.message
              ? error.message
              : "No pudimos cargar los tickets reales.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [isSupabase]);

  const realDisplayTickets = useMemo(
    () =>
      realTickets.map((ticket) => ({
        id: ticket.id,
        service: ticket.serviceLabel ?? "Servicio no identificado",
        zone: ticket.zone ?? "Zona aproximada no disponible",
        clientName: ticket.clientName ?? `Cliente ${ticket.clientId.slice(0, 8)}`,
        radiusKm: ticket.radiusKm ?? 0,
        createdAt: ticket.createdAt,
        reason: ticket.reason,
        status: ticket.status,
        jobTitle: ticket.jobTitle,
      })),
    [realTickets],
  );

  const displayTickets = isSupabase ? realDisplayTickets : list;

  const filtered = displayTickets.filter((t) =>
    !q ||
    t.service.toLowerCase().includes(q.toLowerCase()) ||
    t.zone.toLowerCase().includes(q.toLowerCase()) ||
    t.clientName.toLowerCase().includes(q.toLowerCase()) ||
    ("jobTitle" in t && t.jobTitle ? t.jobTitle.toLowerCase().includes(q.toLowerCase()) : false),
  );

  const close = (id: string) => setSearchTicketStatus(id, "closed");
  const matched = (id: string) => setSearchTicketStatus(id, "matched");

  const updateRealStatus = async (ticketId: string, status: ApiSearchTicket["status"]) => {
    setActionTicketId(ticketId);
    setPageError(null);
    try {
      const updated = await updateSearchTicketStatus(ticketId, status);
      setRealTickets((current) =>
        current.map((ticket) => (ticket.id === ticketId ? updated : ticket)),
      );
    } catch (error) {
      setPageError(
        error instanceof Error && error.message
          ? error.message
          : "No pudimos actualizar el ticket real.",
      );
    } finally {
      setActionTicketId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar
        title="Tickets de búsqueda"
        subtitle="Clientes sin oferta en zona o sin respuesta útil"
      />
      <ScreenBody className="px-4 pt-3 pb-6">
        {isSupabase && loading && (
          <Card className="mb-3 text-[12px] text-ink-600 leading-snug">
            Estamos cargando los tickets reales.
          </Card>
        )}

        {pageError && (
          <Card className="mb-3 bg-rose-50 border-rose-100 text-[12px] text-rose-700 leading-snug">
            {pageError}
          </Card>
        )}

        <Card className="bg-coral-50 border-coral-100 mb-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-coral-500 text-white flex items-center justify-center">
              <Icon name="search" size={16} />
            </div>
            <div className="text-[12px] text-coral-700 leading-snug">
              Estos tickets se crean cuando un cliente busca un servicio y no
              hay profesionales cerca. Úsalos para dirigir campañas de captación.
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-2 bg-white rounded-2xl px-3.5 py-2.5 mb-3 border border-sand-200/70">
          <Icon name="search" size={16} stroke={2.2} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar servicio, zona, cliente…"
            className="flex-1 bg-transparent outline-none text-[14px] text-ink-800 placeholder:text-ink-400"
          />
        </div>

        <div className="flex flex-col gap-2" data-testid="admin-search-tickets">
          {filtered.map((t) => (
            <Card key={t.id} className="!p-3" testId={`search-ticket-${t.id}`}>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.status === "open"
                      ? "bg-amber-50 text-amber-700"
                      : t.status === "matched" || t.status === "resolved"
                        ? "bg-teal-50 text-teal-700"
                        : t.status === "in_progress"
                          ? "bg-sky-50 text-sky-700"
                      : "bg-sand-100 text-ink-600"
                  }`}
                >
                  {t.status === "open"
                    ? "Abierto"
                    : t.status === "matched" || t.status === "resolved"
                    ? "Cubierto"
                    : t.status === "in_progress"
                      ? "En revisión"
                     : "Cerrado"}
                </span>
                <span className="text-[10.5px] text-ink-400 ml-auto">
                  {t.createdAt.slice(0, 10)} · {t.radiusKm} km
                </span>
              </div>
              <div className="font-bold text-[13.5px] text-ink-800 mb-0.5">
                {t.service}
              </div>
              <div className="text-[11.5px] text-ink-500 mb-3">
                {t.zone} · cliente {t.clientName}
              </div>
              {"jobTitle" in t && t.jobTitle && (
                <div className="text-[11px] text-ink-400 mb-2">
                  Trabajo: {t.jobTitle}
                </div>
              )}
              <div className="text-[11px] text-ink-400 mb-3">
                {t.reason === "no_pros_in_zone"
                  ? "Motivo: sin profesionales en la zona"
                  : t.reason === "no_useful_response"
                    ? "Motivo: sin respuesta útil tras invitaciones"
                    : "Motivo: otro"}
              </div>
              {isSupabase ? (
                (t.status === "open" || t.status === "in_progress") && (
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      full
                      variant="outline"
                      disabled={actionTicketId === t.id}
                      onClick={() => void updateRealStatus(t.id, "cancelled")}
                    >
                      Cerrar
                    </Button>
                    <Button
                      size="sm"
                      full
                      variant="outline"
                      disabled={actionTicketId === t.id}
                      onClick={() => void updateRealStatus(t.id, "in_progress")}
                    >
                      En revisión
                    </Button>
                    <Button
                      size="sm"
                      full
                      disabled={actionTicketId === t.id}
                      onClick={() => void updateRealStatus(t.id, "resolved")}
                    >
                      Cubierto
                    </Button>
                  </div>
                )
              ) : (
                t.status === "open" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" full variant="outline" onClick={() => close(t.id)}>
                      Cerrar ticket
                    </Button>
                    <Button size="sm" full onClick={() => matched(t.id)}>
                      Marcar cubierto
                    </Button>
                  </div>
                )
              )}
            </Card>
          ))}
        </div>
      </ScreenBody>
    </div>
  );
}
