"use client";
import { useEffect, useMemo, useRef, useState, Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { HeaderActionSheet } from "@/components/layout/header-action-sheet";
import { StatusBar } from "@/components/layout/status-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { JobCard } from "@/components/jobs/job-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { MapView } from "@/components/map/map-view";
import {
  listMyProfessionalInvitations,
  type ApiProfessionalJobInvitation,
} from "@/lib/api/jobInvitations";
import {
  getPublishedJobsForProfessional,
  type ApiProfessionalPublishedJob,
} from "@/lib/api/jobs";
import { getCurrentProfile } from "@/lib/api/profiles";
import { professionals } from "@/lib/data";
import {
  buildEffectiveProfessionalForCatalog,
  classifyJobForProfessionalSpecialties,
  getEffectiveCatalogServices,
  getProfessionalSpecialtyFilterSuggestions,
  jobMatchesProfessionalSpecialtyFilter,
  type ProfessionalSpecialtyFilterOption,
} from "@/lib/catalog";
import {
  getCurrentProfessionalId,
  getEffectiveApprovedCatalogServices,
  getEffectiveJobs,
  getProfessionalCatalogProfile,
  useSession,
} from "@/lib/store";
import { isSupabaseMode } from "@/lib/supabase/config";
import type { Job } from "@/lib/types";

const KM_OPTIONS = [5, 10, 25, 50, 100] as const;
const OPPORTUNITY_FILTERS = [
  { id: "all", label: "Todos" },
  { id: "recommended", label: "Para mí" },
  { id: "matching", label: "Mis especialidades" },
  { id: "outside", label: "Fuera" },
] as const;

type OpportunityFilterMode = (typeof OPPORTUNITY_FILTERS)[number]["id"];

type DistanceState = "within" | "outside" | "unavailable";

type DistanceClassification = {
  distanceState: DistanceState;
  distanceKm?: number;
  distanceLabel: string;
};

function formatInvitationDate(value: string): string {
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

function getInvitationStatusLabel(status: ApiProfessionalJobInvitation["invitationStatus"]): string {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "accepted":
      return "Aceptada";
    case "rejected":
      return "Rechazada";
    case "expired":
      return "Expirada";
    case "cancelled":
      return "Cancelada";
  }
}

function getRequestStatusLabel(status: ApiProfessionalJobInvitation["requestStatus"]): string | null {
  switch (status) {
    case "pending":
      return "Solicitud pendiente";
    case "accepted":
      return "Solicitud aceptada";
    case "rejected":
      return "Solicitud rechazada";
    case "closed":
      return "Solicitud cerrada";
    case "cancelled":
      return "Solicitud cancelada";
    default:
      return null;
  }
}

function Inner() {
  const params = useSearchParams();
  const myOnly = params?.get("mine") === "1";
  const isSupabase = isSupabaseMode();
  const session = useSession();
  const currentProfessionalId = getCurrentProfessionalId(session);
  const approvedCatalogServices = getEffectiveApprovedCatalogServices(session);
  const professionalCatalogProfile = getProfessionalCatalogProfile(
    session,
    currentProfessionalId,
  );
  const effectiveJobs = getEffectiveJobs(session);
  const currentProfessionalSeed =
    professionals.find((professional) => professional.id === currentProfessionalId) ??
    professionals[0];
  const currentProfessional = buildEffectiveProfessionalForCatalog(
    currentProfessionalSeed,
    professionalCatalogProfile,
  );
  const defaultRadiusKm = professionalCatalogProfile?.radiusKm ?? currentProfessional.radiusKm ?? 25;
  const catalogServices = getEffectiveCatalogServices(approvedCatalogServices);
  const suggestedFilters = getProfessionalSpecialtyFilterSuggestions(
    currentProfessional,
    catalogServices,
  );
  const availableSuggestedFilters = [
    ...suggestedFilters.specialties,
    ...suggestedFilters.related,
  ];
  const suggestedFilterMap = new Map(
    availableSuggestedFilters.map((filter) => [filter.id, filter]),
  );

  const [view, setView] = useState<"lista" | "mapa">("lista");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [opportunityFilter, setOpportunityFilter] =
    useState<OpportunityFilterMode>("all");
  const [draftOpportunityFilter, setDraftOpportunityFilter] =
    useState<OpportunityFilterMode>("all");
  const [selectedSuggestedFilterIds, setSelectedSuggestedFilterIds] = useState<string[]>([]);
  const [draftSuggestedFilterIds, setDraftSuggestedFilterIds] = useState<string[]>([]);
  const [maxKm, setMaxKm] = useState<number>(defaultRadiusKm);
  const [draftMaxKm, setDraftMaxKm] = useState<number>(defaultRadiusKm);
  const [selectedMapJobId, setSelectedMapJobId] = useState<string | null>(null);
  const [highlightedJobId, setHighlightedJobId] = useState<string | null>(null);
  const [realJobs, setRealJobs] = useState<ApiProfessionalPublishedJob[]>([]);
  const [realJobsLoading, setRealJobsLoading] = useState(false);
  const [realJobsError, setRealJobsError] = useState<string | null>(null);
  const [professionalInvitations, setProfessionalInvitations] = useState<ApiProfessionalJobInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);
  const [isRealProfessionalApproved, setIsRealProfessionalApproved] = useState(false);
  const jobRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isSupabase) {
      return;
    }

    let cancelled = false;

    const loadRealJobs = async () => {
      setRealJobsLoading(true);
      setRealJobsError(null);
      setInvitationsLoading(true);
      setInvitationsError(null);

      try {
        const profile = await getCurrentProfile();

        if (!profile || profile.role !== "professional" || profile.professionalStatus !== "approved") {
          if (!cancelled) {
            setIsRealProfessionalApproved(false);
            setRealJobs([]);
            setProfessionalInvitations([]);
            setRealJobsLoading(false);
            setInvitationsLoading(false);
          }
          return;
        }

        const [publishedJobsResult, invitationsResult] = await Promise.allSettled([
          getPublishedJobsForProfessional(),
          listMyProfessionalInvitations(),
        ]);

        if (!cancelled) {
          setIsRealProfessionalApproved(true);
          if (publishedJobsResult.status === "fulfilled") {
            setRealJobs(publishedJobsResult.value);
            setRealJobsError(null);
          } else {
            setRealJobs([]);
            setRealJobsError(
              "No pudimos cargar los trabajos reales ahora mismo. Vuelve a intentarlo más tarde.",
            );
          }

          if (invitationsResult.status === "fulfilled") {
            setProfessionalInvitations(invitationsResult.value);
            setInvitationsError(null);
          } else {
            setProfessionalInvitations([]);
            setInvitationsError(
              "No pudimos cargar tus invitaciones reales ahora mismo. Vuelve a intentarlo más tarde.",
            );
          }

          setRealJobsLoading(false);
          setInvitationsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setRealJobs([]);
          setProfessionalInvitations([]);
          setRealJobsError(
            "No pudimos cargar los trabajos reales ahora mismo. Vuelve a intentarlo más tarde.",
          );
          setInvitationsError(
            "No pudimos cargar tus invitaciones reales ahora mismo. Vuelve a intentarlo más tarde.",
          );
          setRealJobsLoading(false);
          setInvitationsLoading(false);
        }
      }
    };

    void loadRealJobs();

    return () => {
      cancelled = true;
    };
  }, [isSupabase]);

  const openFilters = () => {
    setDraftOpportunityFilter(opportunityFilter);
    setDraftSuggestedFilterIds(selectedSuggestedFilterIds);
    setDraftMaxKm(maxKm);
    setFiltersOpen(true);
  };

  const resetDraftFilters = () => {
    setDraftOpportunityFilter("all");
    setDraftSuggestedFilterIds([]);
    setDraftMaxKm(defaultRadiusKm);
  };

  const applyFilters = () => {
    setOpportunityFilter(draftOpportunityFilter);
    setSelectedSuggestedFilterIds(draftSuggestedFilterIds);
    setMaxKm(draftMaxKm);
    setFiltersOpen(false);
  };

  const toggleDraftSuggestedFilter = (filterId: string) => {
    setDraftSuggestedFilterIds((current) =>
      current.includes(filterId)
        ? current.filter((id) => id !== filterId)
        : [...current, filterId],
    );
  };

  const applyQuickFilter = (nextFilter: OpportunityFilterMode) => {
    setOpportunityFilter(nextFilter);
    setDraftOpportunityFilter(nextFilter);
  };

  const appliedSuggestedFilters = selectedSuggestedFilterIds
    .map((filterId) => suggestedFilterMap.get(filterId))
    .filter((filter): filter is ProfessionalSpecialtyFilterOption => Boolean(filter));

  const all = effectiveJobs.filter((j) =>
    myOnly
      ? j.assignedProId === currentProfessionalId
      : j.status === "published",
  );

  const enrichedJobs = all.map((job) => ({
    job,
    specialtyMatch: classifyJobForProfessionalSpecialties(
      job,
      currentProfessional,
      catalogServices,
    ),
  }));

  const filtered = enrichedJobs.filter(({ job, specialtyMatch }) => {
    const q = search.toLowerCase();
    const matchesQ =
      !q ||
      job.title.toLowerCase().includes(q) ||
      job.location.toLowerCase().includes(q) ||
      job.category.toLowerCase().includes(q) ||
      job.service.toLowerCase().includes(q);

    if (!matchesQ) return false;
    if (opportunityFilter === "matching" && !specialtyMatch.isMatch) return false;
    if (opportunityFilter === "outside" && specialtyMatch.isMatch) return false;
    if (
      appliedSuggestedFilters.length > 0 &&
      !appliedSuggestedFilters.some((filter) =>
        jobMatchesProfessionalSpecialtyFilter(job, filter, catalogServices),
      )
    ) {
      return false;
    }

    return true;
  });

  const distanceAwareJobs = useMemo(
    () =>
      filtered.map(({ job, specialtyMatch }) => ({
        job,
        specialtyMatch,
        distance: classifyJobDistanceForProfessional({
          job,
          professional: currentProfessional,
          profile: professionalCatalogProfile,
          radiusKm: maxKm,
        }),
      })),
    [filtered, currentProfessional, professionalCatalogProfile, maxKm],
  );

  const sortByMode = (items: typeof distanceAwareJobs) =>
    opportunityFilter === "recommended"
      ? [...items].sort(
          (a, b) => Number(b.specialtyMatch.isMatch) - Number(a.specialtyMatch.isMatch),
        )
      : items;

  const withinRadiusJobs = sortByMode(
    distanceAwareJobs.filter((entry) => entry.distance.distanceState === "within"),
  );
  const unavailableDistanceJobs = sortByMode(
    distanceAwareJobs.filter((entry) => entry.distance.distanceState === "unavailable"),
  );
  const outsideRadiusJobs = sortByMode(
    distanceAwareJobs.filter((entry) => entry.distance.distanceState === "outside"),
  );
  const visibleJobs = [...withinRadiusJobs, ...unavailableDistanceJobs];

  const pins = visibleJobs.slice(0, 8).map(({ job }, i) => ({
    id: job.id,
    x: 15 + ((i * 13) % 70),
    y: 20 + ((i * 19) % 60),
    label: `${job.priceMin}€`,
    type: "coral" as const,
  }));

  const focusJobFromMap = (jobId: string) => {
    const target = jobRefs.current[jobId];
    setSelectedMapJobId(jobId);
    setHighlightedJobId(jobId);

    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    target?.scrollIntoView({ behavior: "smooth", block: "start" });

    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedJobId((current) => (current === jobId ? null : current));
    }, 2600);
  };

  if (isSupabase) {
    return (
      <div className="flex-1 flex flex-col">
        <StatusBar />
        <div className="px-5 pt-2 pb-3 bg-white border-b border-sand-200/70">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-extrabold text-[20px] text-ink-900 tracking-tight">
              Oportunidades
            </h1>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-sky-50 px-3.5 py-3 text-[12px] text-sky-800 leading-snug">
            Lectura real de trabajos publicados. Solicitudes y filtros avanzados siguen sin conectar en esta vista.
          </div>
        </div>

        <ScreenBody className="px-4 pt-4 pb-6">
          {!isRealProfessionalApproved && !realJobsLoading && !realJobsError && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 text-[12px] text-amber-700 leading-snug">
              Solo un profesional aprobado puede ver oportunidades reales.
            </div>
          )}

          {realJobsError && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 text-[12px] text-rose-700 leading-snug">
              {realJobsError}
            </div>
          )}

          {realJobsLoading && (
            <div className="rounded-2xl border border-sand-200/70 bg-white px-4 py-6 text-[12px] text-ink-500 text-center">
              Cargando trabajos reales…
            </div>
          )}

          {isRealProfessionalApproved && !realJobsLoading && !realJobsError && (
            <div className="flex flex-col gap-3">
              <Card className="bg-white border-sand-200/70" testId="professional-invitations-section">
                <div className="font-bold text-[14px] text-ink-800 mb-1.5">Invitaciones recibidas</div>
                <div className="text-[12px] text-ink-500 leading-snug mb-3">
                  Trabajos a los que un cliente te ha invitado directamente. La dirección exacta y el chat solo se activan si el cliente acepta una solicitud.
                </div>

                {invitationsLoading ? (
                  <div className="rounded-2xl border border-sand-200/70 bg-sand-50 px-4 py-5 text-[12px] text-ink-500 text-center" data-testid="professional-invitations-loading">
                    Cargando invitaciones…
                  </div>
                ) : invitationsError ? (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 text-[12px] text-rose-700 leading-snug" data-testid="professional-invitations-error">
                    {invitationsError}
                  </div>
                ) : professionalInvitations.length === 0 ? (
                  <div className="rounded-2xl border border-sand-200/70 bg-sand-50 px-4 py-5 text-[12px] text-ink-500 text-center leading-snug" data-testid="professional-invitations-empty">
                    Aún no tienes invitaciones recibidas.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {professionalInvitations.map((invitation) => {
                      const requestStatusLabel = getRequestStatusLabel(invitation.requestStatus);

                      return (
                        <div
                          key={invitation.invitationId}
                          className="rounded-2xl border border-sand-200/70 bg-sand-50 px-[18px] py-[17px]"
                          data-testid={`professional-invitation-${invitation.invitationId}`}
                        >
                          <div className="mb-1.5 flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1 text-[14px] font-bold leading-tight text-ink-800">
                              {invitation.jobTitle}
                            </div>
                            <div className="flex flex-wrap justify-end gap-1.5">
                              <span className="rounded-full bg-coral-50 px-2.5 py-1 text-[10.5px] font-bold text-coral-700">
                                Invitado
                              </span>
                              <span className="rounded-full bg-sand-100 px-2.5 py-1 text-[10.5px] font-bold text-ink-500">
                                {getInvitationStatusLabel(invitation.invitationStatus)}
                              </span>
                            </div>
                          </div>

                          {(invitation.categoryName || invitation.serviceName) && (
                            <div className="mb-2 flex flex-wrap gap-1.5">
                              {invitation.categoryName && (
                                <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[10.5px] font-bold text-ink-500 border border-sand-200/70">
                                  {invitation.categoryName}
                                </span>
                              )}
                              {invitation.serviceName && (
                                <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-[10.5px] font-bold text-teal-700">
                                  {invitation.serviceName}
                                </span>
                              )}
                            </div>
                          )}

                          <p className="mb-2 line-clamp-3 whitespace-pre-wrap text-[12.5px] text-ink-600 leading-relaxed">
                            {invitation.jobDescription}
                          </p>

                          <div className="mb-2 flex items-center gap-1.5 text-[12px] text-ink-400">
                            <Icon name="pin" size={12} stroke={2} />
                            <span className="truncate">{invitation.approxLocation ?? "Ubicación aproximada no disponible"}</span>
                            <span className="ml-auto whitespace-nowrap text-ink-400">
                              {formatInvitationDate(invitation.invitationCreatedAt)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[12px]">
                            <span className="font-bold text-coral-600">
                              {formatPublishedJobPrice(invitation.priceMin, invitation.priceMax)}
                            </span>
                            <span className="text-[11px] font-medium text-ink-400">orientativo</span>
                          </div>

                          {requestStatusLabel && (
                            <div className="mt-2 inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[10.5px] font-bold text-sky-700">
                              {requestStatusLabel}
                            </div>
                          )}

                          <div className="mt-3 pt-3 border-t border-sand-200/70">
                            <Button
                              href={`/profesional/trabajos/${invitation.jobId}?invitationId=${encodeURIComponent(invitation.invitationId)}`}
                              variant="outline"
                              size="sm"
                              testId={`professional-invitation-detail-${invitation.invitationId}`}
                            >
                              Ver detalle
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {realJobs.length > 0 ? (
                realJobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-2xl border border-sand-200/70 bg-white px-[18px] py-[17px]"
                  >
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 text-[15px] font-bold leading-tight text-ink-800">
                        {job.title}
                      </div>
                      <span className="rounded-full bg-sand-100 px-2.5 py-1 text-[10.5px] font-bold text-ink-500">
                        Publicado
                      </span>
                    </div>

                    <div className="mb-2 flex items-center gap-1.5 text-[12px] text-ink-400">
                      <Icon name="pin" size={12} stroke={2} />
                      <span className="truncate">{job.approxLocation ?? "Ubicación aproximada no disponible"}</span>
                      <span className="ml-auto whitespace-nowrap text-ink-400">
                        {formatPublishedJobDate(job.createdAt)}
                      </span>
                    </div>

                    {(job.categoryName || job.serviceName) && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {job.categoryName && (
                          <span className="inline-flex rounded-full bg-sand-100 px-2.5 py-1 text-[10.5px] font-bold text-ink-500">
                            {job.categoryName}
                          </span>
                        )}
                        {job.serviceName && (
                          <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-[10.5px] font-bold text-teal-700">
                            {job.serviceName}
                          </span>
                        )}
                      </div>
                    )}

                    <p className="mb-3 whitespace-pre-wrap text-[13px] text-ink-600 leading-relaxed">
                      {job.description}
                    </p>

                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-coral-600">
                        {formatPublishedJobPrice(job.priceMin, job.priceMax)}
                      </span>
                      <span className="text-[11px] font-medium text-ink-400">orientativo</span>
                      <span className="ml-auto text-[12px] text-ink-400">
                        {job.invitedCount} invitacion{job.invitedCount === 1 ? "" : "es"}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-sand-200/70">
                      <Button href={`/profesional/trabajos/${job.id}`} variant="outline" size="sm">
                        Ver detalle
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-sand-200/70 bg-white px-4 py-6 text-[12px] text-ink-500 text-center leading-snug">
                  No hay trabajos publicados reales disponibles para tu perfil ahora mismo.
                </div>
              )}
            </div>
          )}
        </ScreenBody>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <StatusBar />
      <div className="px-5 pt-2 pb-3 bg-white border-b border-sand-200/70">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-extrabold text-[20px] text-ink-900 tracking-tight">
            {myOnly ? "Mis trabajos" : "Oportunidades"}
          </h1>
          <div className="flex items-center bg-sand-100 rounded-full p-0.5 text-[12px] font-bold">
            {(["lista", "mapa"] as const).map((v) => (
              <button
                key={v}
                type="button"
                data-testid={v === "lista" ? "view-lista" : "view-mapa"}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-full transition capitalize ${
                  view === v ? "bg-white text-ink-800 shadow-card" : "text-ink-400"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 bg-sand-100 rounded-2xl px-3.5 py-2.5">
          <Icon name="search" size={16} stroke={2.2} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, zona, categoría…"
            className="flex-1 bg-transparent outline-none text-[14px] text-ink-800 placeholder:text-ink-400"
          />
          <button
            type="button"
            data-testid="open-filters"
            onClick={openFilters}
            className="text-coral-600 font-bold text-[12px] flex items-center gap-1"
          >
            <Icon name="filter" size={14} />
            Filtros
          </button>
        </div>

        <div className="flex gap-1.5 mt-3 overflow-x-auto -mx-1 px-1 scrollbar-hide">
          {OPPORTUNITY_FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => applyQuickFilter(filter.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border-[1.5px] whitespace-nowrap ${
                opportunityFilter === filter.id
                  ? "border-coral-500 bg-coral-50 text-coral-700"
                  : "border-sand-200 text-ink-500 bg-white"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <HeaderActionSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtros"
        description="Ajusta cómo quieres explorar oportunidades en esta demo."
        testId="filters-panel"
      >
        <div className="flex flex-col gap-4 pb-1">
          <FilterSection
            title="Radio de búsqueda"
            description={`Valor actual: ${draftMaxKm} km`}
          >
            <div className="flex flex-wrap gap-2">
              {KM_OPTIONS.map((km) => (
                <FilterChip
                  key={km}
                  active={draftMaxKm === km}
                  onClick={() => setDraftMaxKm(km)}
                >
                  {km} km
                </FilterChip>
              ))}
            </div>
            <div className="text-[11px] text-ink-400 leading-snug mt-2">
              El radio ya aplica filtrado mock/demo sobre la lista usando distancia aproximada.
            </div>
          </FilterSection>

          <FilterSection title="Tipo de oportunidad">
            <div className="flex flex-wrap gap-2">
              {OPPORTUNITY_FILTERS.map((filter) => (
                <FilterChip
                  key={filter.id}
                  active={draftOpportunityFilter === filter.id}
                  onClick={() => setDraftOpportunityFilter(filter.id)}
                >
                  {filter.label}
                </FilterChip>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Tus especialidades">
            <div className="flex flex-wrap gap-2">
              {suggestedFilters.specialties.length > 0 ? (
                suggestedFilters.specialties.map((filter) => (
                  <FilterChip
                    key={filter.id}
                    active={draftSuggestedFilterIds.includes(filter.id)}
                    onClick={() => toggleDraftSuggestedFilter(filter.id)}
                  >
                    {filter.label}
                  </FilterChip>
                ))
              ) : (
                <div className="text-[11.5px] text-ink-400 leading-snug">
                  Aún no hay especialidades derivadas para tu perfil demo.
                </div>
              )}
            </div>
          </FilterSection>

          <FilterSection title="Relacionadas">
            <div className="flex flex-wrap gap-2">
              {suggestedFilters.related.length > 0 ? (
                suggestedFilters.related.map((filter) => (
                  <FilterChip
                    key={filter.id}
                    active={draftSuggestedFilterIds.includes(filter.id)}
                    onClick={() => toggleDraftSuggestedFilter(filter.id)}
                  >
                    {filter.label}
                  </FilterChip>
                ))
              ) : (
                <div className="text-[11.5px] text-ink-400 leading-snug">
                  No encontramos sugerencias relacionadas para tu perfil actual.
                </div>
              )}
            </div>
          </FilterSection>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button full variant="outline" onClick={resetDraftFilters}>
              Limpiar
            </Button>
            <Button full onClick={applyFilters}>
              Aplicar filtros
            </Button>
          </div>
        </div>
      </HeaderActionSheet>

      <ScreenBody className="px-4 pt-4 pb-6">
        {view === "mapa" && (
          <div className="mb-4">
            <MapView
              height={260}
              pins={pins}
              showRadius
              radiusKm={maxKm}
              radiusLabel="Radio aprox."
              selectedPinId={selectedMapJobId ?? undefined}
              onPinClick={(pin) => focusJobFromMap(pin.id)}
            />
            <div className="mt-3 rounded-2xl border border-sand-200/70 bg-white p-3.5 shadow-card">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[12px] font-bold text-ink-800">
                    Radio de búsqueda
                  </div>
                  <div className="text-[11px] text-ink-400 leading-snug">
                     Demo activa: el radio ya filtra la lista de oportunidades con distancia mock aproximada.
                  </div>
                </div>
                <div className="rounded-full bg-coral-50 px-3 py-1 text-[12px] font-bold text-coral-700 whitespace-nowrap">
                  {maxKm} km
                </div>
              </div>

              <input
                type="range"
                min={KM_OPTIONS[0]}
                max={KM_OPTIONS[KM_OPTIONS.length - 1]}
                step={5}
                value={maxKm}
                onChange={(e) => setMaxKm(Number(e.target.value))}
                className="w-full accent-[#FF5A5F]"
                aria-label="Radio de búsqueda"
                data-testid="map-radius-slider"
              />

              <div className="mt-3 flex items-center justify-between gap-2">
                {KM_OPTIONS.map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => setMaxKm(km)}
                    className={`min-w-[42px] rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                      maxKm === km
                        ? "bg-coral-50 text-coral-700"
                        : "bg-sand-100 text-ink-500"
                    }`}
                  >
                    {km}
                  </button>
                ))}
              </div>
            </div>
             <p className="text-[11px] text-ink-400 mt-2 text-center italic">
               DEMO: mapa simulado con radio aplicado sobre la lista. Producción → MapLibre + PostGIS.
             </p>
           </div>
         )}

         <div className="flex items-center justify-between mb-2 px-1">
           <span className="text-[12px] text-ink-400 font-semibold">
             {visibleJobs.length} trabajo{visibleJobs.length === 1 ? "" : "s"}
           </span>
           <span className="text-[11px] text-ink-400 font-semibold">
             Radio: {maxKm} km
           </span>
         </div>

          <div data-testid="professional-jobs-radius-filter" className="mb-2 grid grid-cols-3 gap-2">
            <div
              data-testid="professional-jobs-within-radius"
              className="rounded-xl bg-teal-50 px-3 py-2 text-[11px] font-bold text-teal-700 text-center"
            >
              Dentro: {withinRadiusJobs.length}
            </div>
            <div
              data-testid="professional-jobs-distance-unavailable"
              className="rounded-xl bg-sand-100 px-3 py-2 text-[11px] font-bold text-ink-600 text-center"
            >
              Sin distancia: {unavailableDistanceJobs.length}
            </div>
            <div
              data-testid="professional-jobs-outside-radius"
              className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700 text-center"
            >
              Fuera: {outsideRadiusJobs.length}
            </div>
          </div>

         <div className="flex flex-col gap-2.5">
           {withinRadiusJobs.map(({ job, specialtyMatch, distance }) => {
             return (
               <div
                 key={job.id}
                id={`job-card-${job.id}`}
                data-testid={`job-card-${job.id}`}
                ref={(element) => {
                  jobRefs.current[job.id] = element;
                }}
                className={`rounded-2xl transition-all duration-300 ${
                  highlightedJobId === job.id
                    ? "ring-2 ring-coral-300 ring-offset-2 ring-offset-sand-50 bg-coral-50/20"
                    : ""
                }`}
              >
                <JobCard
                  job={job}
                  href={`/profesional/trabajos/${job.id}`}
                  approxLocation={!myOnly && job.status === "published"}
                  showDistance={!myOnly ? distance.distanceLabel : undefined}
                  distanceTestId={!myOnly ? `professional-jobs-distance-badge-${job.id}` : undefined}
                  specialtyMatchLabel={specialtyMatch?.label}
                  specialtyMatch={
                    specialtyMatch
                      ? specialtyMatch.isMatch
                        ? "match"
                        : "outside"
                      : undefined
                  }
                />
              </div>
             );
           })}
           {unavailableDistanceJobs.length > 0 && (
            <div className="pt-1">
              <div className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">
                Distancia no disponible
              </div>
              <div className="flex flex-col gap-2.5">
                {unavailableDistanceJobs.map(({ job, specialtyMatch, distance }) => (
                  <div
                    key={job.id}
                    id={`job-card-${job.id}`}
                    data-testid={`job-card-${job.id}`}
                    ref={(element) => {
                      jobRefs.current[job.id] = element;
                    }}
                  >
                    <JobCard
                      job={job}
                      href={`/profesional/trabajos/${job.id}`}
                      approxLocation={!myOnly && job.status === "published"}
                      showDistance={!myOnly ? distance.distanceLabel : undefined}
                      distanceTestId={!myOnly ? `professional-jobs-distance-badge-${job.id}` : undefined}
                      specialtyMatchLabel={specialtyMatch?.label}
                      specialtyMatch={
                        specialtyMatch
                          ? specialtyMatch.isMatch
                            ? "match"
                            : "outside"
                          : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
           )}
           {visibleJobs.length === 0 && (
             <div className="text-center py-12 text-ink-400 text-[13px]">
               No hay trabajos dentro del radio actual ni con distancia disponible para estos filtros.
             </div>
           )}
           {outsideRadiusJobs.length > 0 && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-[12px] text-amber-700 leading-snug">
              {outsideRadiusJobs.length} trabajo{outsideRadiusJobs.length === 1 ? "" : "s"} quedan fuera del radio actual. Amplía el radio para incluirlos en la lista.
            </div>
           )}
         </div>
       </ScreenBody>
     </div>
  );
}

function FilterSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-sand-200/70 bg-sand-50/60 p-3.5">
      <div className="font-bold text-[13px] text-ink-800">{title}</div>
      {description && (
        <div className="mt-0.5 mb-3 text-[11.5px] text-ink-400 leading-snug">
          {description}
        </div>
      )}
      {!description && <div className="mb-3" />}
      {children}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border-[1.5px] px-3 py-1.5 text-[12px] font-bold transition whitespace-nowrap ${
        active
          ? "border-coral-500 bg-coral-50 text-coral-700"
          : "border-sand-200 bg-white text-ink-500"
      }`}
    >
      {children}
    </button>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div />}>
      <Inner />
    </Suspense>
  );
}

function classifyJobDistanceForProfessional({
  job,
  professional,
  profile,
  radiusKm,
}: {
  job: Job;
  professional: typeof professionals[number];
  profile: {
    workBase: {
      locality: string;
      municipality: string;
    };
  } | undefined;
  radiusKm: number;
}): DistanceClassification {
  if (hasCoordinates(job.lat, job.lng) && hasCoordinates(professional.lat, professional.lng)) {
    const distanceKm = haversineDistanceKm(
      professional.lat!,
      professional.lng!,
      job.lat,
      job.lng,
    );

    return {
      distanceState: distanceKm <= radiusKm ? "within" : "outside",
      distanceKm,
      distanceLabel: `${formatDistanceKm(distanceKm)} km`,
    };
  }

  const textualBase = [
    profile?.workBase.locality,
    profile?.workBase.municipality,
    professional.zone,
    professional.location,
  ]
    .filter(Boolean)
    .map((value) => normalizeLocationText(value ?? ""));
  const jobAreas = [job.location, job.locationApprox]
    .filter(Boolean)
    .map((value) => normalizeLocationText(value));

  if (
    textualBase.some(
      (base) =>
        jobAreas.some((jobArea) => jobArea.includes(base)) ||
        jobAreas.some((jobArea) => base.includes(jobArea)),
    )
  ) {
    return {
      distanceState: "within",
      distanceLabel: "Misma zona (demo)",
    };
  }

  return {
    distanceState: "unavailable",
    distanceLabel: "Distancia no disponible",
  };
}

function hasCoordinates(lat?: number, lng?: number) {
  return typeof lat === "number" && typeof lng === "number";
}

function normalizeLocationText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return 6371 * c;
}

function formatDistanceKm(distanceKm: number) {
  return distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm).toString();
}

function formatPublishedJobDate(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "Publicado recientemente";
  }

  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

function formatPublishedJobPrice(priceMin: number | null, priceMax: number | null) {
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
