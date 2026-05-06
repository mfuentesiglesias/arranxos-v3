"use client";
import { use, useMemo, useState } from "react";
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
  getAgreement,
  getEffectiveFinalPrice,
} from "@/lib/domain/policies";
import {
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
  return <Inner id={id} />;
}
