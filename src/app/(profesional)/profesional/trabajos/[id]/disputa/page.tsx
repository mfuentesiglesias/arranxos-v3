"use client";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getActiveJobDispute,
  openDispute,
  type ApiDispute,
} from "@/lib/api/disputes";
import { getCurrentProfile, type ApiProfile } from "@/lib/api/profiles";
import { getJobAgreementContext, type ApiJobAgreementContext } from "@/lib/api/agreements";
import { Textarea, Select } from "@/components/ui/input";
import { PhotoUploader } from "@/components/forms/photo-uploader";
import { Icon } from "@/components/ui/icon";
import { jobs } from "@/lib/data";
import {
  canAutoReleaseCompletedJob,
  canOpenDispute,
  getAgreement,
} from "@/lib/domain/policies";
import {
  getCurrentProfessionalId,
  getEffectiveJobById,
  useSession,
} from "@/lib/store";
import { isSupabaseMode } from "@/lib/supabase/config";

interface Props {
  params: Promise<{ id: string }>;
}

const REASONS = [
  "Trabajo incompleto o mal hecho",
  "Cliente no responde tras terminar",
  "Material o repuesto no conforme",
  "Cambio de alcance no acordado",
  "Incidencia en el acceso al trabajo",
  "Otro motivo",
];

