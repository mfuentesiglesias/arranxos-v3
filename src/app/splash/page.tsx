"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";

export default function SplashPage() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.push("/welcome"), 1800);
    return () => clearTimeout(t);
  }, [router]);
  return (
    <div className="flex-1 min-h-0 bg-gradient-to-br from-coral-600 via-coral-500 to-coral-400 flex flex-col items-center justify-center gap-5">
      <div className="animate-pulse2">
        <Logo size={64} light />
      </div>
      <p className="text-white/80 text-[14px] font-medium tracking-wide">
        Servicios de confianza en Galicia
      </p>
    </div>
  );
}
