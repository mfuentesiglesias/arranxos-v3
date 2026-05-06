"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import {
  getCatalogGroupPresentation,
  getCatalogServicesByCategory,
  getEffectiveCatalogCategories,
  getEffectiveCatalogServices,
  getSeedCatalogCategories,
  getSeedCatalogServices,
  normalizeCatalogText,
  slugifyCatalogText,
} from "@/lib/catalog";
import {
  getEffectiveApprovedCatalogCategories,
  getEffectiveApprovedCatalogServices,
  getEffectiveCatalogRequests,
  useSession,
} from "@/lib/store";
import type { CatalogCategory, CatalogService } from "@/lib/types";

type SourceFilter = "all" | "seed" | "admin_approved";

export default function AdminCatalogoPage() {
  const approvedCategories = useSession(getEffectiveApprovedCatalogCategories);
  const approvedServices = useSession(getEffectiveApprovedCatalogServices);
  const catalogRequests = useSession(getEffectiveCatalogRequests);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const seedCategories = useMemo(() => getSeedCatalogCategories(), []);
  const seedServices = useMemo(() => getSeedCatalogServices(), []);
  const effectiveCategories = useMemo(
    () =>
      [...getEffectiveCatalogCategories(approvedCategories)].sort(
        (a, b) =>
          (a.group ?? "").localeCompare(b.group ?? "", "es") ||
          a.name.localeCompare(b.name, "es"),
      ),
    [approvedCategories],
  );
  const effectiveServices = useMemo(
    () =>
      [...getEffectiveCatalogServices(approvedServices)].sort(
        (a, b) =>
          a.categoryName.localeCompare(b.categoryName, "es") ||
          a.name.localeCompare(b.name, "es"),
      ),
    [approvedServices],
  );
  const pendingRequests = catalogRequests.filter((request) =>
    ["pending", "reviewing"].includes(request.status),
  ).length;
  const normalizedQuery = normalizeCatalogText(query);

  const groupedCategories = effectiveCategories.filter((category) => {
    const categoryServices = getCatalogServicesByCategory(category.id, effectiveServices);
    const sourceMatches =
      sourceFilter === "all" ||
      category.source === sourceFilter ||
      categoryServices.some((service) => service.source === sourceFilter);
    const textMatches =
      !normalizedQuery ||
      normalizeCatalogText(category.name).includes(normalizedQuery) ||
      categoryServices.some((service) => normalizeCatalogText(service.name).includes(normalizedQuery));

    return sourceMatches && textMatches;
  });

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Catálogo" subtitle="Categorías y servicios efectivos" />
      <ScreenBody className="px-4 pt-3 pb-6">
        <div data-testid="admin-catalog-page" className="flex flex-col gap-3">
        <Card className="mb-3 bg-sky-50 border-sky-100" testId="admin-catalog-summary">
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <SummaryMetric label="Categorías efectivas" value={effectiveCategories.length} />
            <SummaryMetric label="Servicios efectivos" value={effectiveServices.length} />
            <SummaryMetric label="Categorías seed" value={seedCategories.length} />
            <SummaryMetric label="Categorías admin" value={approvedCategories.length} />
            <SummaryMetric label="Servicios seed" value={seedServices.length} />
            <SummaryMetric label="Servicios admin" value={approvedServices.length} />
          </div>
          <Link
            href="/admin/solicitudes-catalogo"
            data-testid="admin-catalog-pending-requests-link"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-sky-700"
          >
            <Icon name="layers" size={14} />
            {pendingRequests > 0
              ? `${pendingRequests} solicitud${pendingRequests === 1 ? "" : "es"} pendientes`
              : "Ver solicitudes de catálogo"}
          </Link>
        </Card>

        <div className="flex items-center gap-2 bg-white rounded-2xl px-3.5 py-2.5 mb-3 border border-sand-200/70">
          <Icon name="search" size={16} stroke={2.2} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por categoría o servicio…"
            className="flex-1 bg-transparent outline-none text-[14px] text-ink-800 placeholder:text-ink-400"
            data-testid="admin-catalog-search"
          />
        </div>

        <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide">
          {(
            [
              { id: "all", label: "Todos" },
              { id: "seed", label: "Seed" },
              { id: "admin_approved", label: "Admin" },
            ] as const
          ).map((option) => {
            const selected = sourceFilter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSourceFilter(option.id)}
                data-testid="admin-catalog-source-filter"
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
          {groupedCategories.map((category) => {
            const services = getCatalogServicesByCategory(category.id, effectiveServices).filter(
              (service) =>
                sourceFilter === "all" || service.source === sourceFilter || category.source === sourceFilter,
            );
            const group = getCatalogGroupPresentation(category.group);
            const categorySlug = slugifyCatalogText(category.name);

            return (
              <Card key={category.id} testId={`admin-catalog-category-${categorySlug}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-[20px]"
                    style={{ backgroundColor: `${group.color}55` }}
                  >
                    {category.icon ?? group.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <div className="font-bold text-[14px] text-ink-800">
                        {category.name}
                      </div>
                      <SourceBadge source={category.source} />
                      {!category.active && <StatusChip label="Inactiva" tone="sand" />}
                    </div>
                    <div className="text-[11.5px] text-ink-500 leading-snug">
                      {group.label} · {services.length} servicio{services.length === 1 ? "" : "s"}
                    </div>
                    {category.createdFromRequestId && (
                      <div className="text-[10.5px] text-ink-400 mt-1">
                        Creada desde solicitud {category.createdFromRequestId}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      data-testid={`admin-catalog-service-${slugifyCatalogText(service.name)}`}
                      className="rounded-xl border border-sand-200/70 bg-sand-50 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-[12.5px] text-ink-800">
                          {service.name}
                        </span>
                        <SourceBadge source={service.source} />
                        {!service.active && <StatusChip label="Inactivo" tone="sand" />}
                      </div>
                      {service.description && (
                        <div className="text-[11px] text-ink-500 leading-snug mb-1">
                          {service.description}
                        </div>
                      )}
                      {service.createdFromRequestId && (
                        <div className="text-[10.5px] text-ink-400">
                          Creado desde solicitud {service.createdFromRequestId}
                        </div>
                      )}
                    </div>
                  ))}
                  {services.length === 0 && (
                    <div className="rounded-xl border border-sand-200/70 bg-sand-50 px-3 py-2.5 text-[11.5px] text-ink-400">
                      No hay servicios visibles en este filtro para la categoría.
                    </div>
                  )}
                </div>
              </Card>
            );
          })}

          {groupedCategories.length === 0 && (
            <Card className="text-center py-10">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sand-100 text-ink-500">
                <Icon name="layers" size={17} />
              </div>
              <div className="font-bold text-[14px] text-ink-800 mb-1">
                No hay resultados para este filtro.
              </div>
              <div className="text-[12px] text-ink-400 leading-snug">
                Ajusta la búsqueda o revisa las solicitudes de catálogo pendientes.
              </div>
            </Card>
          )}
        </div>
        </div>
      </ScreenBody>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/70 border border-sky-100 px-3 py-2">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">
        {label}
      </div>
      <div className="font-extrabold text-[18px] text-ink-900">{value}</div>
    </div>
  );
}

function SourceBadge({ source }: Pick<CatalogCategory, "source"> | Pick<CatalogService, "source">) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
        source === "seed"
          ? "bg-sand-100 text-ink-600"
          : "bg-teal-50 text-teal-700"
      }`}
    >
      {source === "seed" ? "Seed" : "Admin"}
    </span>
  );
}

function StatusChip({ label, tone }: { label: string; tone: "sand" | "amber" }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
        tone === "amber"
          ? "bg-amber-50 text-amber-700"
          : "bg-sand-100 text-ink-500"
      }`}
    >
      {label}
    </span>
  );
}
