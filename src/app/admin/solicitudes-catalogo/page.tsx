"use client";
import { useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  formatCatalogServiceName,
  getEffectiveCatalogCategories,
  getEffectiveCatalogServices,
  normalizeCatalogText,
  slugifyCatalogText,
} from "@/lib/catalog";
import {
  getEffectiveApprovedCatalogCategories,
  getEffectiveApprovedCatalogServices,
  getEffectiveCatalogRequests,
  useSession,
} from "@/lib/store";
import type { CatalogCategory, CatalogRequest, CatalogService } from "@/lib/types";

type ResolutionType = "create" | "merge" | "reject";

export default function AdminCatalogRequestsPage() {
  const catalogRequests = useSession(getEffectiveCatalogRequests);
  const approvedCatalogServices = useSession(getEffectiveApprovedCatalogServices);
  const approvedCatalogCategories = useSession(getEffectiveApprovedCatalogCategories);
  const createApprovedCatalogCategory = useSession((s) => s.createApprovedCatalogCategory);
  const approveCatalogRequest = useSession((s) => s.approveCatalogRequest);
  const rejectCatalogRequest = useSession((s) => s.rejectCatalogRequest);
  const mergeCatalogRequest = useSession((s) => s.mergeCatalogRequest);
  const currentAdminId = useSession((s) => s.currentAdminId);
  const [resolutionByRequestId, setResolutionByRequestId] = useState<Record<string, ResolutionType>>({});
  const [finalNameByRequestId, setFinalNameByRequestId] = useState<Record<string, string>>({});
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Record<string, string>>({});
  const [categorySearchByRequestId, setCategorySearchByRequestId] = useState<Record<string, string>>({});
  const [newCategoryNameByRequestId, setNewCategoryNameByRequestId] = useState<Record<string, string>>({});
  const [existingServiceSearchByRequestId, setExistingServiceSearchByRequestId] = useState<Record<string, string>>({});
  const [existingServiceIdsByRequestId, setExistingServiceIdsByRequestId] = useState<Record<string, string>>({});
  const [rejectionReasonByRequestId, setRejectionReasonByRequestId] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  const effectiveCatalogServices = getEffectiveCatalogServices(approvedCatalogServices).sort(
    (a, b) =>
      a.categoryName.localeCompare(b.categoryName, "es") ||
      a.name.localeCompare(b.name, "es"),
  );
  const effectiveCatalogCategories = getEffectiveCatalogCategories(approvedCatalogCategories).sort(
    (a, b) =>
      (a.group ?? "").localeCompare(b.group ?? "", "es") ||
      a.name.localeCompare(b.name, "es"),
  );
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

  const setResolution = (requestId: string, resolution: ResolutionType) => {
    setResolutionByRequestId((current) => ({ ...current, [requestId]: resolution }));
    setFeedback(null);
  };

  const approveRequest = (request: CatalogRequest) => {
    const finalName = getDraftFinalName(request, finalNameByRequestId);
    const categoryId = getDraftCategoryId(
      request,
      selectedCategoryIds,
      effectiveCatalogCategories,
    );
    const category = effectiveCatalogCategories.find((entry) => entry.id === categoryId);
    const conflictingService = effectiveCatalogServices.find(
      (service) => normalizeCatalogText(service.name) === normalizeCatalogText(finalName),
    );

    if (!finalName) {
      setFeedback("Indica el nombre final antes de crear la especialidad.");
      return;
    }

    if (!category) {
      setFeedback("Selecciona una categoría antes de aprobar la solicitud.");
      return;
    }

    if (conflictingService) {
      setFeedback(
        `Ya existe ${conflictingService.name}. Usa la resolución de fusión en lugar de crear otra especialidad.`,
      );
      return;
    }

    const approved = approveCatalogRequest(request.id, {
      categoryId: category.id,
      categoryName: category.name,
      reviewedByAdminId: currentAdminId,
      serviceName: finalName,
    });

    setFeedback(
      approved
        ? `${finalName} aprobada y añadida al catálogo activo.`
        : "No se pudo aprobar la solicitud. Revisa nombre y categoría.",
    );
  };

  const selectCategory = (requestId: string, category: CatalogCategory) => {
    setSelectedCategoryIds((current) => ({ ...current, [requestId]: category.id }));
    setCategorySearchByRequestId((current) => ({ ...current, [requestId]: category.name }));
    setNewCategoryNameByRequestId((current) => ({ ...current, [requestId]: category.name }));
    setFeedback(null);
  };

  const createCategory = (request: CatalogRequest) => {
    const categoryName = formatCatalogServiceName(
      newCategoryNameByRequestId[request.id] ?? categorySearchByRequestId[request.id] ?? "",
    );
    const result = createApprovedCatalogCategory({
      name: categoryName,
      createdFromRequestId: request.id,
    });

    if (!result.ok) {
      setFeedback("Escribe un nombre de categoría válido antes de crearla.");
      return;
    }

    selectCategory(request.id, result.category);
    setFeedback(
      result.created
        ? `${result.category.name} creada como categoría de catálogo.`
        : `Ya existía la categoría ${result.category.name}; la dejamos seleccionada.`,
    );
  };

  const mergeRequest = (request: CatalogRequest) => {
    const serviceId = getDraftExistingServiceId(
      request,
      existingServiceIdsByRequestId,
      effectiveCatalogServices,
    );
    const service = effectiveCatalogServices.find((entry) => entry.id === serviceId);

    if (!service) {
      setFeedback("Selecciona una especialidad existente para fusionar la solicitud.");
      return;
    }

    const merged = mergeCatalogRequest(request.id, {
      mergedIntoServiceId: service.id,
      reviewedByAdminId: currentAdminId,
    });

    setFeedback(
      merged
        ? `${request.requestedName} fusionada con ${service.name}.`
        : "No se pudo fusionar la solicitud.",
    );
  };

  const rejectRequest = (request: CatalogRequest) => {
    const rejected = rejectCatalogRequest(
      request.id,
      rejectionReasonByRequestId[request.id]?.trim() || "Rechazada en demo por admin de catálogo",
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
              Admin puede corregir nombre final, elegir categoría, fusionar con una especialidad
              existente o rechazar la solicitud sin crear duplicados.
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
              const canReview = ["pending", "reviewing"].includes(request.status);
              const resolution = getDraftResolution(request, resolutionByRequestId);
              const finalName = getDraftFinalName(request, finalNameByRequestId);
              const categoryId = getDraftCategoryId(
                request,
                selectedCategoryIds,
                effectiveCatalogCategories,
              );
              const selectedCategory = effectiveCatalogCategories.find(
                (category) => category.id === categoryId,
              );
              const categorySearch = categorySearchByRequestId[request.id] ?? "";
              const newCategoryName = formatCatalogServiceName(
                newCategoryNameByRequestId[request.id] ?? categorySearch,
              );
              const filteredCategories = getFilteredCategories(
                request,
                effectiveCatalogCategories,
                categorySearch,
              ).slice(0, 8);
              const exactCategoryMatch = effectiveCatalogCategories.find(
                (category) =>
                  normalizeCatalogText(category.name) === normalizeCatalogText(newCategoryName),
              );
              const filteredExistingServices = getFilteredExistingServices(
                request,
                effectiveCatalogServices,
                effectiveCatalogCategories,
                existingServiceSearchByRequestId[request.id] ?? "",
              );
              const existingServiceId = getDraftExistingServiceId(
                request,
                existingServiceIdsByRequestId,
                filteredExistingServices,
              );
              const matchingExistingService = effectiveCatalogServices.find(
                (service) => normalizeCatalogText(service.name) === normalizeCatalogText(finalName),
              );

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

                  <div className="rounded-2xl border border-sand-200/70 bg-sand-50/70 px-3 py-3 mb-3">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-ink-400 mb-1">
                      Solicitud original
                    </div>
                    <div className="font-extrabold text-[15px] text-ink-900 leading-snug mb-1">
                      {request.requestedName}
                    </div>
                    <div className="text-[12px] text-ink-500 leading-snug">
                      Solicitante: {request.requestedByName}
                    </div>
                    <div className="text-[11.5px] text-ink-400 leading-snug mt-1">
                      Categoría sugerida: {request.suggestedCategoryName ?? "Sin sugerencia"}
                    </div>
                  </div>

                  {canReview ? (
                    <div className="flex flex-col gap-3">
                      <Select
                        label="Resolución admin"
                        value={resolution}
                        onChange={(event) =>
                          setResolution(request.id, event.target.value as ResolutionType)
                        }
                        data-testid={`catalog-request-resolution-${slug}`}
                      >
                        <option value="create">Crear nueva especialidad</option>
                        <option value="merge">Fusionar con especialidad existente</option>
                        <option value="reject">Rechazar</option>
                      </Select>

                      {resolution === "create" && (
                        <>
                          <Input
                            label="Nombre final en catálogo"
                            value={finalName}
                            onChange={(event) =>
                              setFinalNameByRequestId((current) => ({
                                ...current,
                                [request.id]: event.target.value,
                              }))
                            }
                            placeholder="Ej. Pulido de mármol"
                            data-testid={`catalog-request-final-name-${slug}`}
                          />
                          <div className="flex flex-col gap-2">
                            <Input
                              label="Categoría de catálogo"
                              value={categorySearch}
                              onChange={(event) => {
                                setCategorySearchByRequestId((current) => ({
                                  ...current,
                                  [request.id]: event.target.value,
                                }));
                                setNewCategoryNameByRequestId((current) => ({
                                  ...current,
                                  [request.id]: event.target.value,
                                }));
                                setSelectedCategoryIds((current) => {
                                  const next = { ...current };
                                  delete next[request.id];
                                  return next;
                                });
                              }}
                              placeholder="Busca o crea una categoría"
                              data-testid={`catalog-request-category-search-${slug}`}
                            />
                            {selectedCategory ? (
                              <div
                                data-testid={`catalog-request-selected-category-${slug}`}
                                className="rounded-2xl border border-teal-100 bg-teal-50 px-3.5 py-3 text-[12px] font-semibold text-teal-700"
                              >
                                Categoría seleccionada: {selectedCategory.name}
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-[11.5px] text-amber-700 leading-snug">
                                Busca una categoría existente o crea una nueva antes de aprobar.
                              </div>
                            )}
                            <div className="rounded-2xl border border-sand-200 bg-white overflow-hidden">
                              {filteredCategories.length > 0 ? (
                                <div className="divide-y divide-sand-200/70">
                                  {filteredCategories.map((category) => (
                                    <button
                                      key={category.id}
                                      type="button"
                                      onClick={() => selectCategory(request.id, category)}
                                      data-testid={`catalog-request-category-result-${slugifyCatalogText(category.name)}`}
                                      className="w-full px-4 py-3 text-left transition active:bg-sand-50"
                                    >
                                      <div className="font-semibold text-[13px] text-ink-800">
                                        {category.name}
                                      </div>
                                      <div className="text-[11px] text-ink-400">
                                        {category.group ?? "Catálogo"} · {category.source === "seed" ? "Seed" : "Admin"}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="px-4 py-3 text-[12px] text-ink-400 leading-snug">
                                  No hay categorías con esa búsqueda.
                                </div>
                              )}
                            </div>
                            {newCategoryName && !exactCategoryMatch && (
                              <div className="rounded-2xl border border-sand-200/70 bg-sand-50/70 p-3.5 flex flex-col gap-2">
                                <Input
                                  label="Nueva categoría"
                                  value={newCategoryNameByRequestId[request.id] ?? categorySearch}
                                  onChange={(event) =>
                                    setNewCategoryNameByRequestId((current) => ({
                                      ...current,
                                      [request.id]: event.target.value,
                                    }))
                                  }
                                  placeholder="Ej. Carpintería y madera"
                                  data-testid={`catalog-request-new-category-name-${slug}`}
                                />
                                <Button
                                  size="sm"
                                  full
                                  variant="outline"
                                  onClick={() => createCategory(request)}
                                  testId={`create-catalog-category-${slug}`}
                                >
                                  Crear nueva categoría
                                </Button>
                              </div>
                            )}
                            {newCategoryName && exactCategoryMatch && (
                              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-[11.5px] leading-snug text-amber-700">
                                Ya existe una categoría con ese nombre. Selecciónala en los resultados.
                              </div>
                            )}
                          </div>
                          {matchingExistingService && (
                            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-[11.5px] leading-snug text-amber-700">
                              Ya existe una especialidad similar en catálogo: {matchingExistingService.name}.
                              Si es la misma, usa la resolución de fusión.
                            </div>
                          )}
                          <Button
                            size="sm"
                            full
                            disabled={!finalName || !selectedCategory || Boolean(matchingExistingService)}
                            onClick={() => approveRequest(request)}
                            testId={`approve-catalog-request-${slug}`}
                          >
                            Aprobar y crear especialidad
                          </Button>
                        </>
                      )}

                      {resolution === "merge" && (
                        <>
                          <Input
                            label="Buscar especialidad existente"
                            value={existingServiceSearchByRequestId[request.id] ?? ""}
                            onChange={(event) =>
                              setExistingServiceSearchByRequestId((current) => ({
                                ...current,
                                [request.id]: event.target.value,
                              }))
                            }
                            placeholder="Busca por nombre o categoría"
                          />
                          <Select
                            label="Especialidad existente"
                            value={existingServiceId}
                            onChange={(event) =>
                              setExistingServiceIdsByRequestId((current) => ({
                                ...current,
                                [request.id]: event.target.value,
                              }))
                            }
                            data-testid={`catalog-request-existing-service-${slug}`}
                          >
                            <option value="">Selecciona una especialidad existente</option>
                            {filteredExistingServices.map((service) => (
                              <option key={service.id} value={service.id}>
                                {service.name} · {service.categoryName}
                              </option>
                            ))}
                          </Select>
                          <Button
                            size="sm"
                            full
                            variant="outline"
                            disabled={!existingServiceId}
                            onClick={() => mergeRequest(request)}
                            testId={`merge-catalog-request-${slug}`}
                          >
                            Fusionar con especialidad existente
                          </Button>
                        </>
                      )}

                      {resolution === "reject" && (
                        <>
                          <Input
                            label="Motivo de rechazo"
                            value={rejectionReasonByRequestId[request.id] ?? ""}
                            onChange={(event) =>
                              setRejectionReasonByRequestId((current) => ({
                                ...current,
                                [request.id]: event.target.value,
                              }))
                            }
                            placeholder="Motivo opcional o demo"
                          />
                          <Button
                            size="sm"
                            full
                            variant="danger"
                            onClick={() => rejectRequest(request)}
                            testId={`reject-catalog-request-${slug}`}
                          >
                            Rechazar solicitud
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    <ClosedRequestSummary
                      request={request}
                      effectiveCatalogServices={effectiveCatalogServices}
                    />
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

function getDraftResolution(
  request: CatalogRequest,
  resolutionByRequestId: Record<string, ResolutionType>,
) {
  return resolutionByRequestId[request.id] ?? "create";
}

function getSuggestedCategoryId(
  request: CatalogRequest,
  effectiveCatalogCategories: CatalogCategory[],
) {
  if (
    request.suggestedCategoryId &&
    effectiveCatalogCategories.some((entry) => entry.id === request.suggestedCategoryId)
  ) {
    return request.suggestedCategoryId;
  }

  if (request.suggestedCategoryName) {
    const suggested = effectiveCatalogCategories.find(
      (category) =>
        normalizeCatalogText(category.name) ===
        normalizeCatalogText(request.suggestedCategoryName ?? ""),
    );
    if (suggested) return suggested.id;
  }

  return "";
}

function getDraftFinalName(
  request: CatalogRequest,
  finalNameByRequestId: Record<string, string>,
) {
  return formatCatalogServiceName(
    finalNameByRequestId[request.id] ?? request.requestedName,
  );
}

function getDraftCategoryId(
  request: CatalogRequest,
  selectedCategoryIds: Record<string, string>,
  effectiveCatalogCategories: CatalogCategory[],
) {
  return selectedCategoryIds[request.id] ?? getSuggestedCategoryId(request, effectiveCatalogCategories);
}

function getDraftExistingServiceId(
  request: CatalogRequest,
  existingServiceIdsByRequestId: Record<string, string>,
  services: CatalogService[],
) {
  const explicit = existingServiceIdsByRequestId[request.id];
  if (explicit) return explicit;

  const exactMatch = services.find(
    (service) =>
      normalizeCatalogText(service.name) === normalizeCatalogText(request.requestedName),
  );
  return exactMatch?.id ?? "";
}

function getFilteredExistingServices(
  request: CatalogRequest,
  services: CatalogService[],
  effectiveCatalogCategories: CatalogCategory[],
  query: string,
) {
  const normalizedQuery = normalizeCatalogText(query);
  const suggestedCategoryId = getSuggestedCategoryId(request, effectiveCatalogCategories);

  return services.filter((service) => {
    const matchesQuery =
      !normalizedQuery ||
      normalizeCatalogText(service.name).includes(normalizedQuery) ||
      normalizeCatalogText(service.categoryName).includes(normalizedQuery);

    if (!matchesQuery) return false;
    if (!suggestedCategoryId) return true;

    const relatedToRequest =
      normalizeCatalogText(service.name).includes(normalizeCatalogText(request.requestedName)) ||
      normalizeCatalogText(request.requestedName).includes(normalizeCatalogText(service.name));

    return service.categoryId === suggestedCategoryId || relatedToRequest || !query;
  });
}

function getFilteredCategories(
  request: CatalogRequest,
  categories: CatalogCategory[],
  query: string,
) {
  const normalizedQuery = normalizeCatalogText(query);
  const requestedName = normalizeCatalogText(request.requestedName);

  if (!normalizedQuery) {
    return categories.filter((category) => {
      const categoryName = normalizeCatalogText(category.name);
      return (
        Boolean(request.suggestedCategoryId && category.id === request.suggestedCategoryId) ||
        Boolean(
          request.suggestedCategoryName &&
            categoryName === normalizeCatalogText(request.suggestedCategoryName),
        ) ||
        categoryName.includes(requestedName) ||
        requestedName.includes(categoryName)
      );
    });
  }

  return categories.filter((category) => {
    const haystack = [category.name, category.group ?? "", category.source]
      .map(normalizeCatalogText)
      .join(" ");
    return haystack.includes(normalizedQuery);
  });
}

function ClosedRequestSummary({
  request,
  effectiveCatalogServices,
}: {
  request: CatalogRequest;
  effectiveCatalogServices: CatalogService[];
}) {
  const approvedService = request.approvedServiceId
    ? effectiveCatalogServices.find((service) => service.id === request.approvedServiceId)
    : undefined;
  const mergedService = request.mergedIntoServiceId
    ? effectiveCatalogServices.find((service) => service.id === request.mergedIntoServiceId)
    : undefined;

  return (
    <div className="text-[11.5px] text-ink-400 leading-snug">
      {request.status === "approved" && approvedService
        ? `Creada como ${approvedService.name} en ${approvedService.categoryName}.`
        : request.status === "merged" && mergedService
          ? `Fusionada con ${mergedService.name} en ${mergedService.categoryName}.`
          : request.status === "rejected"
            ? request.rejectionReason || "Solicitud rechazada en demo."
            : "Solicitud cerrada para esta demo."}
    </div>
  );
}

function getCatalogRequestSortWeight(request: CatalogRequest) {
  return (
    {
      pending: 0,
      reviewing: 0,
      approved: 1,
      merged: 2,
      rejected: 3,
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
