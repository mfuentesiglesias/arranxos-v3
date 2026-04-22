"use client";
import { use, Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { jobs } from "@/lib/data";
import {
  canConfirmCompletedJob,
  getAgreement,
  getCommissionAmount,
  getEffectiveFinalPrice,
} from "@/lib/domain/policies";
import {
  getAgreementByJobId,
  getEffectiveAdminConfig,
  getEffectiveJobById,
  useSession,
} from "@/lib/store";
import { formatEuro } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

function Inner({ id }: { id: string }) {
  const router = useRouter();
  const adminConfig = useSession(getEffectiveAdminConfig);
  const effectiveJob = useSession((s) => getEffectiveJobById(s, id));
  const agreement = useSession((s) => getAgreementByJobId(s, id));
  const confirmCompletedJob = useSession((s) => s.confirmCompletedJob);
  const job = effectiveJob ?? jobs.find((j) => j.id === id) ?? jobs[0];
  const resolvedAgreement = getAgreement(agreement);
  const [confirming, setConfirming] = useState(false);
  const total =
    getEffectiveFinalPrice(job, resolvedAgreement) ??
    Math.round((job.priceMin + job.priceMax) / 2);
  const commissionPct = resolvedAgreement?.commissionPct ?? job.commissionPct ?? adminConfig.commissionPct;
  const commission = getCommissionAmount({ amount: total, commissionPct });
  const toPro = total - commission;
  const canConfirm = canConfirmCompletedJob({
    status: job.status,
    agreement: resolvedAgreement,
    role: "client",
  });

  const confirm = () => {
    if (!canConfirm) return;
    setConfirming(true);
    confirmCompletedJob(id);
    setTimeout(() => router.push(`/cliente/trabajos/${id}/valorar`), 800);
  };

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Confirmar trabajo" />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="mb-3 text-center">
          <div className="w-14 h-14 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto mb-3">
            <Icon name="check" size={28} stroke={2.5} />
          </div>
          <div className="font-extrabold text-[18px] text-ink-800 mb-1">
            ¿Confirmas que el trabajo está bien hecho?
          </div>
          <div className="text-[12.5px] text-ink-500 leading-relaxed mb-4">
            Al confirmar, liberamos el pago al profesional. Esta acción no se
            puede deshacer.
          </div>
          <div className="bg-sand-50 rounded-xl p-3 border border-sand-200/70 text-left">
            <div className="flex items-center justify-between text-[12.5px] mb-1.5">
              <span className="text-ink-500">Pago en custodia</span>
              <span className="font-bold text-ink-800">{formatEuro(total)}</span>
            </div>
            <div className="flex items-center justify-between text-[12.5px] mb-1.5">
              <span className="text-ink-500">
                Comisión Arranxos ({commissionPct}%)
              </span>
              <span className="font-bold text-ink-800">
                −{formatEuro(commission)}
              </span>
            </div>
            <div className="border-t border-sand-200 mt-2 pt-2 flex items-center justify-between">
              <span className="font-bold text-ink-800">Se libera al pro</span>
              <span className="font-extrabold text-teal-600">
                {formatEuro(toPro)}
              </span>
            </div>
          </div>
        </Card>

        <Card className="bg-amber-50/60 border-amber-100">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center text-[14px]">
              ⚠️
            </div>
            <div className="text-[12px] text-amber-700 leading-snug">
              ¿Algo no fue bien? Mejor abre una disputa antes de confirmar. El
              equipo de Arranxos revisará el caso.
            </div>
          </div>
        </Card>

        {!canConfirm && (
          <Card className="bg-amber-50 border-amber-100 text-[12px] text-amber-700 leading-snug">
            Este trabajo solo puede confirmarse cuando esté pendiente de confirmación y el pago siga protegido.
          </Card>
        )}
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70 flex flex-col gap-2">
        <Button full onClick={confirm} disabled={confirming || !canConfirm}>
          {confirming ? "Confirmando…" : "Confirmar y liberar pago"}
        </Button>
        <Button
          full
          variant="outline"
          href={`/cliente/trabajos/${id}/disputa`}
        >
          Hay un problema, abrir disputa
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
