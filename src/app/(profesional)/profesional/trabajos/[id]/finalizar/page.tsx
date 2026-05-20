"use client";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getJobAgreementContext,
  markJobCompleted,
  type ApiJobAgreementContext,
} from "@/lib/api/agreements";
import { getCurrentProfile, type ApiProfile } from "@/lib/api/profiles";
import { Textarea } from "@/components/ui/input";
import { PhotoUploader } from "@/components/forms/photo-uploader";
import { Icon } from "@/components/ui/icon";
import { jobs } from "@/lib/data";
import {
  getAgreement,
  getEffectiveFinalPrice,
} from "@/lib/domain/policies";
import {
  getCurrentProfessionalId,
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
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
  const canFinish = Boolean(
    currentProfile?.role === "professional" &&
      currentProfile?.professionalStatus === "approved" &&
      currentJob?.assignedProfessionalId === currentProfile.id &&
      currentJob?.status === "escrow_funded" &&
      currentAgreement &&
      currentAgreement.paymentStatus === "protected",
  );

  const send = async () => {
    if (!canFinish || sending) {
      return;
    }

    setActionError(null);
    setActionNotice(null);
    setSending(true);

    try {
      await markJobCompleted(id);
      setActionNotice("Trabajo marcado como terminado. Esperando confirmación del cliente.");
      setReloadKey((currentValue) => currentValue + 1);
    } catch (error) {
      setActionError(
        error instanceof Error && error.message
          ? error.message
          : "No pudimos marcar el trabajo como terminado. Inténtalo de nuevo.",
      );
    } finally {
      setSending(false);
    }
  };

  let statusMessage: string | null = null;

  if (!loading && !pageError) {
    if (agreementContext?.status === "unauthenticated") {
      statusMessage = "Necesitas iniciar sesión para cerrar este trabajo real.";
    } else if (currentProfile?.role !== "professional") {
      statusMessage = "Solo el profesional asignado puede marcar este trabajo como terminado.";
    } else if (currentProfile?.professionalStatus !== "approved") {
      statusMessage = "Tu cuenta profesional ya no está aprobada para cerrar este trabajo.";
    } else if (!currentJob || !currentAgreement) {
      statusMessage = "Este trabajo todavía no tiene un acuerdo real disponible para cierre.";
    } else if (currentJob.assignedProfessionalId !== currentProfile.id) {
      statusMessage = "Este trabajo ya no está asignado a tu perfil profesional.";
    } else if (
      currentJob.status === "completed_pending_confirmation" &&
      currentAgreement.paymentStatus === "protected"
    ) {
      statusMessage = "Trabajo marcado como terminado. Esperando confirmación del cliente.";
    } else if (
      currentJob.status === "completed" &&
      currentAgreement.paymentStatus === "released"
    ) {
      statusMessage = "Trabajo completado. El pago ya fue liberado.";
    } else if (currentJob.status !== "escrow_funded" || currentAgreement.paymentStatus !== "protected") {
      statusMessage = "Este trabajo solo puede marcarse como terminado cuando el pago protegido siga activo.";
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Marcar como terminado" subtitle="Fase 1 · Sin auto-release ni Stripe" />
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

        <Card className="mb-3">
          <div className="text-[13px] text-ink-700 mb-2 leading-relaxed">
            Cuando marques el trabajo como terminado, el cliente pasará a tener la confirmación final pendiente en esta fase fake.
          </div>
          <div className="bg-teal-50 rounded-xl p-3 border border-teal-100 flex items-center gap-2.5 text-[12px] text-teal-700">
            <Icon name="shield" size={16} />
            <span className="leading-snug">
              El pago protegido seguirá bloqueado hasta que el cliente confirme la finalización.
            </span>
          </div>
        </Card>

        <Card className="mb-3">
          <div className="font-bold text-[13.5px] text-ink-800 mb-3">Resumen real</div>
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
          </div>
        </Card>
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button full onClick={() => void send()} disabled={sending || !canFinish}>
          {sending ? "Marcando terminado..." : "Marcar trabajo terminado"}
        </Button>
      </div>
    </div>
  );
}

function Inner({ id }: { id: string }) {
  const router = useRouter();
  const session = useSession();
  const currentProfessionalId = useSession(getCurrentProfessionalId);
  const adminConfig = useSession(getEffectiveAdminConfig);
  const effectiveJob = useMemo(() => getEffectiveJobById(session, id), [session, id]);
  const agreement = session.agreements[id];
  const markJobCompletedPendingConfirmation = useSession(
    (s) => s.markJobCompletedPendingConfirmation,
  );
  const job = effectiveJob ?? jobs.find((j) => j.id === id) ?? jobs[0];
  const resolvedAgreement = getAgreement(agreement);
  const total =
    getEffectiveFinalPrice(job, resolvedAgreement) ??
    Math.round((job.priceMin + job.priceMax) / 2);
  const commissionPct = resolvedAgreement?.commissionPct ?? job.commissionPct ?? adminConfig.commissionPct;
  const canFinish =
    job.status === "escrow_funded" &&
    resolvedAgreement?.paymentStatus === "protected" &&
    job.assignedProId === currentProfessionalId;
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const send = () => {
    if (!canFinish) return;
    setSending(true);
    markJobCompletedPendingConfirmation(id);
    setTimeout(() => router.push(`/profesional/trabajos/${id}/seguimiento`), 800);
  };

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Marcar como terminado" subtitle={job.title} />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="mb-3">
          <div className="text-[13px] text-ink-700 mb-2 leading-relaxed">
            Avisaremos al cliente para que revise el trabajo y lo confirme en la demo en un plazo de <strong>{adminConfig.autoReleaseDays} días</strong>.
          </div>
          <div className="bg-teal-50 rounded-xl p-3 border border-teal-100 flex items-center gap-2.5 text-[12px] text-teal-700">
            <Icon name="shield" size={16} />
            <span className="leading-snug">
              El pago protegido seguirá visible y el trabajo pasará a pendiente de confirmación del cliente.
            </span>
          </div>
        </Card>

        {!canFinish && (
          <Card className="mb-3 bg-amber-50 border-amber-100 text-[12px] text-amber-700 leading-snug">
            Solo puedes marcar el trabajo como terminado cuando el pago protegido mock ya esté activo para este trabajo.
          </Card>
        )}

        <Card className="mb-3">
          <div className="flex flex-col gap-4">
            <Textarea
              label="Notas de cierre (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. instalado magnetotérmico de 16A, probado y revisado. Garantía 6 meses."
              rows={4}
            />
            <div>
              <div className="text-[12.5px] font-bold text-ink-700 mb-2">
                Fotos del trabajo (opcional)
              </div>
              <PhotoUploader value={photos} onChange={setPhotos} max={6} />
              <div className="text-[11px] text-ink-400 mt-2 leading-snug">
                Las fotos sirven como evidencia ante posibles disputas.
              </div>
            </div>
          </div>
        </Card>
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button full onClick={send} disabled={sending || !canFinish}>
          {sending ? "Enviando…" : "Marcar terminado y avisar al cliente"}
        </Button>
      </div>
    </div>
  );
}

export default function Page({ params }: Props) {
  const { id } = use(params);

  if (isSupabaseMode()) {
    return <SupabaseInner id={id} />;
  }

  return <Inner id={id} />;
}
