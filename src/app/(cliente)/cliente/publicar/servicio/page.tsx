"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Button } from "@/components/ui/button";
import { ServiceQuestionnaire } from "@/components/forms/service-questionnaire";
import {
  getEffectiveCatalogCategories,
  getEffectiveCatalogServices,
  normalizeCatalogText,
  slugifyCatalogText,
} from "@/lib/catalog";
import {
  getEffectiveApprovedCatalogCategories,
  getEffectiveApprovedCatalogServices,
  useSession,
} from "@/lib/store";

function ServicioInner() {
  const router = useRouter();
  const params = useSearchParams();
  const approvedCatalogCategories = useSession(getEffectiveApprovedCatalogCategories);
  const approvedCatalogServices = useSession(getEffectiveApprovedCatalogServices);
  const effectiveCategories = getEffectiveCatalogCategories(approvedCatalogCategories);
  const effectiveServices = getEffectiveCatalogServices(approvedCatalogServices);
  const requestedCategoryId = params.get("categoryId") ?? params.get("cat") ?? "";
  const requestedCategoryName = params.get("categoryName") ?? "";
  const hasRequestedCategory = Boolean(requestedCategoryId || requestedCategoryName);
  const category =
    effectiveCategories.find((entry) => entry.id === requestedCategoryId) ??
    effectiveCategories.find(
      (entry) =>
        requestedCategoryName &&
        normalizeCatalogText(entry.name) === normalizeCatalogText(requestedCategoryName),
    ) ??
    (!hasRequestedCategory ? effectiveCategories[0] : undefined);
  const categoryId = category?.id ?? requestedCategoryId;
  const categoryName = category?.name ?? requestedCategoryName;
  const services = category
    ? effectiveServices.filter((service) => service.categoryId === category.id)
    : [];

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedServiceName, setSelectedServiceName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const canNext = Boolean(selectedServiceId && selectedServiceName && category);
  const next = () => {
    const q = new URLSearchParams({
      cat: categoryId,
      categoryId,
      categoryName,
      serviceId: selectedServiceId,
      serviceName: selectedServiceName,
      service: selectedServiceName,
      answers: JSON.stringify(answers),
    });
    router.push(`/cliente/publicar/detalle?${q.toString()}`);
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <StatusBar />
      <TopBar title="Publicar trabajo" subtitle="Paso 2 de 4 · Servicio" />
      <ScreenBody className="px-5 pt-3 pb-6" white>
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-sand-50 border border-sand-200 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[22px] shadow-card">
            {category?.icon ?? "•"}
          </div>
          <div>
            <div className="text-[11px] text-ink-400 font-semibold">Categoría</div>
            <div className="font-bold text-[14px] text-ink-800">
              {categoryName || "Categoría no encontrada"}
            </div>
            {category?.source === "admin_approved" && (
              <div className="mt-0.5 text-[10px] font-bold text-teal-700">
                Nuevo catálogo
              </div>
            )}
          </div>
        </div>

        {!category && (
          <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-[12px] text-amber-700 leading-snug">
            No encontramos esta categoría en el catálogo disponible. Vuelve al paso anterior y elige otra.
          </div>
        )}

        <div className="mb-5">
          <div className="font-bold text-[14px] text-ink-800 mb-2">
            ¿Qué servicio concreto necesitas?
          </div>
          {services.length > 0 ? (
            <div className="flex flex-col gap-2">
              {services.map((service) => {
                const sel = selectedServiceId === service.id;
                return (
                  <button
                    key={service.id}
                    onClick={() => {
                      setSelectedServiceId(service.id);
                      setSelectedServiceName(service.name);
                    }}
                    data-testid={`client-service-${slugifyCatalogText(service.name)}`}
                    className={`w-full text-left px-4 py-3 rounded-2xl border-[1.5px] transition text-[13.5px] font-semibold ${
                      sel
                        ? "border-coral-500 bg-coral-50 text-coral-700"
                        : "border-sand-200 bg-white text-ink-700"
                    }`}
                  >
                    <span>{service.name}</span>
                    {service.source === "admin_approved" && (
                      <span className="mt-1 block text-[10px] font-bold text-teal-700">
                        Nuevo catálogo
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-sand-200/70 bg-sand-50/70 px-3.5 py-3 text-[12px] text-ink-500 leading-snug">
              No hay servicios disponibles todavía para esta categoría.
            </div>
          )}
        </div>

        <div className="mb-5">
          <div className="font-bold text-[14px] text-ink-800 mb-2">
            Cuéntanos un poco más
          </div>
          <ServiceQuestionnaire categoryId={categoryId} onChange={setAnswers} />
        </div>
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button full onClick={next} disabled={!canNext}>
          Continuar
        </Button>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div />}>
      <ServicioInner />
    </Suspense>
  );
}
