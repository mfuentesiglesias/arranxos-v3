"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatusBar } from "@/components/layout/status-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { getCurrentProfile, type ApiProfile } from "@/lib/api/profiles";
import { isSupabaseMode } from "@/lib/supabase/config";
import {
  getAgreement,
  getCommissionAmount,
  getEffectiveFinalPrice,
} from "@/lib/domain/policies";
import {
  getEffectiveAdminConfig,
  getEffectiveDisputes,
  getEffectiveJobs,
  getEffectiveProfessionals,
  getEffectiveReviews,
  getEffectiveSearchTickets,
  useSession,
} from "@/lib/store";
import { formatEuro } from "@/lib/utils";

export default function AdminDashboard() {
  const [realProfile, setRealProfile] = useState<ApiProfile | null>(null);
  const session = useSession();
  const isSupabase = isSupabaseMode();
  const effectiveJobs = useMemo(() => getEffectiveJobs(session), [session]);
  const effectiveProfessionals = useMemo(() => getEffectiveProfessionals(session), [session]);
  const effectiveDisputes = useMemo(() => getEffectiveDisputes(session), [session]);
  const effectiveReviews = useMemo(() => getEffectiveReviews(session), [session]);
  const effectiveSearchTickets = useMemo(() => getEffectiveSearchTickets(session), [session]);
  const adminConfig = useSession(getEffectiveAdminConfig);

  const economicJobs = effectiveJobs.filter((job) =>
    [
      "agreed",
      "escrow_funded",
      "completed_pending_confirmation",
      "completed",
      "dispute",
    ].includes(job.status),
  );
  const totalCommission = economicJobs.reduce((acc, job) => {
    const agreement = getAgreement(session.agreements[job.id]);
    const finalPrice = getEffectiveFinalPrice(job, agreement);
    if (!finalPrice) return acc;

    const commissionPct = agreement?.commissionPct ?? job.commissionPct ?? adminConfig.commissionPct;
    return acc + getCommissionAmount({ amount: finalPrice, commissionPct });
  }, 0);
  const activeJobs = effectiveJobs.filter((j) =>
    [
      "published",
      "in_progress",
      "agreement_pending",
      "agreed",
      "escrow_funded",
      "completed_pending_confirmation",
    ].includes(j.status),
  ).length;
  const pendingPros = effectiveProfessionals.filter((p) => p.status === "pending").length;
  const blockedPros = effectiveProfessionals.filter((p) => p.status === "blocked").length;
  const openDisputes = effectiveDisputes.filter((d) => d.status === "open").length;
  const openTickets = effectiveSearchTickets.filter((t) => t.status === "open").length;

  const kpis = [
    {
      id: "commission",
      label: "Comisión generada mock",
      value: formatEuro(totalCommission),
      tone: "coral",
      icon: "euro",
    },
    {
      id: "active-jobs",
      label: "Trabajos activos",
      value: activeJobs,
      tone: "teal",
      icon: "briefcase",
    },
    {
      id: "pending-pros",
      label: "Pros pendientes",
      value: pendingPros,
      tone: "amber",
      icon: "users",
    },
    {
      id: "open-disputes",
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
    {
      href: "/admin/trabajos",
      label: "Trabajos",
      icon: "briefcase",
      sub: `${effectiveJobs.length} totales`,
    },
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
    {
      href: "/admin/valoraciones",
      label: "Valoraciones",
      icon: "star",
      sub: `${effectiveReviews.length} reseñas`,
    },
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
    {
      href: "/admin/catalogo",
      label: "Catálogo",
      icon: "layers",
      sub: "Categorías y servicios efectivos seed + admin",
    },
    {
      href: "/admin/economia",
      label: "Economía",
      icon: "euro",
      sub: "Acuerdos, custodia mock, comisión y neto profesional",
    },
    {
      href: "/admin/configuracion",
      label: "Configuración",
      icon: "settings",
      sub: `Comisión ${adminConfig.commissionPct}% · auto-release ${adminConfig.autoReleaseDays}d`,
    },
  ];

  const adminFirstName =
    isSupabase && realProfile
      ? realProfile.fullName.trim().split(/\s+/)[0] ?? null
      : null;
  const adminInitials =
    isSupabase && realProfile
      ? realProfile.avatarInitials ?? realProfile.fullName.trim().charAt(0).toUpperCase()
      : null;

  useEffect(() => {
    if (!isSupabase) {
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        const profile = await getCurrentProfile();
        if (!cancelled && profile) {
          setRealProfile(profile);
        }
      } catch {
        // Keep the current mock fallback if the real profile cannot be loaded.
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [isSupabase]);

  return (
    <div className="flex-1 flex flex-col">
      <StatusBar />
      <div className="bg-ink-900 text-white px-5 pt-3 pb-6 rounded-b-[28px]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] text-white/60 uppercase tracking-wide font-semibold">
              {adminFirstName ? `Arranxos · Admin · ${adminFirstName}` : "Arranxos · Admin"}
            </div>
            <div className="font-extrabold text-[20px]">Panel de control</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-coral-500 flex items-center justify-center">
            {adminInitials ? (
              <span className="text-[13px] font-extrabold text-white">{adminInitials}</span>
            ) : (
              <Icon name="shield" size={18} />
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {kpis.map((k) => (
            <div
              key={k.id}
              data-testid={
                k.id === "pending-pros"
                  ? "admin-kpi-pending-professionals"
                  : `admin-dashboard-kpi-${k.id}`
              }
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
                <div
                  className="text-[11px] text-ink-400 leading-snug"
                  data-testid={l.href === "/admin/profesionales" ? "admin-kpi-blocked-professionals" : undefined}
                >
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
