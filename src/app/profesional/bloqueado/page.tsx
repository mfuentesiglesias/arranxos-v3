import { StatusBar } from "@/components/layout/status-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export default function BloqueadoPage() {
  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <ScreenBody className="px-4 pt-4 pb-6 flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-5">
          <Icon name="lock" size={32} stroke={2} />
        </div>
        <div className="font-extrabold text-[20px] text-ink-900 mb-2">
          Cuenta bloqueada
        </div>
        <div className="mb-3 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700">
          Simulación demo · No hay incidencias reales
        </div>
        <div className="text-[13px] text-ink-500 leading-relaxed max-w-[320px] mb-6">
          Esta pantalla representa un bloqueo de ejemplo. En producción, el
          equipo revisaría el caso antes de decidir la reactivación.
        </div>
        <Card className="w-full bg-rose-50/50 border-rose-100 mb-5 text-left">
          <div className="text-[12px] font-bold text-rose-700 mb-2 uppercase tracking-wide">
            Motivos registrados
          </div>
          <ul className="space-y-1.5 text-[12px] text-rose-700/90 leading-snug">
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Intento de compartir teléfono en chat (strike #1)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>Disputa resuelta a favor del cliente (strike #2)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>No se presentó a trabajo acordado (strike #3)</span>
            </li>
          </ul>
        </Card>
        <Button
          full
          href="mailto:soporte@arranxos.gal?subject=Revisi%C3%B3n%20de%20cuenta%20bloqueada%20%28demo%29"
          testId="blocked-support-contact"
        >
          Contactar con soporte
        </Button>
        <div className="text-[11px] text-ink-400 mt-4 max-w-[280px] leading-snug">
          En producción, soporte podría revisar estos casos con SLA operativo.
        </div>
        <div className="text-[11px] text-ink-400 mt-1 max-w-[280px] leading-snug">
          Demo: este acceso abre tu app de correo. No crea tickets reales ni
          envía emails automáticos en esta versión.
        </div>
      </ScreenBody>
    </div>
  );
}
