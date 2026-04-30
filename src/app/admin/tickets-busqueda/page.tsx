"use client";
import { useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { getEffectiveSearchTickets, useSession } from "@/lib/store";

export default function AdminTicketsPage() {
  const list = useSession(getEffectiveSearchTickets);
  const setSearchTicketStatus = useSession((s) => s.setSearchTicketStatus);
  const [q, setQ] = useState("");

  const filtered = list.filter((t) =>
    !q ||
    t.service.toLowerCase().includes(q.toLowerCase()) ||
    t.zone.toLowerCase().includes(q.toLowerCase()) ||
    t.clientName.toLowerCase().includes(q.toLowerCase()),
  );

  const close = (id: string) => setSearchTicketStatus(id, "closed");
  const matched = (id: string) => setSearchTicketStatus(id, "matched");

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar
        title="Tickets de búsqueda"
        subtitle="Clientes sin oferta en zona o sin respuesta útil"
      />
      <ScreenBody className="px-4 pt-3 pb-6">
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
                      : t.status === "matched"
                      ? "bg-teal-50 text-teal-700"
                      : "bg-sand-100 text-ink-600"
                  }`}
                >
                  {t.status === "open"
                    ? "Abierto"
                    : t.status === "matched"
                    ? "Cubierto"
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
              <div className="text-[11px] text-ink-400 mb-3">
                {t.reason === "no_pros_in_zone"
                  ? "Motivo: sin profesionales en la zona"
                  : "Motivo: sin respuesta útil tras invitaciones"}
              </div>
              {t.status === "open" && (
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" full variant="outline" onClick={() => close(t.id)}>
                    Cerrar ticket
                  </Button>
                  <Button size="sm" full onClick={() => matched(t.id)}>
                    Marcar cubierto
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </ScreenBody>
    </div>
  );
}
