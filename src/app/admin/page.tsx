import Link from "next/link";
import { StatusBar } from "@/components/layout/status-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import {
  jobs,
  professionals,
  disputes,
  searchTickets,
  defaultAdminConfig,
  reviews,
} from "@/lib/data";
import { formatEuro } from "@/lib/utils";

export default function AdminDashboard() {
  const totalCommission = jobs
    .filter((j) => j.status === "completed")
    .reduce((acc, j) => {
      const total = (j.priceMin + j.priceMax) / 2;
      return acc + Math.round((total * defaultAdminConfig.commissionPct) / 100);
    }, 0);
  const activeJobs = jobs.filter((j) =>
    [
      "published",
      "in_progress",
      "agreement_pending",
      "agreed",
      "escrow_funded",
      "completed_pending_confirmation",
    ].includes(j.status),
  ).length;
  const pendingPros = professionals.filter((p) => p.status === "pending").length;
  const blockedPros = professionals.filter((p) => p.status === "blocked").length;
  const openDisputes = disputes.filter((d) => d.status === "open").length;
  const openTickets = searchTickets.filter((t) => t.status === "open").length;

  const kpis = [
    {
      label: "Comisión generada",
      value: formatEuro(totalCommission),
      tone: "coral",
      icon: "euro",
    },
    {
      label: "Trabajos activos",
      value: activeJobs,
      tone: "teal",
      icon: "briefcase",
    },
    {
      label: "Pros pendientes",
      value: pendingPros,
      tone: "amber",
      icon: "users",
    },
    {
      label: "Disputas abiertas",
      value: openDisputes,
      tone: "rose",
      icon: "alert",
    },
  ] as const;

  const links: { href: string; label: string; icon: string; sub: string; danger?: boolean }[] = [
    { href: "/admin/usuarios", label: "Usuarios", icon: "users", sub: "Clientes" },
    {
      href: "/admin/profesionales",
      label: "Profesionales",
      icon: "users",
      sub: `${pendingPros} pendientes · ${blockedPros} bloqueados`,
      danger: pendingPros > 0,
    },
    { href: "/admin/trabajos", label: "Trabajos", icon: "briefcase", sub: `${jobs.length} totales` },
    {
      href: "/admin/disputas",
      label: "Disputas",
      icon: "alert",
      sub: `${openDisputes} abiertas`,
      danger: openDisputes > 0,
    },
    {
      href: "/admin/chats",
      label: "Moderación de chats",
      icon: "chat",
      sub: "Mensajes con strikes/leaks",
    },
    { href: "/admin/valoraciones", label: "Valoraciones", icon: "star", sub: `${reviews.length} reseñas` },
    {
      href: "/admin/tickets-busqueda",
      label: "Tickets de búsqueda",
      icon: "search",
      sub: `${openTickets} sin cubrir`,
    },
    {
      href: "/admin/solicitudes-catalogo",
      label: "Solicitudes de catálogo",
      icon: "layers",
      sub: "Revisar nuevas especialidades propuestas por profesionales",
    },
    { href: "/admin/configuracion", label: "Configuración", icon: "settings", sub: `Comisión ${defaultAdminConfig.commissionPct}% · auto-release ${defaultAdminConfig.autoReleaseDays}d` },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <StatusBar />
      <div className="bg-ink-900 text-white px-5 pt-3 pb-6 rounded-b-[28px]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] text-white/60 uppercase tracking-wide font-semibold">
              Arranxos · Admin
            </div>
            <div className="font-extrabold text-[20px]">Panel de control</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-coral-500 flex items-center justify-center">
            <Icon name="shield" size={18} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="bg-white/5 backdrop-blur rounded-2xl px-3 py-2.5 border border-white/10"
            >
              <div className="flex items-center gap-2 text-[10px] text-white/60 font-semibold uppercase tracking-wide mb-1">
                <Icon name={k.icon} size={12} />
                {k.label}
              </div>
              <div className="font-extrabold text-[18px]">{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      <ScreenBody className="px-4 pt-4 pb-6">
        <div className="grid grid-cols-2 gap-2">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              <Card className="!p-3.5 hover:shadow-cardHover transition h-full">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      l.danger ? "bg-rose-50 text-rose-600" : "bg-sand-100 text-ink-600"
                    }`}
                  >
                    <Icon name={l.icon} size={16} />
                  </div>
                  {l.danger && (
                    <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      !
                    </span>
                  )}
                </div>
                <div className="font-bold text-[13px] text-ink-800">{l.label}</div>
                <div className="text-[11px] text-ink-400 leading-snug">
                  {l.sub}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </ScreenBody>
    </div>
  );
}
