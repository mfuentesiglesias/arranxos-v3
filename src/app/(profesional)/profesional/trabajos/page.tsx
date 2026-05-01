"use client";
import { useEffect, useRef, useState, Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { HeaderActionSheet } from "@/components/layout/header-action-sheet";
import { StatusBar } from "@/components/layout/status-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { JobCard } from "@/components/jobs/job-card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { MapView } from "@/components/map/map-view";
import { jobs, professionals } from "@/lib/data";
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
  getProfessionalCatalogProfile,
  useSession,
} from "@/lib/store";

const KM_OPTIONS = [5, 10, 25, 50, 100] as const;
const OPPORTUNITY_FILTERS = [
  { id: "all", label: "Todos" },
  { id: "recommended", label: "Para mí" },
  { id: "matching", label: "Mis especialidades" },
  { id: "outside", label: "Fuera" },
] as const;

type OpportunityFilterMode = (typeof OPPORTUNITY_FILTERS)[number]["id"];

function Inner() {
  const params = useSearchParams();
  const myOnly = params.get("mine") === "1";
  const currentProfessionalId = useSession(getCurrentProfessionalId);
  const approvedCatalogServices = useSession(getEffectiveApprovedCatalogServices);
  const professionalCatalogProfile = useSession((state) =>
    getProfessionalCatalogProfile(state, currentProfessionalId),
  );
  const currentProfessionalSeed =
    professionals.find((professional) => professional.id === currentProfessionalId) ??
    professionals[0];
  const currentProfessional = buildEffectiveProfessionalForCatalog(
    currentProfessionalSeed,
    professionalCatalogProfile,
  );
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
  const [maxKm, setMaxKm] = useState<number>(50);
  const [draftMaxKm, setDraftMaxKm] = useState<number>(50);
  const [selectedMapJobId, setSelectedMapJobId] = useState<string | null>(null);
  const [highlightedJobId, setHighlightedJobId] = useState<string | null>(null);
  const jobRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const openFilters = () => {
    setDraftOpportunityFilter(opportunityFilter);
    setDraftSuggestedFilterIds(selectedSuggestedFilterIds);
    setDraftMaxKm(maxKm);
    setFiltersOpen(true);
  };

  const resetDraftFilters = () => {
    setDraftOpportunityFilter("all");
    setDraftSuggestedFilterIds([]);
    setDraftMaxKm(50);
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

  const all = jobs.filter((j) =>
    myOnly
      ? j.assignedProId === "p1"
      : j.status === "published" || j.status === "agreement_pending",
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

  const displayJobs =
    opportunityFilter === "recommended"
      ? [...filtered].sort(
          (a, b) => Number(b.specialtyMatch.isMatch) - Number(a.specialtyMatch.isMatch),
        )
      : filtered;

  const pins = displayJobs.slice(0, 8).map(({ job }, i) => ({
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
              En esta fase, el radio actualiza la vista, pero todavía no aplica filtrado real por distancia.
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
                    Vista aproximada. El filtrado real por distancia se conectará en la siguiente fase.
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
              DEMO: mapa simulado. Producción → MapLibre + PostGIS.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[12px] text-ink-400 font-semibold">
            {displayJobs.length} trabajo{displayJobs.length === 1 ? "" : "s"}
          </span>
          <span className="text-[11px] text-ink-400 font-semibold">
            Radio: {maxKm} km
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {displayJobs.map(({ job, specialtyMatch }, i) => {
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
                  showDistance={
                    !myOnly ? `${1 + ((i * 3) % 12)} km` : undefined
                  }
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
          {displayJobs.length === 0 && (
            <div className="text-center py-12 text-ink-400 text-[13px]">
              No hay trabajos que coincidan.
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
