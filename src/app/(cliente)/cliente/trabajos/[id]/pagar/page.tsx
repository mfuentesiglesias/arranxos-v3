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
  getAgreement,
  getCommissionAmount,
  getEffectiveFinalPrice,
  hasAgreement,
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
  const session = useSession();
  const adminConfig = getEffectiveAdminConfig(session);
  const effectiveJob = getEffectiveJobById(session, id);
  const agreement = getAgreementByJobId(session, id);
  const markAgreementProtected = useSession((s) => s.markAgreementProtected);
  const job = effectiveJob ?? jobs.find((j) => j.id === id) ?? jobs[0];
  const resolvedAgreement = getAgreement(agreement);
  const total =
    getEffectiveFinalPrice(job, resolvedAgreement) ??
    Math.round((job.priceMin + job.priceMax) / 2);
  const commissionPct = resolvedAgreement?.commissionPct ?? job.commissionPct ?? adminConfig.commissionPct;
  const commission = getCommissionAmount({ amount: total, commissionPct });
  const canPay =
    job.status === "agreed" &&
    hasAgreement(resolvedAgreement) &&
    resolvedAgreement?.paymentStatus !== "protected";
  const [paying, setPaying] = useState(false);

  const pay = () => {
    if (!canPay) return;
    setPaying(true);
    setTimeout(() => {
      markAgreementProtected(id);
      router.push(`/cliente/trabajos/${id}?paid=1`);
    }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Pagar con custodia" subtitle="Tu dinero está protegido" />
      <ScreenBody className="px-4 pt-3 pb-6">
        {!canPay && (
          <Card className="bg-amber-50 border-amber-100 mb-3 text-[12px] text-amber-700 leading-snug">
            Este pago demo solo está disponible cuando el trabajo ya tiene un acuerdo y sigue pendiente de financiación mock.
          </Card>
        )}
        <Card className="bg-teal-50/50 border-teal-100 mb-3" testId="mock-payment-summary">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center">
              <Icon name="shield" size={18} />
            </div>
            <div>
              <div className="font-bold text-[14px] text-teal-700">
                {formatEuro(total)} en custodia
              </div>
              <div className="text-[11.5px] text-teal-700/80 leading-snug">
                Pago protegido mock. Los fondos quedan retenidos en la demo hasta un paso posterior.
              </div>
            </div>
          </div>
        </Card>

        <Card className="mb-3">
          <div className="font-bold text-[13.5px] text-ink-800 mb-3">Resumen del acuerdo</div>
          <div className="space-y-2 text-[12.5px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-500">Trabajo</span>
              <span className="font-bold text-ink-800 text-right">{job.title}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-500">Importe acordado</span>
              <span className="font-bold text-ink-800">{formatEuro(total)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-500">Comisión Arranxos ({commissionPct}%)</span>
              <span className="font-bold text-ink-800">{formatEuro(commission)}</span>
            </div>
            <div className="border-t border-sand-200 pt-2 text-[11.5px] text-ink-500 leading-snug">
              Demo PWA: al confirmar este paso solo marcamos el acuerdo como financiado y el estado del trabajo pasa a pago protegido.
            </div>
          </div>
        </Card>

        <Card className="mb-3 bg-sand-50">
          <div className="text-[12px] text-ink-600 leading-relaxed">
            No se solicitan datos reales de tarjeta ni se realiza ningún cargo. Este build solo cubre la financiación mock del acuerdo.
          </div>
        </Card>
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button full onClick={pay} disabled={paying || !canPay} testId="confirm-mock-payment">
          {paying ? "Reteniendo fondos…" : `Pagar y retener ${formatEuro(total)}`}
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
