import { Icon } from "@/components/ui/icon";
import { LEAK_LABELS, type LeakMatch } from "@/lib/anti-leak";

interface Props {
  leaks: LeakMatch[];
}

export function AntiLeakAlert({ leaks }: Props) {
  if (leaks.length === 0) return null;
  const types = Array.from(new Set(leaks.map((l) => l.type)));
  return (
    <div className="mx-3 mb-2 rounded-2xl bg-amber-50 border border-amber-100 px-3.5 py-3 flex gap-2.5">
      <div className="text-amber-600 mt-0.5 flex-shrink-0">
        <Icon name="alert" size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[13px] text-amber-700 mb-0.5">
          Información de contacto detectada
        </div>
        <div className="text-[12px] text-amber-700/90 leading-snug">
          Hemos detectado {types.map((t) => LEAK_LABELS[t]).join(" y ")}. Por tu seguridad,
          mantén la conversación y el pago dentro de Arranxos.
        </div>
        <div className="text-[11px] text-amber-600 mt-1.5">
          Intentar saltarse esta regla genera strikes en tu cuenta.
        </div>
      </div>
    </div>
  );
}
