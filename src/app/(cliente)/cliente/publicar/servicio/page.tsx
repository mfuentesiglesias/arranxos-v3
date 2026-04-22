"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Button } from "@/components/ui/button";
import { ServiceQuestionnaire } from "@/components/forms/service-questionnaire";
import { categoryGroups } from "@/lib/data";

function ServicioInner() {
  const router = useRouter();
  const params = useSearchParams();
  const catId = params.get("cat") ?? "";
  const cat =
    categoryGroups.flatMap((g) => g.categories).find((c) => c.id === catId) ??
    categoryGroups[0].categories[0];

  const [service, setService] = useState<string>("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const canNext = Boolean(service);
  const next = () => {
    const q = new URLSearchParams({
      cat: cat.id,
      service,
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
            {cat.icon}
          </div>
          <div>
            <div className="text-[11px] text-ink-400 font-semibold">Categoría</div>
            <div className="font-bold text-[14px] text-ink-800">{cat.name}</div>
          </div>
        </div>

        <div className="mb-5">
          <div className="font-bold text-[14px] text-ink-800 mb-2">
            ¿Qué servicio concreto necesitas?
          </div>
          <div className="flex flex-col gap-2">
            {cat.services.map((s) => {
              const sel = service === s;
              return (
                <button
                  key={s}
                  onClick={() => setService(s)}
                  className={`w-full text-left px-4 py-3 rounded-2xl border-[1.5px] transition text-[13.5px] font-semibold ${
                    sel
                      ? "border-coral-500 bg-coral-50 text-coral-700"
                      : "border-sand-200 bg-white text-ink-700"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-5">
          <div className="font-bold text-[14px] text-ink-800 mb-2">
            Cuéntanos un poco más
          </div>
          <ServiceQuestionnaire categoryId={cat.id} onChange={setAnswers} />
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
