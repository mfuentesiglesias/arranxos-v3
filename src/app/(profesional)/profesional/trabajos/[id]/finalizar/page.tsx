"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { PhotoUploader } from "@/components/forms/photo-uploader";
import { Icon } from "@/components/ui/icon";
import { jobs } from "@/lib/data";
import {
  canMarkJobCompleted,
  getAgreement,
  getCommissionAmount,
  getEffectiveFinalPrice,
} from "@/lib/domain/policies";
import {
  getAgreementByJobId,
  getCurrentProfessionalId,
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
  const currentProfessionalId = useSession(getCurrentProfessionalId);
  const adminConfig = useSession(getEffectiveAdminConfig);
  const effectiveJob = useSession((s) => getEffectiveJobById(s, id));
  const agreement = useSession((s) => getAgreementByJobId(s, id));
  const markJobCompletedPendingConfirmation = useSession(
    (s) => s.markJobCompletedPendingConfirmation,
  );
  const job = effectiveJob ?? jobs.find((j) => j.id === id) ?? jobs[0];
  const resolvedAgreement = getAgreement(agreement);
  const total =
    getEffectiveFinalPrice(job, resolvedAgreement) ??
    Math.round((job.priceMin + job.priceMax) / 2);
  const commissionPct = resolvedAgreement?.commissionPct ?? job.commissionPct ?? adminConfig.commissionPct;
  const canFinish = canMarkJobCompleted({
    status: job.status,
    agreement: resolvedAgreement,
    role: "professional",
    isAssignedToCurrentPro: job.assignedProId === currentProfessionalId,
  });
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
            Avisaremos al cliente para que confirme. Si no responde en{" "}
            <strong>{adminConfig.autoReleaseDays} días</strong>, el pago
            se libera automáticamente.
          </div>
          <div className="bg-teal-50 rounded-xl p-3 border border-teal-100 flex items-center gap-2.5 text-[12px] text-teal-700">
            <Icon name="shield" size={16} />
            <span className="leading-snug">
              Te liberaremos {formatEuro(total - getCommissionAmount({ amount: total, commissionPct }))}{" "}
              tras confirmación.
            </span>
          </div>
        </Card>

        {!canFinish && (
          <Card className="mb-3 bg-amber-50 border-amber-100 text-[12px] text-amber-700 leading-snug">
            Solo puedes marcar el trabajo como terminado cuando ya esté en curso y el pago siga protegido.
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
  return <Inner id={id} />;
}
