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
import { signInWithPassword } from "@/lib/api/auth";
import { getCurrentProfile } from "@/lib/api/profiles";
import { clearPersistedDemoSession } from "@/lib/demo-session";
import { useSession } from "@/lib/store";
import { getDataMode, isSupabaseMode } from "@/lib/supabase/config";

export default function LoginPage() {
  const router = useRouter();
  const enterDemoAccess = useSession((s) => s.enterDemoAccess);
  const isSupabase = isSupabaseMode();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("········");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRecoveryDemo, setShowRecoveryDemo] = useState(false);

  const doLogin = async () => {
    if (!isSupabase) {
      setError(null);
      setLoading(true);
      setTimeout(() => {
        enterDemoAccess("client");
        router.push("/cliente/inicio");
      }, 700);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      const profile = await getCurrentProfile();
      if (!profile) {
        throw new Error("No se encontró tu perfil en Arranxos.");
      }

      if (profile.role === "admin") {
        router.push("/admin");
        return;
      }

      if (profile.role === "professional") {
        if (profile.professionalStatus === "approved") {
          router.push("/profesional/inicio");
          return;
        }

        if (profile.professionalStatus === "blocked") {
          router.push("/profesional/bloqueado");
          return;
        }

        router.push("/profesional/pendiente");
        return;
      }

      router.push("/cliente/inicio");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "No se pudo iniciar sesión.";
      setError(message);
      setLoading(false);
    }
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
          {!isSupabase && (
            <>
              <button
                type="button"
                className="text-[13px] text-coral-600 font-semibold text-left mb-3"
                onClick={() => setShowRecoveryDemo((current) => !current)}
                data-testid="forgot-password-trigger"
              >
                ¿Olvidaste la contraseña?
              </button>
              {showRecoveryDemo && (
                <div
                  className="mb-5 w-full rounded-2xl border border-sand-200 bg-sand-50 px-3 py-3"
                  data-testid="forgot-password-demo-panel"
                >
                  <div className="text-[12.5px] font-bold text-ink-700">Recuperación demo</div>
                  <div className="mt-1 text-[11.5px] text-ink-500 leading-snug">
                    En producción se enviaría un email de recuperación.
                  </div>
                  <div className="mt-1 text-[11.5px] text-ink-500 leading-snug">
                    En esta demo no se envían emails reales.
                  </div>
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowRecoveryDemo(false)}
                      testId="forgot-password-demo-close"
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
          <Button full onClick={doLogin} disabled={loading}>
            {loading ? "Entrando…" : "Iniciar sesión"}
          </Button>
          {error && isSupabase && (
            <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-3 text-[12px] text-rose-700">
              {error}
            </div>
          )}
          {!isSupabase && (
            <div className="mt-5">
              <Divider label="o accede como demo" />
              <div className="grid grid-cols-2 gap-2 mt-3">
                {demoAccesses.map((demo) => (
                  <button
                    key={demo.key}
                    type="button"
                    data-testid={
                      demo.key === "client"
                        ? "demo-client"
                        : demo.key === "professional_pending"
                        ? "demo-pro-pending"
                        : demo.key === "professional_approved"
                        ? "demo-pro-approved"
                        : "demo-admin"
                    }
                    onClick={() => {
                      enterDemoAccess(demo.key);

                      if (demo.key === "admin") {
                        window.location.assign(demo.target);
                        return;
                      }

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
              <div className="mt-3 flex flex-col items-center gap-2">
                <button
                  type="button"
                  data-testid="demo-reset-button"
                  onClick={() => setShowResetConfirm((current) => !current)}
                  className="text-[12px] font-semibold text-ink-400 underline-offset-2 hover:text-ink-600 hover:underline"
                >
                  Reset demo
                </button>
                {showResetConfirm && (
                  <div className="w-full rounded-2xl border border-sand-200 bg-sand-50 px-3 py-3 text-left">
                    <div className="text-[12px] font-semibold text-ink-700">
                      Limpia la sesion demo persistida y vuelve al estado inicial.
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button
                        full
                        size="sm"
                        variant="outline"
                        onClick={() => setShowResetConfirm(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        full
                        size="sm"
                        testId="demo-reset-confirm"
                        onClick={() => {
                          clearPersistedDemoSession();
                          window.location.href = "/welcome";
                        }}
                      >
                        Confirmar reset
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="mt-auto pt-5 text-center text-[13px] text-ink-400">
            ¿No tienes cuenta?{" "}
            <Link href="/register?role=client" className="text-coral-600 font-bold">
              Regístrate gratis
            </Link>
          </div>
          {isSupabase && (
            <div className="mt-3 text-center text-[11px] text-ink-400">
              Modo de datos activo: {getDataMode()}.
            </div>
          )}
        </div>
      </ScreenBody>
    </div>
  );
}
