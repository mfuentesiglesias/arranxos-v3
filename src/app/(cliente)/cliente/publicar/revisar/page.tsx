"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import {
  getEffectiveCatalogCategories,
  getEffectiveCatalogServices,
  normalizeCatalogText,
} from "@/lib/catalog";
import {
  getEffectiveApprovedCatalogCategories,
  getEffectiveApprovedCatalogServices,
  useSession,
} from "@/lib/store";

function RevisarInner() {
  const router = useRouter();
  const params = useSearchParams();
  const approvedCatalogCategories = useSession(getEffectiveApprovedCatalogCategories);
  const approvedCatalogServices = useSession(getEffectiveApprovedCatalogServices);
  const createClientJob = useSession((s) => s.createClientJob);
  const effectiveCategories = getEffectiveCatalogCategories(approvedCatalogCategories);
  const effectiveServices = getEffectiveCatalogServices(approvedCatalogServices);
  const categoryId = params.get("categoryId") ?? params.get("cat") ?? "";
  const categoryNameParam = params.get("categoryName") ?? "";
  const serviceId = params.get("serviceId") ?? "";
  const serviceNameParam = params.get("serviceName") ?? params.get("service") ?? "";
  const category =
    effectiveCategories.find((entry) => entry.id === categoryId) ??
    effectiveCategories.find(
      (entry) =>
        categoryNameParam &&
        normalizeCatalogText(entry.name) === normalizeCatalogText(categoryNameParam),
    ) ??
    (!categoryId && !categoryNameParam ? effectiveCategories[0] : undefined);
  const selectedService =
    effectiveServices.find((entry) => entry.id === serviceId) ??
    effectiveServices.find(
      (entry) =>
        serviceNameParam &&
        normalizeCatalogText(entry.name) === normalizeCatalogText(serviceNameParam),
    );
  const categoryName = categoryNameParam || category?.name || "Sin categoría";
  const service = serviceNameParam || selectedService?.name || "";
  const title = params.get("title") ?? "";
  const description = params.get("description") ?? "";
  const location = params.get("location") ?? "";
  const priceRange = params.get("priceRange") ?? "";
  const urgent = params.get("urgent") === "1";
  const answers: Record<string, string> = (() => {
    try {
      return JSON.parse(params.get("answers") ?? "{}");
    } catch {
      return {};
    }
  })();

  const [publishing, setPublishing] = useState(false);
  const publish = () => {
    setPublishing(true);
    const createdJob = createClientJob({
      categoryId: category?.id ?? categoryId,
      categoryName,
      serviceId: selectedService?.id ?? serviceId,
      serviceName: service,
      title,
      description,
      location,
      priceRange,
      urgent,
      questionnaire: answers,
    });
    setTimeout(
      () => router.push(`/cliente/trabajos/${createdJob.id}?justPublished=1`),
      900,
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Publicar trabajo" subtitle="Paso 4 de 4 · Revisar" />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="mb-3" testId="client-publish-review-summary">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[18px]">{category?.icon ?? "•"}</span>
            <span className="text-[11px] font-bold text-ink-400 uppercase tracking-wide">
              {categoryName} · {service || "Sin servicio"}
            </span>
            {urgent && (
              <span className="ml-auto bg-coral-50 text-coral-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                URGENTE
              </span>
            )}
          </div>
          <div className="font-extrabold text-[17px] text-ink-900 leading-snug mb-1.5">
            {title || "Sin título"}
          </div>
          <div className="text-[12.5px] text-ink-500 whitespace-pre-wrap">
            {description || "Sin descripción"}
          </div>
          <div className="mt-3 pt-3 border-t border-sand-200/70 flex flex-col gap-1.5 text-[12px]">
            <div className="flex items-center gap-2 text-ink-500">
              <Icon name="pin" size={12} stroke={2} />
              <span>{location}</span>
            </div>
            <div className="flex items-center gap-2 text-ink-500">
              <Icon name="euro" size={12} stroke={2} />
              <span>{priceRange || "A negociar"}</span>
            </div>
          </div>
          {Object.keys(answers).length > 0 && (
            <div className="mt-3 pt-3 border-t border-sand-200/70">
              <div className="text-[11px] font-bold text-ink-400 uppercase tracking-wide mb-1.5">
                Preguntas específicas
              </div>
              <div className="flex flex-col gap-1">
                {Object.entries(answers).map(([k, v]) =>
                  v ? (
                    <div key={k} className="text-[12px] text-ink-600">
                      <span className="font-semibold capitalize">{k}:</span> {v}
                    </div>
                  ) : null,
                )}
              </div>
            </div>
          )}
        </Card>

        <Card className="bg-teal-50/50 border-teal-100 mb-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-500 text-white flex items-center justify-center flex-shrink-0">
              <Icon name="shield" size={16} />
            </div>
            <div>
              <div className="font-bold text-[13px] text-teal-700 mb-0.5">
                Publicar es gratis
              </div>
              <div className="text-[11.5px] text-teal-700/80 leading-snug">
                Solo pagas cuando aceptas a un profesional. El dinero se retiene
                hasta que confirmas el trabajo.
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-amber-50/60 border-amber-100">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0 text-[14px]">
              ⚠️
            </div>
            <div>
              <div className="font-bold text-[13px] text-amber-700 mb-0.5">
                Nunca compartas datos personales
              </div>
              <div className="text-[11.5px] text-amber-700/80 leading-snug">
                Teléfono, email o redes sociales quedarán visibles para admin y
                pueden causar sanciones. Usa el chat de Arranxos.
              </div>
            </div>
          </div>
        </Card>
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button full onClick={publish} disabled={publishing}>
          {publishing ? "Publicando…" : "Publicar trabajo"}
        </Button>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div />}>
      <RevisarInner />
    </Suspense>
  );
}
