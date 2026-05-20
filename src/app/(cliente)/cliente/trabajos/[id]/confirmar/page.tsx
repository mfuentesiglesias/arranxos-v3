"use client";
import { use, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  confirmJobCompletion,
  getJobAgreementContext,
  type ApiJobAgreementContext,
} from "@/lib/api/agreements";
import { getCurrentProfile, type ApiProfile } from "@/lib/api/profiles";
import { jobs } from "@/lib/data";
import { canAutoReleaseCompletedJob, canConfirmCompletedJob, getAgreement, getCommissionAmount, getEffectiveFinalPrice } from "@/lib/domain/policies";
import {
  getEffectiveAdminConfig,
  getEffectiveJobById,
  useSession,
} from "@/lib/store";
import { isSupabaseMode } from "@/lib/supabase/config";
import { daysBetween, formatEuro } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

function SupabaseInner({ id }: { id: string }) {
  const [agreementContext, setAgreementContext] = useState<ApiJobAgreementContext | null>(null);
  const [currentProfile, setCurrentProfile] = useState<ApiProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
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
              : "No pudimos cargar el estado real de este trabajo.",
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
  const toPro = total !== null && commission !== null ? total - commission : null;
  const canConfirm = Boolean(
    currentProfile?.role === "client" &&
      currentJob?.status === "completed_pending_confirmation" &&
      currentAgreement &&
      currentAgreement.paymentStatus === "protected",
  );

  const confirm = async () => {
    if (!canConfirm || confirming) {
      return;
    }

    setActionError(null);
    setActionNotice(null);
    setConfirming(true);

    try {
      await confirmJobCompletion(id);
      setActionNotice("Trabajo completado. El pago ha quedado liberado en esta fase fake.");
      setReloadKey((currentValue) => currentValue + 1);
    } catch (error) {
      setActionError(
        error instanceof Error && error.message
          ? error.message
          : "No pudimos confirmar la finalización. Inténtalo de nuevo.",
      );
    } finally {
      setConfirming(false);
    }
  };

  let statusMessage: string | null = null;

  if (!loading && !pageError) {
    if (agreementContext?.status === "unauthenticated") {
      statusMessage = "Necesitas iniciar sesión para confirmar este trabajo real.";
    } else if (currentProfile?.role !== "client") {
      statusMessage = "Solo el cliente owner puede confirmar la finalización de este trabajo.";
    } else if (!currentJob || !currentAgreement) {
      statusMessage = "Este trabajo todavía no tiene un acuerdo real disponible para confirmar.";
    } else if (
      currentJob.status === "completed" &&
      currentAgreement.paymentStatus === "released"
    ) {
      statusMessage = "Trabajo completado. El pago ya fue liberado.";
    } else if (
      currentJob.status !== "completed_pending_confirmation" ||
      currentAgreement.paymentStatus !== "protected"
    ) {
      statusMessage = "Este trabajo solo puede confirmarse cuando esté pendiente de confirmación y el pago siga protegido.";
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Confirmar trabajo" subtitle="Fase 1 · Liberación fake sin Stripe" />
      <ScreenBody className="px-4 pt-3 pb-6">
        {loading && (
          <Card className="mb-3 text-[12px] text-ink-600 leading-snug">
            Estamos cargando el estado real de este trabajo.
          </Card>
        )}

        {pageError && (
          <Card className="mb-3 bg-rose-50 border-rose-100 text-[12px] text-rose-700 leading-snug">
            {pageError}
          </Card>
        )}

        {actionError && (
          <Card className="mb-3 bg-rose-50 border-rose-100 text-[12px] text-rose-700 leading-snug">
            {actionError}
          </Card>
        )}

        {actionNotice && (
          <Card className="mb-3 bg-teal-50 border-teal-100 text-[12px] text-teal-700 leading-snug">
            {actionNotice}
          </Card>
        )}

        {statusMessage && !actionNotice && (
          <Card className="mb-3 bg-amber-50 border-amber-100 text-[12px] text-amber-700 leading-snug">
            {statusMessage}
          </Card>
        )}

        <Card className="mb-3 text-center">
          <div className="w-14 h-14 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto mb-3">
            <Icon name="check" size={28} stroke={2.5} />
          </div>
          <div className="font-extrabold text-[18px] text-ink-800 mb-1">
            ¿Confirmas que el trabajo está bien hecho?
          </div>
          <div className="text-[12.5px] text-ink-500 leading-relaxed mb-4">
            Al confirmar, cerramos el trabajo como completado y liberamos el pago protegido en esta fase fake.
          </div>
          <div className="bg-sand-50 rounded-xl p-3 border border-sand-200/70 text-left">
            <div className="flex items-center justify-between text-[12.5px] mb-1.5">
              <span className="text-ink-500">Pago protegido</span>
              <span className="font-bold text-ink-800">{total !== null ? formatEuro(total) : "Pendiente"}</span>
            </div>
            {commission !== null && commissionPct !== null && (
              <div className="flex items-center justify-between text-[12.5px] mb-1.5">
                <span className="text-ink-500">Comisión Arranxos ({commissionPct}%)</span>
                <span className="font-bold text-ink-800">−{formatEuro(commission)}</span>
              </div>
            )}
            {toPro !== null && (
              <div className="border-t border-sand-200 mt-2 pt-2 flex items-center justify-between">
                <span className="font-bold text-ink-800">Se libera al pro</span>
                <span className="font-extrabold text-teal-600">{formatEuro(toPro)}</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="bg-amber-50/60 border-amber-100 text-[12px] text-amber-700 leading-snug">
          Esta fase no realiza ninguna transferencia real. Solo actualiza el acuerdo a released mediante RPC.
        </Card>
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70 flex flex-col gap-2">
        <Button full onClick={() => void confirm()} disabled={confirming || !canConfirm}>
          {confirming ? "Liberando pago..." : "Confirmar finalización y liberar pago"}
        </Button>
      </div>
    </div>
  );
}

function Inner({ id }: { id: string }) {
  const router = useRouter();
  const session = useSession();
  const adminConfig = useSession(getEffectiveAdminConfig);
  const effectiveJob = useMemo(() => getEffectiveJobById(session, id), [session, id]);
  const agreement = session.agreements[id];
  const confirmCompletedJob = useSession((s) => s.confirmCompletedJob);
  const autoReleaseCompletedJob = useSession((s) => s.autoReleaseCompletedJob);
  const job = effectiveJob ?? jobs.find((j) => j.id === id) ?? jobs[0];
  const resolvedAgreement = getAgreement(agreement);
  const autoReleaseApplied = session.notifications.some(
    (notification) =>
      notification.jobId === id && notification.text.includes("Auto-release demo aplicado"),
  );
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
    completionDeadline: job.completionDeadline,
  });
  const canAutoRelease = canAutoReleaseCompletedJob({
    status: job.status,
    agreement: resolvedAgreement,
    completionDeadline: job.completionDeadline,
  });

  useEffect(() => {
    if (!canAutoRelease) return;
    autoReleaseCompletedJob(id);
    router.replace(`/cliente/trabajos/${id}?autoReleased=1`);
  }, [autoReleaseCompletedJob, canAutoRelease, id, router]);

  const confirm = () => {
    if (!canConfirm) return;
    setConfirming(true);
    confirmCompletedJob(id);
    setTimeout(() => router.push(`/cliente/trabajos/${id}`), 800);
  };

  const applyAutoReleaseDemo = () => {
    if (!job.completionDeadline) return;
    autoReleaseCompletedJob(
      id,
      new Date(new Date(job.completionDeadline).getTime() + 1000).toISOString(),
    );
    router.replace(`/cliente/trabajos/${id}?autoReleased=1`);
  };

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Confirmar trabajo" />
      <ScreenBody className="px-4 pt-3 pb-6">
        {job.status === "completed" && autoReleaseApplied && (
          <Card className="mb-3 bg-teal-50/40 border-teal-100" testId="confirm-auto-release-applied-state">
            <div className="font-bold text-[13px] text-teal-700 mb-1">
              Auto-release demo aplicado
            </div>
            <div className="text-[11.5px] text-teal-700/80 leading-snug">
              El plazo venció y el trabajo quedó completado automáticamente en la demo.
            </div>
          </Card>
        )}

        <Card className="mb-3 text-center">
          <div className="w-14 h-14 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto mb-3">
            <Icon name="check" size={28} stroke={2.5} />
          </div>
          <div className="font-extrabold text-[18px] text-ink-800 mb-1">
            ¿Confirmas que el trabajo está bien hecho?
          </div>
          <div className="text-[12.5px] text-ink-500 leading-relaxed mb-4">
            Al confirmar, cerramos el trabajo como completado dentro de la demo.
            Esta acción no se puede deshacer.
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

        <Card className="bg-amber-50/60 border-amber-100 text-[12px] text-amber-700 leading-snug">
          El acuerdo y el pago protegido seguirán visibles tras la confirmación.
        </Card>

        {job.status === "completed_pending_confirmation" && job.completionDeadline && (
          <Card className="mt-3 bg-violet-50/60 border-violet-100" testId="confirm-auto-release-deadline">
            <div className="font-bold text-[13px] text-violet-800 mb-1">
              Plazo de auto-release demo
            </div>
            <div className="text-[11.5px] text-violet-700 leading-snug">
              Auto-release en {Math.max(0, daysBetween(new Date().toISOString(), job.completionDeadline))} día{Math.max(0, daysBetween(new Date().toISOString(), job.completionDeadline)) === 1 ? "" : "s"} si no confirmas ni abres disputa.
            </div>
          </Card>
        )}

        {!canConfirm && (
          <Card className="bg-amber-50 border-amber-100 text-[12px] text-amber-700 leading-snug">
            Este trabajo solo puede confirmarse cuando esté pendiente de confirmación y el pago siga protegido.
          </Card>
        )}
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70 flex flex-col gap-2">
        <Button full onClick={confirm} disabled={confirming || !canConfirm}>
          {confirming ? "Confirmando…" : "Confirmar y cerrar trabajo"}
        </Button>
        {job.status === "completed_pending_confirmation" && job.completionDeadline && (
          <Button full variant="outline" onClick={applyAutoReleaseDemo} testId="confirm-apply-auto-release-demo">
            Aplicar auto-release demo
          </Button>
        )}
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
      <Inner id={id} />
    </Suspense>
  );
}
