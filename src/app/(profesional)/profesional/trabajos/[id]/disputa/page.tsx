"use client";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
              Arranxos revisará la disputa en la demo y mantendrá el acuerdo y el pago protegido mock asociados al trabajo hasta su resolución.
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
  return <Inner id={id} />;
}
