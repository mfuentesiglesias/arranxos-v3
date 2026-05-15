import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

export default function WelcomePage() {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white overflow-y-auto">
      <div className="relative flex min-h-[62svh] flex-1 bg-gradient-to-br from-coral-600 via-coral-500 to-coral-400 flex-col items-center justify-center gap-5 overflow-hidden px-8 py-10">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/[0.06]" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/[0.05]" />
        <Logo size={56} light />
        <div className="text-center z-10 mt-2">
          <h1 className="text-white text-[28px] font-extrabold leading-tight tracking-tight">
            Conecta con profesionales de confianza
          </h1>
          <div className="mt-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            Demo PWA · flujo simulado
          </div>
          <p className="text-white/85 text-[14px] mt-3 leading-relaxed">
            Demo de profesionales de confianza para tus trabajos.
            <br />
            Simulación de pago protegido (en producción sería real).
          </p>
          <p className="mt-2 text-[11px] text-white/80">
            En esta demo no se procesan pagos ni verificaciones reales.
          </p>
        </div>
        <div className="flex gap-5 mt-2 z-10">
          {[
            ["✓", "Validación demo"],
            ["✓", "Pago protegido mock"],
            ["✓", "Reseñas demo"],
          ].map(([icon, text]) => (
            <div key={text} className="text-white/90 text-[11px] font-bold flex items-center gap-1">
              <span className="text-amber-100">{icon}</span>
              {text}
            </div>
          ))}
        </div>
      </div>
      <div className="app-safe-bottom px-6 pt-7 pb-8 flex flex-col gap-3 bg-white">
        <Button full href="/register?role=client">
          Soy cliente · Busco un profesional
        </Button>
        <Button full variant="outline" href="/register?role=professional">
          Soy profesional · Ofrezco servicios
        </Button>
        <div className="text-center mt-1.5 text-[13px] text-ink-400">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-coral-600 font-bold">
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
