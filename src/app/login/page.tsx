"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBar } from "@/components/layout/status-bar";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Divider } from "@/components/ui/divider";
import { Icon } from "@/components/ui/icon";
import { ScreenBody } from "@/components/layout/screen-body";
import { useSession } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const enterDemoAccess = useSession((s) => s.enterDemoAccess);
  const [email, setEmail] = useState("antia.bouzas@gmail.com");
  const [pass, setPass] = useState("········");
  const [loading, setLoading] = useState(false);

  const doLogin = () => {
    setLoading(true);
    setTimeout(() => {
      enterDemoAccess("client");
      router.push("/cliente/inicio");
    }, 700);
  };

  const demoAccesses = [
    {
      key: "client",
      label: "Cliente",
      icon: "👤",
      description: "Publicar, aceptar, pagar y valorar",
      target: "/cliente/inicio",
    },
    {
      key: "professional_pending",
      label: "Pro pending",
      icon: "🕓",
      description: "Estado pendiente de aprobación",
      target: "/profesional/pendiente",
    },
    {
      key: "professional_approved",
      label: "Pro approved",
      icon: "🔧",
      description: "Flujo profesional operativo",
      target: "/profesional/inicio",
    },
    {
      key: "admin",
      label: "Admin",
      icon: "🛡️",
      description: "Panel global de control",
      target: "/admin",
    },
  ] as const;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      <StatusBar />
      <div className="px-4 pt-2 pb-4">
        <Link
          href="/welcome"
          className="w-9 h-9 rounded-full bg-sand-100 inline-flex items-center justify-center text-ink-700"
        >
          <Icon name="back" size={18} stroke={2.2} />
        </Link>
      </div>
      <ScreenBody className="px-6 pb-2" white>
        <div className="flex min-h-full flex-col">
          <Logo size={32} />
          <h2 className="text-[24px] font-extrabold text-ink-900 mt-6 mb-1.5 tracking-tight">
            Bienvenida de nuevo
          </h2>
          <p className="text-[14px] text-ink-400 mb-7">
            Inicia sesión en tu cuenta de Arranxos
          </p>
          <div className="flex flex-col gap-4 mb-5">
            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
            <Input
              label="Contraseña"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Tu contraseña"
            />
          </div>
          <button className="text-[13px] text-coral-600 font-semibold text-left mb-5">
            ¿Olvidaste la contraseña?
          </button>
          <Button full onClick={doLogin} disabled={loading}>
            {loading ? "Entrando…" : "Iniciar sesión"}
          </Button>
          <div className="mt-5">
            <Divider label="o accede como demo" />
            <div className="grid grid-cols-2 gap-2 mt-3">
              {demoAccesses.map((demo) => (
                <button
                  key={demo.key}
                  onClick={() => {
                    enterDemoAccess(demo.key);
                    router.push(demo.target);
                  }}
                  className="rounded-2xl border-[1.5px] border-sand-200 bg-white px-3 py-3 text-left active:scale-[0.98]"
                >
                  <div className="text-[16px] mb-1">{demo.icon}</div>
                  <div className="text-[12.5px] font-bold text-ink-700">{demo.label}</div>
                  <div className="text-[11px] text-ink-400 leading-snug mt-0.5">
                    {demo.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-auto pt-5 text-center text-[13px] text-ink-400">
            ¿No tienes cuenta?{" "}
            <Link href="/register?role=client" className="text-coral-600 font-bold">
              Regístrate gratis
            </Link>
          </div>
        </div>
      </ScreenBody>
    </div>
  );
}
