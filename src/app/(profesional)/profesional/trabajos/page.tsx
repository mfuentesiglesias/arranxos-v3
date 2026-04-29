"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StatusBar } from "@/components/layout/status-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { JobCard } from "@/components/jobs/job-card";
import { Icon } from "@/components/ui/icon";
import { MapView } from "@/components/map/map-view";
import { categoryGroups, jobs, professionals } from "@/lib/data";
import { classifyJobForProfessionalSpecialties } from "@/lib/catalog";
import { getCurrentProfessionalId, useSession } from "@/lib/store";

function Inner() {
  const params = useSearchParams();
  const myOnly = params.get("mine") === "1";
  const currentProfessionalId = useSession(getCurrentProfessionalId);
  const currentProfessional =
    professionals.find((professional) => professional.id === currentProfessionalId) ??
    professionals[0];

  const [view, setView] = useState<"lista" | "mapa">("lista");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [maxKm, setMaxKm] = useState<number>(50);

  const all = jobs.filter((j) =>
    myOnly
      ? j.assignedProId === "p1"
      : j.status === "published" || j.status === "agreement_pending",
  );

  const filtered = all.filter((j) => {
    const q = search.toLowerCase();
    const matchesQ =
      !q ||
      j.title.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q) ||
      j.category.toLowerCase().includes(q);
    const matchesC = !category || j.category === category;
    return matchesQ && matchesC;
  });

  const pins = filtered.slice(0, 8).map((j, i) => ({
    id: j.id,
    x: 15 + ((i * 13) % 70),
    y: 20 + ((i * 19) % 60),
    label: `${j.priceMin}€`,
    type: "coral" as const,
  }));

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
          <button className="text-coral-600 font-bold text-[12px] flex items-center gap-1">
            <Icon name="filter" size={14} />
            Filtros
          </button>
        </div>

        <div className="flex gap-1.5 mt-3 overflow-x-auto -mx-1 px-1 scrollbar-hide">
          <button
            onClick={() => setCategory("")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border-[1.5px] ${
              !category
                ? "border-coral-500 bg-coral-50 text-coral-700"
                : "border-sand-200 text-ink-500 bg-white"
            }`}
          >
            Todas
          </button>
          {categoryGroups[0].categories.slice(0, 6).map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.name)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border-[1.5px] whitespace-nowrap ${
                category === c.name
                  ? "border-coral-500 bg-coral-50 text-coral-700"
                  : "border-sand-200 text-ink-500 bg-white"
              }`}
            >
              <span className="mr-1">{c.icon}</span>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <ScreenBody className="px-4 pt-4 pb-6">
        {view === "mapa" && (
          <div className="mb-4">
            <MapView height={260} pins={pins} />
            <p className="text-[11px] text-ink-400 mt-2 text-center italic">
              DEMO: mapa simulado. Producción → MapLibre + PostGIS.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[12px] text-ink-400 font-semibold">
            {filtered.length} trabajo{filtered.length === 1 ? "" : "s"}
          </span>
          <span className="text-[11px] text-ink-400 font-semibold">
            Radio: {maxKm} km
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {filtered.map((j, i) => {
            const specialtyMatch = !myOnly
              ? classifyJobForProfessionalSpecialties(j, currentProfessional)
              : undefined;

            return (
              <JobCard
                key={j.id}
                job={j}
                href={`/profesional/trabajos/${j.id}`}
                approxLocation={!myOnly && j.status === "published"}
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
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-ink-400 text-[13px]">
              No hay trabajos que coincidan.
            </div>
          )}
        </div>
      </ScreenBody>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div />}>
      <Inner />
    </Suspense>
  );
}
