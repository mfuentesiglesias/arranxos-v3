"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";

// DEMO: in-memory only. In prod upload to Supabase Storage.
interface Props {
  value?: string[];
  onChange?: (photos: string[]) => void;
  max?: number;
  label?: string;
}

export function PhotoUploader({
  value,
  onChange,
  max = 6,
  label = "Fotos (opcional)",
}: Props) {
  const [internalPhotos, setInternalPhotos] = useState<string[]>([]);
  const photos = value ?? internalPhotos;
  const updatePhotos = (next: string[]) => {
    if (onChange) {
      onChange(next);
      return;
    }
    setInternalPhotos(next);
  };

  const add = () => {
    // mock: just push a placeholder
    updatePhotos([...photos, `ph${photos.length + 1}`]);
  };
  const remove = (i: number) => updatePhotos(photos.filter((_, j) => j !== i));

  return (
    <div>
      <label className="text-[13px] font-semibold text-ink-500 block mb-2">
        {label}
      </label>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-xl bg-gradient-to-br from-sand-200 to-sand-300 border border-sand-300 flex items-center justify-center text-ink-500 relative"
          >
            <Icon name="image" size={28} />
            <button
              onClick={() => remove(i)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/80 text-ink-700 flex items-center justify-center shadow-sm hover:bg-white"
              aria-label="Eliminar foto"
            >
              <Icon name="x" size={14} stroke={2.5} />
            </button>
          </div>
        ))}
        {photos.length < max && (
          <button
            onClick={add}
            className="aspect-square rounded-xl bg-white border-2 border-dashed border-sand-300 flex flex-col items-center justify-center gap-1 text-ink-400 hover:border-coral-400 hover:text-coral-500 transition"
          >
            <Icon name="camera" size={24} />
            <span className="text-[11px] font-semibold">Añadir</span>
          </button>
        )}
      </div>
      <p className="text-[11px] text-ink-400 mt-2">
        Hasta {max} foto{max === 1 ? "" : "s"}. Evita mostrar datos personales o cuenta bancaria.
      </p>
    </div>
  );
}
