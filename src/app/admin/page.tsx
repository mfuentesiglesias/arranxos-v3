"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatusBar } from "@/components/layout/status-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import {
  getAdminDashboardKpis,
  type ApiAdminDashboardKpis,
} from "@/lib/api/adminDashboard";
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
  const [realKpis, setRealKpis] = useState<ApiAdminDashboardKpis | null>(null);
  const [realKpisLoading, setRealKpisLoading] = useState(false);
  const [realKpisError, setRealKpisError] = useState<string | null>(null);
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

  const mockKpis = [
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

  const supabaseKpis = realKpis
    ? [
        {
          id: "active-jobs",
          label: "Trabajos activos",
          value: realKpis.jobsActive,
          tone: "teal",
          icon: "briefcase",
        },
        {
          id: "pending-pros",
          label: "Pros pendientes",
          value: realKpis.professionalsPending,
          tone: "amber",
          icon: "users",
        },
        {
          id: "pending-flags",
          label: "Flags pendientes",
          value: realKpis.moderationFlagsPending,
          tone: "rose",
          icon: "alert",
        },
        {
          id: "open-disputes",
          label: "Disputas abiertas",
          value: realKpis.disputesOpen,
          tone: "coral",
          icon: "chat",
        },
      ] as const
    : null;

  const supabaseLoadingKpis = [
    {
      id: "active-jobs",
      label: "Trabajos activos",
      value: "--",
      tone: "teal",
      icon: "briefcase",
    },
    {
      id: "pending-pros",
      label: "Pros pendientes",
      value: "--",
      tone: "amber",
      icon: "users",
    },
    {
      id: "pending-flags",
      label: "Flags pendientes",
      value: "--",
      tone: "rose",
      icon: "alert",
    },
    {
      id: "open-disputes",
      label: "Disputas abiertas",
      value: "--",
      tone: "coral",
      icon: "alert",
    },
  ] as const;

  const kpis = isSupabase ? (supabaseKpis ?? supabaseLoadingKpis) : mockKpis;

  const links: { href: string; label: string; icon: string; sub: string; danger?: boolean }[] = [
    {
      href: "/admin/usuarios",
      label: "Usuarios",
      icon: "users",
      sub: isSupabase && realKpis
        ? `${realKpis.clientsCount} clientes · ${realKpis.profilesCount} perfiles`
        : isSupabase
          ? "Cargando datos reales..."
          : "Clientes",
    },
    {
      href: "/admin/profesionales",
      label: "Profesionales",
      icon: "users",
      sub: isSupabase && realKpis
        ? `${realKpis.professionalsPending} pendientes · ${realKpis.professionalsBlocked} bloqueados`
        : isSupabase
          ? "Cargando datos reales..."
          : `${pendingPros} pendientes · ${blockedPros} bloqueados`,
      danger: isSupabase ? Boolean(realKpis && realKpis.professionalsPending > 0) : pendingPros > 0,
    },
    {
      href: "/admin/trabajos",
      label: "Trabajos",
      icon: "briefcase",
      sub: isSupabase && realKpis
        ? `${realKpis.jobsTotal} totales · ${realKpis.jobsPublished} publicados`
        : isSupabase
          ? "Cargando datos reales..."
          : `${effectiveJobs.length} totales`,
    },
    {
      href: "/admin/solicitudes",
      label: "Solicitudes",
      icon: "briefcase",
      sub: isSupabase ? "Solicitudes reales por trabajo" : "Listado disponible en Supabase",
    },
    {
      href: "/admin/disputas",
      label: "Disputas",
      icon: "alert",
      sub: isSupabase && realKpis
        ? `${realKpis.disputesOpen} abiertas · ${realKpis.disputesResolved} resueltas`
        : isSupabase
          ? "Cargando datos reales..."
          : `${openDisputes} abiertas`,
      danger: isSupabase ? Boolean(realKpis && realKpis.disputesOpen > 0) : openDisputes > 0,
    },
    {
      href: "/admin/chats",
      label: "Moderación de chats",
      icon: "chat",
      sub: isSupabase && realKpis
        ? `${realKpis.moderationFlagsPending} pendientes · ${realKpis.moderationFlagsReviewed} revisadas`
        : isSupabase
          ? "Cargando datos reales..."
          : "Mensajes con strikes/leaks",
    },
    {
      href: "/admin/valoraciones",
      label: "Valoraciones",
      icon: "star",
      sub: isSupabase && realKpis
        ? `${realKpis.reviewsCount} reseñas · ${realKpis.reviewsAverageRating.toFixed(1)} media`
        : isSupabase
          ? "Cargando datos reales..."
          : `${effectiveReviews.length} reseñas`,
    },
    {
      href: "/admin/tickets-busqueda",
      label: "Tickets de búsqueda",
      icon: "search",
      sub: isSupabase ? "Flujo parcial / demo" : `${openTickets} sin cubrir`,
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
      sub: isSupabase ? "Auto-release manual real · resumen parcial" : "Acuerdos, custodia mock, comisión y neto profesional",
    },
    {
      href: "/admin/configuracion",
      label: "Configuración",
      icon: "settings",
      sub: isSupabase ? "Admin config real" : `Comisión ${adminConfig.commissionPct}% · auto-release ${adminConfig.autoReleaseDays}d`,
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

  useEffect(() => {
    if (!isSupabase) {
      return;
    }

    let cancelled = false;

    const loadKpis = async () => {
      setRealKpisLoading(true);
      setRealKpisError(null);

      try {
        const kpisResponse = await getAdminDashboardKpis();
        if (!cancelled) {
          setRealKpis(kpisResponse);
        }
      } catch (error) {
        if (!cancelled) {
          setRealKpis(null);
          setRealKpisError(
            error instanceof Error && error.message
              ? error.message
              : "No pudimos cargar los KPIs reales del dashboard.",
          );
        }
      } finally {
        if (!cancelled) {
          setRealKpisLoading(false);
        }
      }
    };

    void loadKpis();

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
        {isSupabase && (
          <Card className="mb-3 border-teal-100 bg-teal-50/40">
            <div className="font-bold text-[13px] text-teal-700 mb-1">Datos reales Supabase</div>
            <div className="text-[11.5px] text-teal-700/80 leading-snug">
              Este dashboard ya muestra KPIs reales basicos de profesionales, trabajos, moderacion, reviews y disputas. Economia, tickets y catalogo siguen parciales o demo.
            </div>
          </Card>
        )}

        {isSupabase && realKpisLoading && (
          <Card className="mb-3 text-[12px] text-ink-600 leading-snug">
            Estamos cargando los KPIs reales del dashboard.
          </Card>
        )}

        {isSupabase && realKpisError && (
          <Card className="mb-3 bg-rose-50 border-rose-100 text-[12px] text-rose-700 leading-snug">
            {realKpisError}
          </Card>
        )}

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
