"use client";
import { use, useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { RatingStars } from "@/components/pros/rating-stars";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { jobs, professionals } from "@/lib/data";
import {
  getProfessionalsInZoneForJob,
  getSearchTicketClientState,
} from "@/lib/domain/policies";
import {
  getEffectiveAdminConfig,
  getEffectiveJobById,
  getJobOutreachMeta,
  getSearchTicketByJobId,
  useSession,
} from "@/lib/store";

interface Props {
  params: Promise<{ id: string }>;
}

export default function Page({ params }: Props) {
  const { id } = use(params);
  const adminConfig = useSession(getEffectiveAdminConfig);
  const effectiveJob = useSession((s) => getEffectiveJobById(s, id));
  const outreachMeta = useSession((s) => getJobOutreachMeta(s, id));
  const searchTicket = useSession((s) => getSearchTicketByJobId(s, id));
  const recordInvitationsSent = useSession((s) => s.recordInvitationsSent);
  const createSearchTicket = useSession((s) => s.createSearchTicket);
  const job = effectiveJob ?? jobs.find((j) => j.id === id) ?? jobs[0];
  const limit = adminConfig.invitationLimitPerJob;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sent, setSent] = useState(false);
  const prosInZone = getProfessionalsInZoneForJob(job, professionals);
  const searchTicketState = getSearchTicketClientState({
    job,
    professionals,
    outreachMeta,
    existingTicket: searchTicket,
    daysThreshold: adminConfig.searchTicketNoResponseDays,
  });

  const toggle = (proId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(proId)) next.delete(proId);
      else if (next.size < limit) next.add(proId);
      return next;
    });
  };

  const candidates = professionals.filter((p) => p.status === "approved").slice(0, 12);

  const send = () => {
    recordInvitationsSent(id, selected.size);
    setSent(true);
    setTimeout(() => history.back(), 700);
  };

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar
        title="Invitar profesionales"
        subtitle={`Máx. ${limit} invitaciones · ${job.title}`}
      />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="bg-amber-50/50 border-amber-100 mb-3">
          <div className="text-[12px] text-amber-700 leading-snug">
            Las invitaciones permiten avisar a profesionales seleccionados sobre
            tu trabajo. Hasta <strong>{limit}</strong> por trabajo (configurable
            por admin).
          </div>
        </Card>

        {searchTicketState === "ticket_created" ? (
          <Card className="bg-teal-50/50 border-teal-100 mb-3">
            <div className="text-[12px] text-teal-700 leading-snug">
              Ya existe un ticket de búsqueda para este trabajo. Admin puede seguirlo desde panel y tú recibirás avisos en notificaciones.
            </div>
          </Card>
        ) : searchTicketState === "no_pros_cta" ? (
          <Card className="bg-coral-50/50 border-coral-100 mb-3">
            <div className="text-[12px] text-coral-700 leading-snug mb-3">
              No detectamos profesionales cercanos para este trabajo. Puedes crear un ticket para que admin impulse la búsqueda.
            </div>
            <Button
              size="sm"
              full
              onClick={() => createSearchTicket(id, "no_pros_in_zone")}
            >
              Crear ticket de búsqueda
            </Button>
          </Card>
        ) : searchTicketState === "waiting_info" ? (
          <Card className="bg-amber-50/60 border-amber-100 mb-3">
            <div className="text-[12px] text-amber-700 leading-snug">
              Si en {adminConfig.searchTicketNoResponseDays} días no recibes solicitudes, indícanoslo para ayudarte.
            </div>
          </Card>
        ) : searchTicketState === "no_response_cta" ? (
          <Card className="bg-coral-50/50 border-coral-100 mb-3">
            <div className="text-[12px] text-coral-700 leading-snug mb-3">
              Han pasado {adminConfig.searchTicketNoResponseDays} días sin respuesta útil tras las invitaciones. Puedes crear ticket de búsqueda.
            </div>
            <Button
              size="sm"
              full
              onClick={() => createSearchTicket(id, "no_useful_response")}
            >
              Crear ticket de búsqueda
            </Button>
          </Card>
        ) : null}

        {prosInZone.length === 0 && (
          <div className="text-[11px] text-ink-400 px-1 mb-2">
            No hay profesionales aprobados en la zona detectada del trabajo.
          </div>
        )}

        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[12.5px] font-bold text-ink-700">
            {selected.size}/{limit} seleccionados
          </span>
          <button
            onClick={() => setSelected(new Set())}
            disabled={selected.size === 0}
            className="text-[12px] font-bold text-coral-600 disabled:opacity-40"
          >
            Limpiar
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {candidates.map((p) => {
            const sel = selected.has(p.id);
            const disabled = !sel && selected.size >= limit;
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                disabled={disabled}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border-[1.5px] transition text-left ${
                  sel
                    ? "border-coral-500 bg-coral-50"
                    : "border-sand-200 bg-white"
                } ${disabled ? "opacity-40" : ""}`}
              >
                <Avatar initials={p.avatar} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[13.5px] text-ink-800 truncate">
                    {p.name}
                  </div>
                  <div className="text-[11.5px] text-ink-500 mb-1">
                    {p.specialty} · {p.location}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RatingStars value={p.rating} />
                    <span className="text-[11px] font-bold text-ink-700">
                      {p.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center transition ${
                    sel
                      ? "bg-coral-500 border-coral-500 text-white"
                      : "border-sand-300 bg-white"
                  }`}
                >
                  {sel && <Icon name="check" size={12} stroke={3} />}
                </div>
              </button>
            );
          })}
        </div>
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button full onClick={send} disabled={selected.size === 0 || sent}>
          {sent
            ? `${selected.size} invitaciones enviadas ✓`
            : `Invitar a ${selected.size} profesional${selected.size === 1 ? "" : "es"}`}
        </Button>
      </div>
    </div>
  );
}