function SupabaseInner({ id }: { id: string }) {
  const [agreementContext, setAgreementContext] = useState<ApiJobAgreementContext | null>(null);
  const [currentProfile, setCurrentProfile] = useState<ApiProfile | null>(null);
  const [activeDispute, setActiveDispute] = useState<ApiDispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [desc, setDesc] = useState("");
  const [sending, setSending] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    async function loadContext() {
      setLoading(true);
      setPageError(null);

      try {
        const [profile, nextAgreementContext, nextActiveDispute] = await Promise.all([
          getCurrentProfile(),
          getJobAgreementContext(id),
          getActiveJobDispute(id),
        ]);

        if (!isCancelled) {
          setCurrentProfile(profile);
          setAgreementContext(nextAgreementContext);
          setActiveDispute(nextActiveDispute);
        }
      } catch (error) {
        if (!isCancelled) {
          setCurrentProfile(null);
          setAgreementContext(null);
          setActiveDispute(null);
          setPageError(
            error instanceof Error && error.message
              ? error.message
              : "No pudimos cargar el estado real de la disputa.",
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
  const canSubmitDispute = Boolean(
    currentProfile?.role === "professional" &&
      currentProfile?.professionalStatus === "approved" &&
      currentJob?.assignedProfessionalId === currentProfile.id &&
      currentJob?.status === "completed_pending_confirmation" &&
      currentAgreement &&
      currentAgreement.paymentStatus === "protected" &&
      !activeDispute,
  );
  const valid = Boolean(reason.trim());

  const submit = async () => {
    if (!valid || !canSubmitDispute || sending) {
      return;
    }

    setActionError(null);
    setActionNotice(null);
    setSending(true);

    try {
      await openDispute(id, reason, desc || undefined, []);
      setActionNotice("Disputa abierta. El trabajo queda en revisión para el equipo admin.");
      setReloadKey((currentValue) => currentValue + 1);
    } catch (error) {
      setActionError(
        error instanceof Error && error.message
          ? error.message
          : "No pudimos abrir la disputa. Inténtalo de nuevo.",
      );
    } finally {
      setSending(false);
    }
  };

  let statusMessage: string | null = null;

  if (!loading && !pageError) {
    if (agreementContext?.status === "unauthenticated") {
      statusMessage = "Necesitas iniciar sesión para abrir una disputa real.";
    } else if (currentProfile?.role !== "professional") {
      statusMessage = "Solo el profesional asignado puede abrir esta disputa desde esta ruta.";
    } else if (currentProfile?.professionalStatus !== "approved") {
      statusMessage = "Tu cuenta profesional ya no está aprobada para abrir esta disputa.";
    } else if (activeDispute) {
      statusMessage = "Este trabajo ya tiene una disputa activa en revisión.";
    } else if (!currentJob || !currentAgreement) {
      statusMessage = "Este trabajo todavía no tiene un acuerdo real disponible para disputa.";
    } else if (currentJob.assignedProfessionalId !== currentProfile.id) {
      statusMessage = "Este trabajo ya no está asignado a tu perfil profesional.";
    } else if (
      currentJob.status !== "completed_pending_confirmation" ||
      currentAgreement.paymentStatus !== "protected"
    ) {
      statusMessage = "Solo el profesional asignado puede abrir disputa mientras el trabajo siga pendiente de confirmación y el pago permanezca protegido.";
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Abrir disputa" subtitle="Fase 1 · Sin Stripe ni pagos reales" />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="bg-rose-50 border-rose-100 mb-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-500 text-white flex items-center justify-center">
              <Icon name="alert" size={16} />
            </div>
            <div className="text-[12px] text-rose-700 leading-snug">
              Esta fase registra la disputa real en Supabase y mantiene el acuerdo y el pago protegido asociados al trabajo hasta su resolución admin.
            </div>
          </div>
        </Card>

        {loading && (
          <Card className="mb-3 text-[12px] text-ink-600 leading-snug">
            Estamos cargando el estado real de la disputa.
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

        {activeDispute && (
          <Card className="mb-3 bg-white border-sand-200/70">
            <div className="font-bold text-[13px] text-ink-800 mb-1">Disputa activa</div>
            <div className="text-[12px] text-ink-600 leading-snug">
              Motivo: <strong>{activeDispute.reason}</strong>
            </div>
            {activeDispute.description && (
              <div className="mt-2 text-[12px] text-ink-500 leading-snug">{activeDispute.description}</div>
            )}
          </Card>
        )}

        {!activeDispute && (
          <Card className="mb-3">
            <div className="flex flex-col gap-4">
              <Select
                label="Motivo principal"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                data-testid="pro-dispute-reason-select"
              >
                <option value="">Selecciona un motivo…</option>
                {REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
              <Textarea
                label="Describe qué pasó (opcional)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Describe el problema con detalle."
                rows={5}
                data-testid="pro-dispute-description"
              />
              <div className="text-[11px] text-ink-400 leading-snug">
                Las evidencias adjuntas seguirán en modo mock durante esta fase; la RPC registra `[]` por ahora.
              </div>
            </div>
          </Card>
        )}
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button
          full
          variant="danger"
          onClick={() => void submit()}
          disabled={!valid || sending || !canSubmitDispute}
          testId="pro-submit-dispute"
        >
          {sending ? "Enviando disputa..." : "Enviar disputa"}
        </Button>
      </div>
    </div>
  );
}

function Inner({ id }: { id: string }) {
  const router = useRouter();
  const session = useSession();
  const currentProfessionalId = useSession(getCurrentProfessionalId);
  const effectiveJob = useMemo(() => getEffectiveJobById(session, id), [session, id]);
  const agreement = session.agreements[id];
  const openJobDispute = useSession((s) => s.openJobDispute);
  const autoReleaseCompletedJob = useSession((s) => s.autoReleaseCompletedJob);
  const [reason, setReason] = useState("");
  const [desc, setDesc] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const job = effectiveJob ?? jobs.find((j) => j.id === id) ?? jobs[0];
  const resolvedAgreement = getAgreement(agreement);
  const canSubmitDispute = canOpenDispute({
    status: job.status,
    agreement: resolvedAgreement,
    role: "professional",
    completionDeadline: job.completionDeadline,
    assignedProId: job.assignedProId,
    currentProfessionalId,
  });
  const canAutoRelease = canAutoReleaseCompletedJob({
    status: job.status,
    agreement: resolvedAgreement,
    completionDeadline: job.completionDeadline,
  });
  const valid = Boolean(reason && desc.length > 20);

  useEffect(() => {
    if (canAutoRelease) {
      autoReleaseCompletedJob(id);
      router.replace(`/profesional/trabajos/${id}?autoReleased=1`);
    }
  }, [autoReleaseCompletedJob, canAutoRelease, id, router]);

  const submit = () => {
    if (!valid || !canSubmitDispute) return;
    setSent(true);
    openJobDispute(id, reason, desc, photos, "professional");
    setTimeout(() => router.push(`/profesional/trabajos/${id}`), 900);
  };

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Abrir disputa" />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="bg-rose-50 border-rose-100 mb-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-500 text-white flex items-center justify-center">
              <Icon name="alert" size={16} />
            </div>
            <div className="text-[12px] text-rose-700 leading-snug">
              Dersux revisará la disputa en la demo y mantendrá el acuerdo y el pago protegido mock asociados al trabajo hasta su resolución.
            </div>
          </div>
        </Card>

        <Card className="mb-3">
          <div className="flex flex-col gap-4">
            <Select
              label="Motivo principal"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              data-testid="pro-dispute-reason-select"
            >
              <option value="">Selecciona un motivo…</option>
              {REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
            <Textarea
              label="Describe qué pasó"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Describe el problema con detalle. Incluye qué entregaste, qué faltó y qué esperas que revise admin."
              rows={5}
              note="Mínimo 20 caracteres. Sé concreto y objetivo."
              data-testid="pro-dispute-description"
            />
            <div>
              <div className="text-[12.5px] font-bold text-ink-700 mb-2">
                Evidencias (fotos opcionales)
              </div>
              <PhotoUploader value={photos} onChange={setPhotos} max={6} />
            </div>
          </div>
        </Card>

        {!canSubmitDispute && (
          <Card className="bg-amber-50 border-amber-100 text-[12px] text-amber-700 leading-snug">
            Solo el profesional asignado puede abrir disputa mientras el trabajo siga pendiente de confirmación y el pago permanezca protegido.
          </Card>
        )}
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button
          full
          variant="danger"
          onClick={submit}
          disabled={!valid || sent || !canSubmitDispute}
          testId="pro-submit-dispute"
        >
          {sent ? "Disputa enviada ✓" : "Enviar disputa"}
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
