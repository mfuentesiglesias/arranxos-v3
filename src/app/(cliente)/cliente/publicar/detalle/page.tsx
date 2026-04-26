"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { PhotoUploader } from "@/components/forms/photo-uploader";
import { Icon } from "@/components/ui/icon";
import { AntiLeakAlert } from "@/components/chat/anti-leak-alert";
import { hasLeak, scanLeaks } from "@/lib/anti-leak";

function DetalleInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("Vigo");
  const [priceRange, setPriceRange] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [urgent, setUrgent] = useState(false);

  const leaks = description ? scanLeaks(description) : [];

  const canNext = Boolean(title && description && priceRange && !hasLeak(description));

  const next = () => {
    const q = new URLSearchParams(params);
    q.set("title", title);
    q.set("description", description);
    q.set("location", location);
    q.set("priceRange", priceRange);
    q.set("urgent", urgent ? "1" : "0");
    router.push(`/cliente/publicar/revisar?${q.toString()}`);
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <StatusBar />
      <TopBar title="Publicar trabajo" subtitle="Paso 3 de 4 · Detalles" />
      <ScreenBody className="px-5 pt-3 pb-6" white>
        <div className="flex flex-col gap-4">
          <Input
            label="Título corto"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Reparar cuadro eléctrico en piso"
          />
          <Textarea
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe qué necesitas. Cuanto más detalle, mejor."
            rows={4}
          />
          {leaks.length > 0 && <AntiLeakAlert leaks={leaks} />}

          <Select
            label="Ciudad o zona aproximada"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            {[
              "Vigo",
              "A Coruña",
              "Santiago de Compostela",
              "Pontevedra",
              "Ourense",
              "Lugo",
              "Ferrol",
              "Sanxenxo",
              "Cangas",
              "Otra ciudad",
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>

          <Select
            label="Rango de presupuesto orientativo"
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
          >
            <option value="">Selecciona un rango…</option>
            <option>Menos de 100€</option>
            <option>100–300€</option>
            <option>300–700€</option>
            <option>700–1.500€</option>
            <option>1.500–3.000€</option>
            <option>Más de 3.000€</option>
            <option>No tengo idea, quiero que me propongan</option>
          </Select>

          <div>
            <div className="text-[12.5px] font-bold text-ink-700 mb-2">
              Fotos (opcional, recomendado)
            </div>
            <PhotoUploader value={photos} onChange={setPhotos} max={4} />
          </div>

          <button
            onClick={() => setUrgent(!urgent)}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-[1.5px] transition text-left ${
              urgent
                ? "border-coral-500 bg-coral-50"
                : "border-sand-200 bg-white"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center transition ${
                urgent ? "bg-coral-500 border-coral-500" : "border-sand-300"
              }`}
            >
              {urgent && (
                <Icon name="check" size={12} stroke={3} className="text-white" />
              )}
            </div>
            <div>
              <div className="font-bold text-[13px] text-ink-800">
                Marcar como urgente
              </div>
              <div className="text-[11px] text-ink-400">
                Los profesionales lo verán como prioritario
              </div>
            </div>
          </button>
        </div>
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button full onClick={next} disabled={!canNext}>
          Revisar y publicar
        </Button>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div />}>
      <DetalleInner />
    </Suspense>
  );
}
