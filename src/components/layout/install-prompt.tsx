"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// PWA install prompt (only when browser emits `beforeinstallprompt`).
// Dismissible, session-only.
export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [shown, setShown] = useState(false);
  const pathname = usePathname() ?? "";
  const hasBottomNav =
    pathname.startsWith("/cliente") ||
    pathname.startsWith("/profesional") ||
    pathname.startsWith("/admin");

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setShown(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!shown || !evt) return null;

  const install = async () => {
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === "accepted") setShown(false);
  };

  return (
    <div
      className={cn(
        "app-install-prompt fixed md:hidden z-50 rounded-2xl bg-white shadow-cardHover border border-sand-200 p-3 flex items-center gap-3 animate-slideUp",
        hasBottomNav && "app-install-prompt-with-nav",
      )}
    >
      <div className="w-10 h-10 rounded-xl bg-coral-500 text-white flex items-center justify-center">
        <Icon name="download" size={18} />
      </div>
      <div className="flex-1">
        <div className="font-bold text-[13px] text-ink-800">
          Instala Arranxos
        </div>
        <div className="text-[11px] text-ink-400">
          Acceso rápido desde tu pantalla de inicio.
        </div>
      </div>
      <button
        onClick={install}
        className="bg-coral-500 text-white text-[12px] font-bold px-3 py-1.5 rounded-full"
      >
        Instalar
      </button>
      <button
        onClick={() => setShown(false)}
        className="text-ink-400 text-[11px] font-bold"
        aria-label="Cerrar"
      >
        ✕
      </button>
    </div>
  );
}
