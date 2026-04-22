"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type IconName =
  | "home"
  | "search"
  | "plus"
  | "briefcase"
  | "user"
  | "chat"
  | "map"
  | "settings"
  | "users";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  match?: string[];
}

export const NAV_CLIENT: NavItem[] = [
  { href: "/cliente/inicio", label: "Inicio", icon: "home" },
  { href: "/cliente/explorar", label: "Explorar", icon: "search" },
  { href: "/cliente/publicar", label: "Publicar", icon: "plus" },
  { href: "/cliente/trabajos", label: "Trabajos", icon: "briefcase", match: ["/cliente/trabajos"] },
  { href: "/cliente/perfil", label: "Perfil", icon: "user" },
];

export const NAV_PRO: NavItem[] = [
  { href: "/profesional/inicio", label: "Inicio", icon: "home" },
  { href: "/profesional/trabajos", label: "Trabajos", icon: "search" },
  { href: "/chat/j22", label: "Chat", icon: "chat", match: ["/chat"] },
  { href: "/profesional/pagos", label: "Pagos", icon: "briefcase" },
  { href: "/profesional/mi-perfil", label: "Perfil", icon: "user" },
];

export const NAV_ADMIN: NavItem[] = [
  { href: "/admin", label: "Panel", icon: "home" },
  { href: "/admin/profesionales", label: "Pros", icon: "users" },
  { href: "/admin/trabajos", label: "Trabajos", icon: "briefcase" },
  { href: "/admin/disputas", label: "Disputas", icon: "chat" },
  { href: "/admin/configuracion", label: "Ajustes", icon: "settings" },
];

interface Props {
  variant: "client" | "pro" | "admin";
}

export function BottomNav({ variant }: Props) {
  const pathname = usePathname();
  const items = variant === "client" ? NAV_CLIENT : variant === "pro" ? NAV_PRO : NAV_ADMIN;
  return (
    <div className="app-bottom-nav border-t border-sand-200 bg-white flex items-stretch flex-shrink-0 pt-1">
      {items.map((tab) => {
        const match = tab.match ?? [tab.href];
        const isActive = match.some((m) => pathname.startsWith(m));
        const isPlus = tab.icon === "plus";
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 transition",
              isActive ? "text-coral-600" : "text-ink-400",
            )}
          >
            {isPlus ? (
              <div
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center text-white -mt-5 shadow-coral",
                  isActive ? "bg-coral-500" : "bg-ink-800",
                )}
              >
                <Icon name="plus" size={24} stroke={2.5} />
              </div>
            ) : (
              <Icon name={tab.icon} size={22} stroke={2} />
            )}
            {!isPlus && (
              <span
                className={cn(
                  "text-[10px] tracking-tight",
                  isActive ? "font-bold" : "font-medium",
                )}
              >
                {tab.label}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
