"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { RatingStars } from "@/components/pros/rating-stars";
import { StrikeBadge } from "@/components/pros/strike-badge";
import { Button } from "@/components/ui/button";
import { defaultAdminConfig } from "@/lib/data";
import { listAdminProfessionalScores, type ApiAdminProfessionalScoreListItem } from "@/lib/api/reliability";
import { getProfessionalReliabilitySummary } from "@/lib/reliability";
import {
  getEffectiveJobs,
  getEffectiveProfessionals,
  getReviewsForProfessional,
  useSession,
} from "@/lib/store";
import { isSupabaseMode } from "@/lib/supabase/config";
import type { ProStatus } from "@/lib/types";

function getReliabilityLabelText(label: "alta" | "media" | "baja" | "buena") {
  if (label === "buena") {
    return "Buena";
  }

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getReliabilityLabelClassName(label: "alta" | "media" | "baja" | "buena") {
  return (
    {
      alta: "text-teal-700",
      buena: "text-sky-700",
      media: "text-amber-700",
      baja: "text-rose-600",
    } satisfies Record<"alta" | "media" | "baja" | "buena", string>
  )[label];
}

function getRiskStateText(riskState: "low" | "medium" | "high" | "critical") {
  return {
    low: "Riesgo bajo",
    medium: "Riesgo medio",
    high: "Riesgo alto",
    critical: "Riesgo crítico",
  }[riskState];
}

function getRiskStateClassName(riskState: "low" | "medium" | "high" | "critical") {
  return {
    low: "text-teal-700 bg-teal-50",
    medium: "text-amber-700 bg-amber-50",
    high: "text-rose-700 bg-rose-50",
    critical: "text-white bg-rose-600",
  }[riskState];
}

function hasInsufficientHistory(professional: ApiAdminProfessionalScoreListItem) {
  return (
    professional.reviewCount === 0 &&
    professional.completedJobs === 0 &&
    professional.cancelledJobs === 0 &&
    professional.openDisputes === 0 &&
    professional.resolvedAgainstProfessional === 0 &&
    professional.splitDisputes === 0 &&
    professional.strikeCount === 0
  );
}

function SupabaseAdminProfesionalesPage() {
  const [filter, setFilter] = useState<ProStatus | "all">("pending");
  const [q, setQ] = useState("");
  const [professionals, setProfessionals] = useState<ApiAdminProfessionalScoreListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadScores() {
      setLoading(true);
      setPageError(null);

      try {
        const nextProfessionals = await listAdminProfessionalScores();

        if (!isCancelled) {
          setProfessionals(nextProfessionals);
        }
      } catch (error) {
        if (!isCancelled) {
          setProfessionals([]);
          setPageError(
            error instanceof Error && error.message
              ? error.message
              : "No pudimos cargar los scores reales de fiabilidad.",
          );
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void loadScores();

    return () => {
      isCancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return professionals.filter((professional) => {
      const matchesStatus = filter === "all" || professional.status === filter;
      const query = q.trim().toLowerCase();
      const matchesQuery =
        !query ||
        professional.fullName.toLowerCase().includes(query) ||
        professional.status.toLowerCase().includes(query) ||
        professional.verificationStatus.toLowerCase().includes(query);

      return matchesStatus && matchesQuery;
    });
  }, [filter, professionals, q]);

  const counts = {
    pending: professionals.filter((professional) => professional.status === "pending").length,
    approved: professionals.filter((professional) => professional.status === "approved").length,
    blocked: professionals.filter((professional) => professional.status === "blocked").length,
  };

  const tabs: { id: ProStatus | "all"; label: string; count?: number }[] = [
    { id: "pending", label: "Pendientes", count: counts.pending },
    { id: "approved", label: "Aprobados", count: counts.approved },
    { id: "blocked", label: "Bloqueados", count: counts.blocked },
    { id: "all", label: "Todos", count: professionals.length },
  ];

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Profesionales" subtitle={`${professionals.length} totales`} />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="mb-3 border-teal-100 bg-teal-50/40">
          <div className="font-bold text-[13px] text-teal-700 mb-1">Score de fiabilidad</div>
          <div className="text-[11.5px] text-teal-700/80 leading-snug">
            Solo lectura. Este score no cambia todavía la visibilidad ni los límites.
          </div>
        </Card>

        {loading && (
          <Card className="mb-3 text-[12px] text-ink-600 leading-snug">
            Estamos cargando los scores reales de fiabilidad.
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
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar nombre, estado, verificación…"
            className="flex-1 bg-transparent outline-none text-[14px] text-ink-800 placeholder:text-ink-400"
          />
        </div>

        <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const selected = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border-[1.5px] whitespace-nowrap ${
                  selected
                    ? "border-coral-500 bg-coral-50 text-coral-700"
                    : "border-sand-200 text-ink-500 bg-white"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={selected ? "text-coral-500" : "text-ink-400"}>
                    {" "}· {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          {filtered.map((professional) => {
            const insufficientHistory = hasInsufficientHistory(professional);

            return (
              <Card key={professional.professionalId} className="!p-3" testId={`admin-professional-card-${professional.professionalId}`}>
                <div className="flex items-start gap-3 mb-2">
                  <Avatar initials={professional.avatarInitials ?? professional.fullName.slice(0, 2).toUpperCase()} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="font-bold text-[13.5px] text-ink-800 truncate">{professional.fullName}</div>
                      <StatusPill status={professional.status} professionalId={professional.professionalId} />
                    </div>
                    <div className="text-[11.5px] text-ink-500 mb-1 truncate">
                      Verificación: {professional.verificationStatus}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RatingStars value={professional.averageRating ?? 0} />
                      <span className="text-[11px] font-bold text-ink-700">
                        {(professional.averageRating ?? 0).toFixed(1)}
                      </span>
                      <span className="text-[10.5px] text-ink-400">({professional.reviewCount})</span>
                      <StrikeBadge
                        strikes={professional.strikeCount}
                        threshold={defaultAdminConfig.strikeAutoBlockThreshold}
                        compact
                      />
                    </div>
                  </div>
                  <div className="min-w-[84px] text-right">
                    <div className="text-[10.5px] text-ink-400 uppercase tracking-wide">Solo lectura</div>
                    <div className="text-[20px] font-extrabold leading-none text-ink-900" data-testid={`admin-professional-reliability-score-${professional.professionalId}`}>
                      {professional.score}
                    </div>
                    <div className={`mt-1 text-[10.5px] font-bold uppercase tracking-wide ${getReliabilityLabelClassName(professional.label)}`} data-testid={`admin-professional-reliability-label-${professional.professionalId}`}>
                      {getReliabilityLabelText(professional.label)}
                    </div>
                  </div>
                </div>

                <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-sand-200/70 bg-sand-50/80 px-3 py-2 text-[11px] text-ink-500">
                  <span>Score de fiabilidad</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getRiskStateClassName(professional.riskState)}`}>
                    {getRiskStateText(professional.riskState)}
                  </span>
                </div>

                {insufficientHistory && (
                  <div className="mb-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-700 leading-snug">
                    Sin histórico suficiente.
                  </div>
                )}

                <div className="mb-2 rounded-xl border border-sand-200/70 bg-sand-50/80 px-3 py-2 text-[11px] leading-snug text-ink-500">
                  Reviews: {professional.reviewCount} · Rating: {(professional.averageRating ?? 0).toFixed(1)}
                  · Completed: {professional.completedJobs} · Cancelled: {professional.cancelledJobs}
                  · Disputas abiertas: {professional.openDisputes} · Resueltas contra el pro: {professional.resolvedAgainstProfessional}
                  · Split: {professional.splitDisputes} · Strikes: {professional.strikeCount}
                </div>
              </Card>
            );
          })}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-10 text-ink-400 text-[12.5px]">
              {professionals.length === 0 ? "No hay profesionales reales disponibles." : "Sin profesionales en este estado."}
            </div>
          )}
        </div>
      </ScreenBody>
    </div>
  );
}

function MockAdminProfesionalesPage() {
  const [filter, setFilter] = useState<ProStatus | "all">("pending");
  const [q, setQ] = useState("");
  const session = useSession();
  const effectiveJobs = useMemo(() => getEffectiveJobs(session), [session]);
  const effectiveProfessionals = useMemo(() => getEffectiveProfessionals(session), [session]);
  const setProfessionalStatus = useSession((s) => s.setProfessionalStatus);

  const filtered = effectiveProfessionals.filter((p) => {
    const ms = filter === "all" || p.status === filter;
    const mq =
      !q ||
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.specialty.toLowerCase().includes(q.toLowerCase()) ||
      p.location.toLowerCase().includes(q.toLowerCase());
    return ms && mq;
  });

  const counts = {
    pending: effectiveProfessionals.filter((p) => p.status === "pending").length,
    approved: effectiveProfessionals.filter((p) => p.status === "approved").length,
    blocked: effectiveProfessionals.filter((p) => p.status === "blocked").length,
  };

  const tabs: { id: ProStatus | "all"; label: string; count?: number }[] = [
    { id: "pending", label: "Pendientes", count: counts.pending },
    { id: "approved", label: "Aprobados", count: counts.approved },
    { id: "blocked", label: "Bloqueados", count: counts.blocked },
    { id: "all", label: "Todos", count: effectiveProfessionals.length },
  ];

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Profesionales" subtitle={`${effectiveProfessionals.length} totales`} />
      <ScreenBody className="px-4 pt-3 pb-6">
        <div className="flex items-center gap-2 bg-white rounded-2xl px-3.5 py-2.5 mb-3 border border-sand-200/70">
          <Icon name="search" size={16} stroke={2.2} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar nombre, especialidad…"
            className="flex-1 bg-transparent outline-none text-[14px] text-ink-800 placeholder:text-ink-400"
          />
        </div>
        <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide">
          {tabs.map((t) => {
            const sel = filter === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border-[1.5px] whitespace-nowrap ${
                  sel
                    ? "border-coral-500 bg-coral-50 text-coral-700"
                    : "border-sand-200 text-ink-500 bg-white"
                }`}
              >
                {t.label}
                {t.count !== undefined && (
                  <span className={sel ? "text-coral-500" : "text-ink-400"}>
                    {" "}
                    · {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <Card className="mb-3 border-sand-200/70 bg-sand-100/70">
          <div className="text-[12px] text-ink-600 leading-snug">
            La fiabilidad mostrada aqui es un score mock/demo derivado. No cambia
            permisos, no crea bloqueos automaticos y no altera el ranking real.
          </div>
        </Card>

        <div className="flex flex-col gap-2">
          {filtered.map((p) => {
            const reliability = getProfessionalReliabilitySummary({
              professional: p,
              reviews: getReviewsForProfessional(session, p.id),
              jobs: effectiveJobs,
              disputes: session.disputes,
            });

            return (
              <Card key={p.id} className="!p-3" testId={`admin-professional-card-${p.id}`}>
                <div className="flex items-start gap-3 mb-2">
                  <Avatar initials={p.avatar} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="font-bold text-[13.5px] text-ink-800 truncate">
                        {p.name}
                      </div>
                      <StatusPill status={p.status} professionalId={p.id} />
                    </div>
                    <div className="text-[11.5px] text-ink-500 mb-1 truncate">
                      {p.specialty} · {p.location} · desde {p.since}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RatingStars value={p.rating} />
                      <span className="text-[11px] font-bold text-ink-700">
                        {p.rating.toFixed(1)}
                      </span>
                      <span className="text-[10.5px] text-ink-400">({p.reviews})</span>
                      <StrikeBadge
                        strikes={p.strikes ?? 0}
                        threshold={defaultAdminConfig.strikeAutoBlockThreshold}
                        compact
                      />
                    </div>
                  </div>
                  <div className="min-w-[78px] text-right">
                    <div
                      className="text-[20px] font-extrabold leading-none text-ink-900"
                      data-testid={`admin-professional-reliability-score-${p.id}`}
                    >
                      {reliability.score}
                    </div>
                    <div
                      className={`mt-1 text-[10.5px] font-bold uppercase tracking-wide ${getReliabilityLabelClassName(reliability.label)}`}
                      data-testid={`admin-professional-reliability-label-${p.id}`}
                    >
                      {getReliabilityLabelText(reliability.label)}
                    </div>
                    <div className="mt-1 text-[10px] text-ink-400">Mock/demo</div>
                  </div>
                </div>
                <div className="mb-2 rounded-xl border border-sand-200/70 bg-sand-50/80 px-3 py-2 text-[11px] leading-snug text-ink-500">
                  Reviews: {reliability.reviewCount} · Rating: {reliability.averageRating.toFixed(1)}
                  · Completed: {reliability.completedJobs} · Cancelled: {reliability.cancelledJobs}
                  · Disputas: {reliability.openDisputes + reliability.resolvedAgainstPro + reliability.splitDisputes}
                  · Strikes: {reliability.strikes}
                </div>
                <ProActions
                  professionalId={p.id}
                  status={p.status}
                  onApprove={() => setProfessionalStatus(p.id, "approved")}
                  onBlock={() => setProfessionalStatus(p.id, "blocked")}
                  onReinstate={() => setProfessionalStatus(p.id, "approved")}
                />
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-ink-400 text-[12.5px]">
              Sin profesionales en este estado.
            </div>
          )}
        </div>
      </ScreenBody>
    </div>
  );
}

export default function AdminProsPage() {
  if (isSupabaseMode()) {
    return <SupabaseAdminProfesionalesPage />;
  }

  return <MockAdminProfesionalesPage />;
}

function StatusPill({
  status,
  professionalId,
}: {
  status: ProStatus;
  professionalId: string;
}) {
  const m = {
    pending: { label: "Pendiente", cls: "bg-amber-50 text-amber-700" },
    approved: { label: "Aprobado", cls: "bg-teal-50 text-teal-700" },
    blocked: { label: "Bloqueado", cls: "bg-rose-50 text-rose-700" },
  }[status];
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.cls}`}
      data-testid={`admin-professional-status-${professionalId}`}
    >
      {m.label}
    </span>
  );
}

function ProActions({
  professionalId,
  status,
  onApprove,
  onBlock,
  onReinstate,
}: {
  professionalId: string;
  status: ProStatus;
  onApprove: () => void;
  onBlock: () => void;
  onReinstate: () => void;
}) {
  if (status === "pending") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Button
          full
          size="sm"
          variant="outline"
          onClick={onBlock}
          testId={`admin-professional-block-${professionalId}`}
        >
          Rechazar
        </Button>
        <Button
          full
          size="sm"
          onClick={onApprove}
          testId={`admin-professional-approve-${professionalId}`}
        >
          Aprobar
        </Button>
      </div>
    );
  }
  if (status === "approved") {
    return (
      <Button
        full
        size="sm"
        variant="danger"
        onClick={onBlock}
        testId={`admin-professional-block-${professionalId}`}
      >
        Bloquear cuenta
      </Button>
    );
  }
  return (
    <Button
      full
      size="sm"
      variant="outline"
      onClick={onReinstate}
      testId={`admin-professional-reinstate-${professionalId}`}
    >
      Reactivar cuenta
    </Button>
  );
}
