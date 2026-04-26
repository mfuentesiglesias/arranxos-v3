"use client";

import { useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { HeaderActionSheet } from "@/components/layout/header-action-sheet";
import { HeaderIconButton } from "@/components/layout/header-icon-button";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JobCard } from "@/components/jobs/job-card";
import { ProCard } from "@/components/pros/pro-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { getEffectiveNotifications, useSession } from "@/lib/store";
import {
  currentClient,
  jobs,
  professionals,
  categoryGroups,
} from "@/lib/data";
import Link from "next/link";

export default function HomeClientePage() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = useSession(getEffectiveNotifications);
  const myJobs = jobs.filter((j) => j.clientId === "u1").slice(0, 2);
  const topPros = professionals
    .filter((p) => p.status === "approved" && p.rating >= 4.7)
    .slice(0, 4);
  const unread = notifications.filter((n) => n.unread).length;
  const featured = categoryGroups[0].categories.slice(0, 8);

  return (
    <div className="flex-1 flex flex-col">
      <StatusBar />
      {/* Header */}
      <div className="px-5 pt-2 pb-4 bg-white border-b border-sand-200/70">
        <div className="flex items-center justify-between">
          <Link href="/cliente/perfil" className="flex items-center gap-3">
            <Avatar initials={currentClient.avatar} size={42} />
            <div>
              <div className="text-[12px] text-ink-400">Hola,</div>
              <div className="font-bold text-[15px] text-ink-900">
                {currentClient.name.split(" ")[0]}
              </div>
            </div>
          </Link>
          <HeaderIconButton
            label="Abrir notificaciones"
            onClick={() => setNotificationsOpen(true)}
            className="relative"
          >
            <Icon name="bell" size={20} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-coral-500 rounded-full ring-2 ring-white" />
            )}
          </HeaderIconButton>
        </div>
      </div>

      <HeaderActionSheet
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title="Notificaciones"
        description="Actividad reciente de tus trabajos y acuerdos."
        items={notifications.map((notification) => ({
          label: notification.text,
          description: `${notification.sub ?? ""} · ${notification.time}`,
          icon:
            notification.type === "request"
              ? "users"
              : notification.type === "agreement"
                ? "euro"
                : notification.type === "payment"
                  ? "shield"
                  : notification.type === "dispute"
                    ? "alert"
                    : "star",
          href: notification.jobId ? `/cliente/trabajos/${notification.jobId}` : undefined,
        }))}
      />

      <ScreenBody className="px-4 pt-4 pb-6">
        {/* Big CTA */}
        <Link
          href="/cliente/publicar"
          className="block rounded-3xl bg-gradient-to-br from-coral-600 to-coral-500 p-5 text-white shadow-coral mb-5 active:scale-[0.99] transition"
        >
          <div className="font-extrabold text-[20px] tracking-tight">
            ¿Qué necesitas hoy?
          </div>
          <div className="text-white/85 text-[13px] mt-1 mb-3">
            Publica tu trabajo en 2 minutos. Recibe propuestas en horas.
          </div>
          <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5 text-[13px] font-bold">
            Publicar trabajo
            <Icon name="forward" size={14} stroke={2.5} />
          </div>
        </Link>

        {/* Quick categories */}
        <SectionHeading title="Categorías populares" action="Ver todas" href="/cliente/explorar" />
        <div className="grid grid-cols-4 gap-2.5 mb-5">
          {featured.map((c) => (
            <Link
              key={c.id}
              href={`/cliente/publicar/servicio?cat=${c.id}`}
              className="flex flex-col items-center text-center gap-1.5"
            >
              <div className="w-14 h-14 rounded-2xl bg-white border border-sand-200/70 shadow-card flex items-center justify-center text-[24px]">
                {c.icon}
              </div>
              <span className="text-[10.5px] font-semibold text-ink-700 leading-tight">
                {c.name}
              </span>
            </Link>
          ))}
        </div>

        {/* Active jobs */}
        {myJobs.length > 0 && (
          <>
            <SectionHeading title="Tus trabajos activos" action="Ver todos" href="/cliente/trabajos" />
            <div className="flex flex-col gap-2.5 mb-5">
              {myJobs.map((j) => (
                <JobCard key={j.id} job={j} href={`/cliente/trabajos/${j.id}`} />
              ))}
            </div>
          </>
        )}

        {/* Top pros */}
        <SectionHeading title="Top profesionales cerca de ti" action="Ver mapa" href="/cliente/explorar" />
        <div className="flex flex-col gap-2.5 mb-5">
          {topPros.map((p) => (
            <ProCard key={p.id} pro={p} href={`/profesional/perfil?id=${p.id}`} />
          ))}
        </div>

        {/* Trust banner */}
        <Card className="bg-teal-50/50 border-teal-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center flex-shrink-0">
              <Icon name="shield" size={20} />
            </div>
            <div className="flex-1">
              <div className="font-bold text-[14px] text-teal-700">
                Pago protegido
              </div>
              <div className="text-[12px] text-teal-700/80 leading-snug">
                Retenemos tu pago hasta que confirmes. Si algo va mal, abres una
                disputa.
              </div>
            </div>
          </div>
        </Card>
      </ScreenBody>
    </div>
  );
}
