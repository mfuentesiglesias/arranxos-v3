"use client";
import { useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { slugifyCatalogText } from "@/lib/catalog";
import { categories } from "@/lib/data";
import { getEffectiveCatalogRequests, useSession } from "@/lib/store";
import type { CatalogRequest } from "@/lib/types";

export default function AdminCatalogRequestsPage() {
  const catalogRequests = useSession(getEffectiveCatalogRequests);
  const approveCatalogRequest = useSession((s) => s.approveCatalogRequest);
  const rejectCatalogRequest = useSession((s) => s.rejectCatalogRequest);
  const currentAdminId = useSession((s) => s.currentAdminId);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  const pendingCount = catalogRequests.filter((request) =>
    ["pending", "reviewing"].includes(request.status),
  ).length;
  const approvedCount = catalogRequests.filter(
    (request) => request.status === "approved",
  ).length;
  const rejectedCount = catalogRequests.filter(
    (request) => request.status === "rejected",
  ).length;
  const sortedRequests = [...catalogRequests].sort((a, b) => {
    const statusDiff = getCatalogRequestSortWeight(a) - getCatalogRequestSortWeight(b);
    if (statusDiff !== 0) return statusDiff;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const approveRequest = (request: CatalogRequest) => {
    const categoryId = selectedCategoryIds[request.id] ?? getDefaultCategoryId(request);
    const category = categories.find((entry) => entry.id === categoryId) ?? categories[0];

    if (!category) {
      setFeedback("No hay categorías disponibles para aprobar esta solicitud.");
      return;
    }

    const approved = approveCatalogRequest(request.id, {
      categoryId: category.id,
      categoryName: category.name,
      reviewedByAdminId: currentAdminId,
    });

    setFeedback(
      approved
        ? `${approved.requestedName} aprobada y añadida al catálogo activo.`
        : "No se pudo aprobar la solicitud.",
    );
  };

  const rejectRequest = (request: CatalogRequest) => {
    const rejected = rejectCatalogRequest(
      request.id,
      "Rechazada en demo por admin de catálogo",
    );

    setFeedback(
      rejected
        ? `${rejected.requestedName} rechazada en la revisión de catálogo.`
        : "No se pudo rechazar la solicitud.",
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar
        title="Solicitudes de catálogo"
        subtitle="Nuevas especialidades propuestas por profesionales"
      />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="bg-sky-50 border-sky-100 mb-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-sky-500 text-white flex items-center justify-center">
              <Icon name="layers" size={16} />
            </div>
            <div className="text-[12px] text-sky-700 leading-snug">
              Revisa solicitudes de nuevas especialidades sin mezclarlas con tickets de búsqueda.
              Al aprobar, se crea un servicio activo solo en el catálogo mock.
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <SummaryPill label="Pendientes" value={pendingCount} tone="amber" />
          <SummaryPill label="Aprobadas" value={approvedCount} tone="teal" />
          <SummaryPill label="Rechazadas" value={rejectedCount} tone="rose" />
        </div>

        {feedback && (
          <div className="mb-3 rounded-2xl border border-teal-100 bg-teal-50 px-3.5 py-3 text-[12px] font-semibold text-teal-700">
            {feedback}
          </div>
        )}

        <div className="flex flex-col gap-2" data-testid="admin-catalog-requests">
          {sortedRequests.length === 0 ? (
            <Card className="text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sand-100 text-ink-500">
                <Icon name="layers" size={17} />
              </div>
              <div className="font-bold text-[14px] text-ink-800 mb-1">
                Aún no hay solicitudes de nuevas especialidades.
              </div>
              <div className="text-[12px] text-ink-400 leading-snug">
                Cuando un profesional solicite una especialidad no encontrada, aparecerá aquí.
              </div>
            </Card>
          ) : (
            sortedRequests.map((request) => {
              const slug = slugifyCatalogText(request.requestedName);
              const selectedCategoryId =
                selectedCategoryIds[request.id] ?? getDefaultCategoryId(request);
              const selectedCategory =
                categories.find((category) => category.id === selectedCategoryId) ?? categories[0];
              const canReview = ["pending", "reviewing"].includes(request.status);

              return (
                <Card
                  key={request.id}
                  className="!p-3.5"
                  testId={`admin-catalog-request-${slug}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      data-testid={`catalog-request-status-${slug}`}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getCatalogRequestStatusClassName(request.status)}`}
                    >
                      {getCatalogRequestStatusLabel(request.status)}
                    </span>
                    <span className="ml-auto text-[10.5px] text-ink-400">
                      {request.createdAt.slice(0, 10)}
                    </span>
                  </div>

                  <div className="font-extrabold text-[15px] text-ink-900 leading-snug mb-1">
                    {request.requestedName}
                  </div>
                  <div className="text-[12px] text-ink-500 leading-snug mb-2">
                    Solicitante: {request.requestedByName}
                  </div>
                  <div className="rounded-2xl border border-sand-200/70 bg-sand-50/70 px-3 py-2.5 text-[11.5px] text-ink-500 leading-snug mb-3">
                    Categoría sugerida: {request.suggestedCategoryName ?? "Sin sugerencia"}
                    {request.approvedServiceId ? ` · servicio ${request.approvedServiceId}` : ""}
                    {request.rejectionReason ? ` · ${request.rejectionReason}` : ""}
                  </div>

                  {canReview ? (
                    <div className="flex flex-col gap-2.5">
                      <Select
                        label="Categoría de catálogo"
                        value={selectedCategory?.id ?? ""}
                        onChange={(event) =>
                          setSelectedCategoryIds((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </Select>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          full
                          variant="outline"
                          onClick={() => rejectRequest(request)}
                          testId={`reject-catalog-request-${slug}`}
                        >
                          Rechazar
                        </Button>
                        <Button
                          size="sm"
                          full
                          onClick={() => approveRequest(request)}
                          testId={`approve-catalog-request-${slug}`}
                        >
                          Aprobar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11.5px] text-ink-400 leading-snug">
                      {request.status === "approved"
                        ? "Ya forma parte del catálogo activo mock."
                        : "Solicitud cerrada para esta demo."}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </ScreenBody>
    </div>
  );
}

function getDefaultCategoryId(request: CatalogRequest) {
  if (request.suggestedCategoryId && categories.some((entry) => entry.id === request.suggestedCategoryId)) {
    return request.suggestedCategoryId;
  }

  if (request.suggestedCategoryName) {
    const suggested = categories.find(
      (category) => category.name.toLowerCase() === request.suggestedCategoryName?.toLowerCase(),
    );
    if (suggested) return suggested.id;
  }

  return categories[0]?.id ?? "";
}

function getCatalogRequestSortWeight(request: CatalogRequest) {
  return (
    {
      pending: 0,
      reviewing: 0,
      approved: 1,
      rejected: 2,
      merged: 3,
    } satisfies Record<CatalogRequest["status"], number>
  )[request.status];
}

function getCatalogRequestStatusLabel(status: CatalogRequest["status"]) {
  return (
    {
      pending: "Pendiente",
      reviewing: "En revisión",
      approved: "Aprobada",
      rejected: "Rechazada",
      merged: "Fusionada",
    } satisfies Record<CatalogRequest["status"], string>
  )[status];
}

function getCatalogRequestStatusClassName(status: CatalogRequest["status"]) {
  return (
    {
      pending: "bg-amber-50 text-amber-700",
      reviewing: "bg-sand-100 text-ink-600",
      approved: "bg-teal-50 text-teal-700",
      rejected: "bg-rose-50 text-rose-600",
      merged: "bg-sky-50 text-sky-700",
    } satisfies Record<CatalogRequest["status"], string>
  )[status];
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "teal" | "rose";
}) {
  const toneClassName =
    tone === "amber"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : tone === "teal"
        ? "bg-teal-50 text-teal-700 border-teal-100"
        : "bg-rose-50 text-rose-600 border-rose-100";

  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${toneClassName}`}>
      <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="font-extrabold text-[18px]">{value}</div>
    </div>
  );
}
