"use client";
import { use, Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  fundProtectedPayment,
  getJobAgreementContext,
  type ApiJobAgreementContext,
} from "@/lib/api/agreements";
import { getCurrentProfile, type ApiProfile } from "@/lib/api/profiles";
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
import { isSupabaseMode } from "@/lib/supabase/config";
import { formatEuro } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

function SupabaseInner({ id }: { id: string }) {
  const [agreementContext, setAgreementContext] = useState<ApiJobAgreementContext | null>(null);
  const [currentProfile, setCurrentProfile] = useState<ApiProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [payNotice, setPayNotice] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    async function loadContext() {
      setLoading(true);
      setPageError(null);

      try {
        const [profile, nextAgreementContext] = await Promise.all([
          getCurrentProfile(),
          getJobAgreementContext(id),
        ]);

        if (!isCancelled) {
          setCurrentProfile(profile);
          setAgreementContext(nextAgreementContext);
        }
      } catch (error) {
        if (!isCancelled) {
          setCurrentProfile(null);
          setAgreementContext(null);
          setPageError(
            error instanceof Error && error.message
              ? error.message
              : "No pudimos cargar el estado real del pago protegido.",
          );
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void loadContext();

    return () => {
      isCancelled = true;
    };
  }, [id, reloadKey]);

  const currentJob = agreementContext?.status === "ready" ? agreementContext.job : null;
  const currentAgreement = agreementContext?.status === "ready" ? agreementContext.agreement : null;
  const total =
    currentAgreement?.finalPrice ??
    (currentJob?.priceMin !== null &&
    currentJob?.priceMin !== undefined &&
    currentJob?.priceMax !== null &&
    currentJob?.priceMax !== undefined
      ? Math.round((currentJob.priceMin + currentJob.priceMax) / 2)
      : null);
  const commissionPct = currentAgreement?.commissionPct ?? null;
  const commission =
    total !== null && commissionPct !== null
      ? getCommissionAmount({ amount: total, commissionPct })
      : null;
  const canPay = Boolean(
    currentProfile?.role === "client" &&
      currentJob?.status === "agreed" &&
      currentAgreement &&
      currentAgreement.acceptedByClient &&
      currentAgreement.acceptedByProfessional &&
      currentAgreement.paymentStatus === "pending",
  );

  const pay = async () => {
    if (!canPay || paying) {
      return;
    }

    setPayError(null);
    setPayNotice(null);
    setPaying(true);

    try {
      await fundProtectedPayment(id);
      setPayNotice("Pago protegido. Los fondos han quedado retenidos en esta fase fake.");
      setReloadKey((currentValue) => currentValue + 1);
    } catch (error) {
      setPayError(
        error instanceof Error && error.message
          ? error.message
          : "No pudimos proteger el pago. Inténtalo de nuevo.",
      );
    } finally {
      setPaying(false);
    }
  };

  let statusMessage: string | null = null;

  if (!loading && !pageError) {
    if (agreementContext?.status === "unauthenticated") {
      statusMessage = "Necesitas iniciar sesión para proteger este pago real.";
    } else if (currentProfile?.role !== "client") {
      statusMessage = "Solo el cliente owner puede proteger este pago en Fase 1.";
    } else if (!currentJob || !currentAgreement) {
      statusMessage = "Este trabajo todavía no tiene un acuerdo real disponible para pago protegido.";
    } else if (currentAgreement.paymentStatus === "protected") {
      statusMessage = "Este acuerdo ya tiene el pago protegido.";
    } else if (currentJob.status !== "agreed") {
      statusMessage = "Este trabajo ya no está en estado acordado para proteger el pago.";
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Pagar con custodia" subtitle="Fase 1 · Sin cobro real ni Stripe" />
      <ScreenBody className="px-4 pt-3 pb-6">
        {loading && (
          <Card className="mb-3 text-[12px] text-ink-600 leading-snug">
            Estamos cargando el estado real del pago protegido.
          </Card>
        )}

        {pageError && (
          <Card className="bg-rose-50 border-rose-100 mb-3 text-[12px] text-rose-700 leading-snug">
            {pageError}
          </Card>
        )}

        {payError && (
          <Card className="bg-rose-50 border-rose-100 mb-3 text-[12px] text-rose-700 leading-snug">
            {payError}
          </Card>
        )}

        {payNotice && (
          <Card className="bg-teal-50 border-teal-100 mb-3 text-[12px] text-teal-700 leading-snug">
            {payNotice}
          </Card>
        )}

        {statusMessage && !payNotice && (
          <Card className="bg-amber-50 border-amber-100 mb-3 text-[12px] text-amber-700 leading-snug">
            {statusMessage}
          </Card>
        )}

        <Card className="bg-teal-50/50 border-teal-100 mb-3" testId="mock-payment-summary">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center">
              <Icon name="shield" size={18} />
            </div>
            <div>
              <div className="font-bold text-[14px] text-teal-700">
                {total !== null ? `${formatEuro(total)} en custodia` : "Pago protegido pendiente"}
              </div>
              <div className="text-[11.5px] text-teal-700/80 leading-snug">
                En esta fase no se procesa ningún cobro real. Solo marcamos el acuerdo como protegido mediante RPC.
              </div>
            </div>
          </div>
        </Card>

        <Card className="mb-3">
          <div className="font-bold text-[13.5px] text-ink-800 mb-3">Resumen del acuerdo</div>
          <div className="space-y-2 text-[12.5px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-500">Trabajo</span>
              <span className="font-bold text-ink-800 text-right">{currentJob?.id ?? id}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-500">Estado del trabajo</span>
              <span className="font-bold text-ink-800">{currentJob?.status ?? "Sin contexto"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-500">Importe acordado</span>
              <span className="font-bold text-ink-800">
                {total !== null ? formatEuro(total) : "Pendiente"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-500">Estado del pago</span>
              <span className="font-bold text-ink-800">{currentAgreement?.paymentStatus ?? "Sin acuerdo"}</span>
            </div>
            {commission !== null && commissionPct !== null && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-500">Comisión Arranxos ({commissionPct}%)</span>
                <span className="font-bold text-ink-800">{formatEuro(commission)}</span>
              </div>
            )}
            <div className="border-t border-sand-200 pt-2 text-[11.5px] text-ink-500 leading-snug">
              Al confirmar este paso, el acuerdo pasará de pending a protected y el trabajo de agreed a escrow_funded.
            </div>
          </div>
        </Card>

        <Card className="mb-3 bg-sand-50">
          <div className="text-[12px] text-ink-600 leading-relaxed">
            No se solicitan datos reales de tarjeta ni se realiza ningún cargo. Este build solo cubre el pago protegido fake del acuerdo.
          </div>
        </Card>
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button full onClick={() => void pay()} disabled={paying || !canPay} testId="confirm-mock-payment">
          {paying
            ? "Protegiendo pago..."
            : total !== null
              ? `Pagar y proteger ${formatEuro(total)}`
              : "Pagar y proteger"}
        </Button>
      </div>
    </div>
  );
}

function MockInner({ id }: { id: string }) {
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
      <TopBar title="Pagar con custodia" subtitle="Demo · Simulación de pago protegido" />
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
                En esta demo no se procesa ningún cobro real. En producción, el pago quedaría retenido según el acuerdo.
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
              Demo PWA: al confirmar este paso solo marcamos el acuerdo como financiado y el estado del trabajo pasa a pago protegido mock.
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
          {paying ? "Simulando retención…" : `Simular pago y retener ${formatEuro(total)}`}
        </Button>
      </div>
    </div>
  );
}

export default function Page({ params }: Props) {
  const { id } = use(params);

  if (isSupabaseMode()) {
    return (
      <Suspense fallback={<div />}>
        <SupabaseInner id={id} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div />}>
      <MockInner id={id} />
    </Suspense>
  );
}
