"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { getPersistedDemoRoute } from "@/lib/demo-session";

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const persistedRoute = getPersistedDemoRoute();
    const targetRoute = persistedRoute ?? "/welcome";
    const delay = persistedRoute ? 450 : 1800;
    const t = setTimeout(() => router.replace(targetRoute), delay);

    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="flex-1 min-h-0 bg-gradient-to-br from-coral-600 via-coral-500 to-coral-400 flex flex-col items-center justify-center gap-5">
      <div className="animate-pulse2">
        <Logo size={64} light />
      </div>
      <p className="text-white/80 text-[14px] font-medium tracking-wide">
        Servicios de confianza cerca de ti
      </p>
    </div>
  );
}
