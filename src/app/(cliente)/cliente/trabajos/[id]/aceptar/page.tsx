"use client";
import { use, Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { jobs, professionals, defaultAdminConfig } from "@/lib/data";
import { formatEuro } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

function Inner({ id }: { id: string }) {
  const search = useSearchParams();
  const router = useRouter();
  const proId = search.get("proId") ?? "p1";
  const job = jobs.find((j) => j.id === id) ?? jobs[0];
  const pro = professionals.find((p) => p.id === proId) ?? professionals[0];
  const [accepting, setAccepting] = useState(false);
  const agreedPrice = Math.round((job.priceMin + job.priceMax) / 2);
  const commissionPct = defaultAdminConfig.commissionPct;
  const commission = Math.round((agreedPrice * commissionPct) / 100);

  const accept = () => {
    setAccepting(true);
    setTimeout(() => router.push(`/cliente/trabajos/${id}/pagar?proId=${proId}`), 700);
  };

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Aceptar profesional" />

      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="mb-3">
          <div className="flex items-center gap-3">
            <Avatar initials={pro.avatar} size={56} />
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-[16px] text-ink-800 truncate">
                {pro.name}
              </div>
              <div className="text-[12.5px] text-ink-500">
                {pro.specialty} · ★ {pro.rating.toFixed(1)} ({pro.reviews})
              </div>
            </div>
          </div>
        </Card>

        <Card className="mb-3">
          <div className="font-bold text-[13.5px] text-ink-800 mb-2">
            {job.title}
          </div>
          <div className="text-[12px] text-ink-400 mb-3">{job.category}</div>

          <div className="bg-sand-50 rounded-xl p-3 border border-sand-200/70">
            <div className="flex items-center justify-between text-[12.5px] mb-2">
              <span className="text-ink-500">Precio acordado (orientativo)</span>
              <span className="font-bold text-ink-800">{formatEuro(agreedPrice)}</span>
            </div>
            <div className="flex items-center justify-between text-[12.5px] mb-2">
              <span className="text-ink-500">
                Comisión Arranxos ({commissionPct}%)
              </span>
              <span className="font-bold text-ink-800">{formatEuro(commission)}</span>
            </div>
            <div className="border-t border-sand-200 pt-2 flex items-center justify-between">
              <span className="font-bold text-ink-800">A pagar al aceptar</span>
              <span className="font-extrabold text-coral-600 text-[15px]">
                {formatEuro(agreedPrice)}
              </span>
            </div>
          </div>
        </Card>

        <Card className="bg-teal-50/50 border-teal-100 mb-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-500 text-white flex items-center justify-center">
              <Icon name="shield" size={16} />
            </div>
            <div>
              <div className="font-bold text-[13px] text-teal-700">
                Pago en custodia
              </div>
              <div className="text-[11.5px] text-teal-700/80 leading-snug">
                Retenemos el dinero. Solo se libera cuando confirmas que el trabajo
                está bien hecho. Si surge un problema, abres una disputa.
              </div>
            </div>
          </div>
        </Card>

        <div className="text-[11px] text-ink-400 leading-relaxed text-center">
          Al aceptar, el profesional verá tu dirección exacta y se abrirá el chat.
          El precio final puede ajustarse si ambas partes lo acuerdan.
        </div>
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button full onClick={accept} disabled={accepting}>
          {accepting ? "Aceptando…" : `Aceptar y proceder al pago`}
        </Button>
      </div>
    </div>
  );
}

export default function Page({ params }: Props) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div />}>
      <Inner id={id} />
    </Suspense>
  );
}
