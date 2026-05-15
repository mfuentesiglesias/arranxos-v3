import Link from "next/link";
import { StatusBar } from "@/components/layout/status-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export default function PendientePage() {
  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <ScreenBody className="px-4 pt-4 pb-6 flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-5">
          <Icon name="clock" size={36} stroke={2} />
        </div>
        <div className="font-extrabold text-[20px] text-ink-900 mb-2">
          Estado pendiente simulado
        </div>
        <div className="text-[13px] text-ink-500 leading-relaxed max-w-[300px] mb-6">
          En producción se verificaría la documentación profesional antes de
          aprobar la cuenta. En esta demo no se envían emails ni se aprueban
          cuentas reales.
        </div>
        <Card className="w-full bg-white border-sand-200/70 mb-3 text-left">
          <div className="text-[12px] font-bold text-ink-700 mb-2 uppercase tracking-wide">
            Mientras tanto
          </div>
          <ul className="space-y-1.5 text-[12.5px] text-ink-500 leading-relaxed">
            <li className="flex items-start gap-2">
              <Icon name="check" size={14} stroke={2.5} className="text-teal-500 mt-0.5" />
              <span>Flujo de revisión representado en modo demo</span>
            </li>
            <li className="flex items-start gap-2">
              <Icon name="check" size={14} stroke={2.5} className="text-teal-500 mt-0.5" />
              <span>En producción se enviaría un email de confirmación</span>
            </li>
            <li className="flex items-start gap-2">
              <Icon name="check" size={14} stroke={2.5} className="text-teal-500 mt-0.5" />
              <span>En producción, tras aprobación, podrías recibir trabajos</span>
            </li>
          </ul>
        </Card>
        <div className="text-[12px] text-ink-400 mb-5">
          ¿Necesitas algo? Escríbenos a{" "}
          <a
            href="mailto:soporte@arranxos.gal?subject=Consulta%20de%20cuenta%20pendiente%20%28demo%29"
            className="font-semibold text-coral-600"
          >
            soporte@arranxos.gal
          </a>
        </div>
        <Button full variant="outline" href="/welcome">
          Volver al inicio
        </Button>
        <Link
          href="/login"
          className="mt-3 text-[12px] text-coral-600 font-bold"
        >
          Iniciar sesión con otra cuenta
        </Link>
      </ScreenBody>
    </div>
  );
}
