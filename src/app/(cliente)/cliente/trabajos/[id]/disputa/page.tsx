"use client";
import { use, Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea, Select } from "@/components/ui/input";
import { PhotoUploader } from "@/components/forms/photo-uploader";
import { Icon } from "@/components/ui/icon";

interface Props {
  params: Promise<{ id: string }>;
}

const REASONS = [
  "Trabajo incompleto o mal hecho",
  "No se presentó / no vino",
  "Daños causados",
  "Cobró más de lo acordado",
  "Material o repuesto incorrecto",
  "No cumplió los plazos",
  "Otro motivo",
];

function Inner({ id }: { id: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [desc, setDesc] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const valid = Boolean(reason && desc.length > 20);

  const submit = () => {
    setSent(true);
    setTimeout(() => router.push(`/cliente/trabajos/${id}`), 900);
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
              El equipo de Arranxos revisará la disputa en un plazo de 48-72 h.
              El pago queda retenido hasta la resolución.
            </div>
          </div>
        </Card>

        <Card className="mb-3">
          <div className="flex flex-col gap-4">
            <Select
              label="Motivo principal"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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
              placeholder="Cuéntanos con detalle lo ocurrido. Incluye fechas, nombres y lo que esperabas."
              rows={5}
              note="Mínimo 20 caracteres. Sé objetivo y claro."
            />
            <div>
              <div className="text-[12.5px] font-bold text-ink-700 mb-2">
                Evidencias (fotos opcionales)
              </div>
              <PhotoUploader value={photos} onChange={setPhotos} max={6} />
            </div>
          </div>
        </Card>
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button full variant="danger" onClick={submit} disabled={!valid || sent}>
          {sent ? "Disputa enviada ✓" : "Enviar disputa"}
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
