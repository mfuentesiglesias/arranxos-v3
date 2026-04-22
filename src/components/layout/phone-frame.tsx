"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

// Dev/preview frame. In production (installed PWA) we just render children.

const NAV_GROUPS: Array<{ group: string; screens: { href: string; label: string }[] }> = [
  {
    group: "Acceso",
    screens: [
      { href: "/splash", label: "Splash" },
      { href: "/welcome", label: "Bienvenida" },
      { href: "/login", label: "Login" },
      { href: "/register", label: "Registro" },
      { href: "/profesional/pendiente", label: "Pro · Pendiente" },
      { href: "/profesional/bloqueado", label: "Pro · Bloqueado" },
    ],
  },
  {
    group: "Cliente",
    screens: [
      { href: "/cliente/inicio", label: "Inicio" },
      { href: "/cliente/explorar", label: "Explorar pros" },
      { href: "/cliente/publicar", label: "Publicar · categoría" },
      { href: "/cliente/publicar/servicio", label: "Publicar · servicio" },
      { href: "/cliente/publicar/detalle", label: "Publicar · detalle" },
      { href: "/cliente/publicar/revisar", label: "Publicar · revisar" },
      { href: "/cliente/trabajos", label: "Mis trabajos" },
      { href: "/cliente/trabajos/j1", label: "Detalle trabajo" },
      { href: "/cliente/trabajos/j1/solicitudes", label: "Solicitudes" },
      { href: "/cliente/trabajos/j1/invitaciones", label: "Invitaciones" },
      { href: "/cliente/trabajos/j1/aceptar?proId=p1", label: "Aceptar pro" },
      { href: "/cliente/trabajos/j3/pagar", label: "Pagar (escrow)" },
      { href: "/cliente/trabajos/j19/confirmar", label: "Confirmar" },
      { href: "/cliente/trabajos/j13/disputa", label: "Disputa" },
      { href: "/cliente/trabajos/j4/valorar", label: "Valorar pro" },
      { href: "/cliente/perfil", label: "Perfil cliente" },
    ],
  },
  {
    group: "Profesional",
    screens: [
      { href: "/profesional/inicio", label: "Inicio pro" },
      { href: "/profesional/trabajos", label: "Explorar trabajos" },
      { href: "/profesional/trabajos/j1", label: "Detalle trabajo (aprox)" },
      { href: "/profesional/trabajos/j1/solicitar", label: "Solicitar trabajo" },
      { href: "/profesional/trabajos/j2/seguimiento", label: "Seguimiento" },
      { href: "/profesional/trabajos/j19/finalizar", label: "Finalizar" },
      { href: "/profesional/pagos", label: "Pagos" },
      { href: "/profesional/mi-perfil", label: "Perfil pro" },
    ],
  },
  {
    group: "Flujo compartido",
    screens: [
      { href: "/chat/j22", label: "Chat / negociación" },
      { href: "/cliente/trabajos/j4/valorar", label: "Valoración" },
    ],
  },
  {
    group: "Admin",
    screens: [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/profesionales", label: "Profesionales" },
      { href: "/admin/usuarios", label: "Usuarios" },
      { href: "/admin/trabajos", label: "Trabajos" },
      { href: "/admin/chats", label: "Chats / moderación" },
      { href: "/admin/disputas", label: "Disputas" },
      { href: "/admin/valoraciones", label: "Valoraciones" },
      { href: "/admin/tickets-busqueda", label: "Tickets búsqueda" },
      { href: "/admin/configuracion", label: "Configuración" },
    ],
  },
];

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  const isFullPage = pathname === "/splash" || pathname === "/welcome";

  return (
    <div className="h-full min-h-0 bg-[#1a1a1a] flex items-stretch md:items-center justify-center gap-0 py-0 md:py-5">
      {/* Side nav (desktop only, when in preview) */}
      <aside className="hidden lg:block w-[200px] self-start sticky top-5 mr-4">
        <div className="bg-white/5 rounded-2xl p-3 max-h-[calc(100vh-40px)] overflow-y-auto no-scrollbar">
          <div className="px-2 pb-2 text-[10px] font-extrabold text-white/40 uppercase tracking-widest">
            Pantallas · Arranxos
          </div>
          {NAV_GROUPS.map((group) => (
            <div key={group.group} className="mb-1">
              <div className="px-2 pt-2 pb-1 text-[10px] font-bold text-white/35 uppercase tracking-wider">
                {group.group}
              </div>
              {group.screens.map((s) => {
                const active = pathname === s.href;
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    className={cn(
                      "block px-2 py-1.5 text-[12px] rounded-md transition",
                      active
                        ? "bg-white/10 text-white font-bold"
                        : "text-white/55 hover:text-white hover:bg-white/5 font-medium",
                    )}
                  >
                    {s.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* Phone */}
      <div className="relative">
        <div
            className={cn(
            "bg-white overflow-hidden flex flex-col relative min-h-0",
            // mobile = full viewport, desktop = phone frame
            "w-full h-full md:w-[390px] md:h-[min(844px,calc(100dvh-40px))] md:min-h-0 md:rounded-[50px]",
            "md:ring-2 md:ring-[#2a2a2a] md:ring-offset-[8px] md:ring-offset-black md:shadow-2xl",
          )}
        >
          {/* Notch (desktop only) */}
          <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-8 bg-black rounded-b-[20px] z-[100]" />
          <div className="flex-1 min-h-0 flex flex-col [&>*]:flex-1 [&>*]:min-h-0">
            {children}
          </div>
        </div>
        {/* Home indicator (desktop only) */}
        <div className="hidden md:block w-[134px] h-[5px] bg-white/30 rounded mx-auto mt-2.5" />
      </div>

      {/* Mobile nav drawer */}
      <button
        onClick={() => setNavOpen(true)}
        className="fixed bottom-4 left-4 lg:hidden z-[200] bg-ink-800 text-white rounded-full w-11 h-11 shadow-lg flex items-center justify-center"
        aria-label="Navegador de pantallas"
      >
        <Icon name="map" size={20} />
      </button>
      {navOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[300] lg:hidden"
          onClick={() => setNavOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-ink-900 rounded-t-3xl max-h-[75vh] overflow-y-auto animate-slideUp p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {NAV_GROUPS.map((group) => (
              <div key={group.group} className="mb-2">
                <div className="px-2 pt-2 pb-1 text-[11px] font-bold text-white/50 uppercase tracking-wider">
                  {group.group}
                </div>
                {group.screens.map((s) => (
                  <Link
                    key={s.href}
                    href={s.href}
                    onClick={() => setNavOpen(false)}
                    className="block px-3 py-2.5 text-[14px] rounded-lg text-white/80 hover:bg-white/10"
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
