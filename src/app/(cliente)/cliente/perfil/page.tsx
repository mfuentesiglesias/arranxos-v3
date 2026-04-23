"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeaderActionSheet } from "@/components/layout/header-action-sheet";
import { HeaderIconButton } from "@/components/layout/header-icon-button";
import { StatusBar } from "@/components/layout/status-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { currentClient, jobs } from "@/lib/data";
import { useSession } from "@/lib/store";

export default function PerfilClientePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const router = useRouter();
  const reset = useSession((s) => s.reset);
  const mine = jobs.filter((j) => j.clientId === "u1");
  const completed = mine.filter((j) => j.status === "completed").length;
  const active = mine.filter((j) =>
    ["in_progress", "escrow_funded", "agreed"].includes(j.status),
  ).length;

  const sections: { label: string; href?: string; icon: string; danger?: boolean; onClick?: () => void }[][] = [
    [
      { label: "Métodos de pago", href: "#", icon: "card" },
      { label: "Direcciones guardadas", href: "#", icon: "pin" },
      { label: "Notificaciones", href: "#", icon: "bell" },
    ],
    [
      { label: "Verificación de identidad", href: "#", icon: "shield" },
      { label: "Privacidad y seguridad", href: "#", icon: "lock" },
      { label: "Idioma y región", href: "#", icon: "layers" },
    ],
    [
      { label: "Centro de ayuda", href: "#", icon: "info" },
      { label: "Términos y privacidad", href: "#", icon: "file" },
    ],
    [
      {
        label: "Cerrar sesión",
        icon: "back",
        danger: true,
        onClick: () => {
          reset();
          router.push("/welcome");
        },
      },
    ],
  ];

  return (
    <div className="flex-1 flex flex-col">
      <StatusBar />
      <div className="bg-white border-b border-sand-200/70 px-5 pt-2 pb-3 flex items-center justify-between">
        <h1 className="font-extrabold text-[20px] text-ink-900 tracking-tight">
          Mi perfil
        </h1>
        <HeaderIconButton
          label="Abrir ajustes del perfil"
          onClick={() => setSettingsOpen(true)}
        >
          <Icon name="settings" size={16} />
        </HeaderIconButton>
      </div>
      <HeaderActionSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Ajustes del perfil"
        description="Accesos rápidos a las opciones más usadas en esta demo."
        items={[
          {
            label: "Métodos de pago",
            description: "Gestiona tus métodos guardados desde esta misma pantalla.",
            icon: "card",
          },
          {
            label: "Privacidad y seguridad",
            description: "Revisa permisos, seguridad y datos del perfil.",
            icon: "lock",
          },
          {
            label: "Centro de ayuda",
            description: "Atajos de soporte y preguntas frecuentes.",
            icon: "info",
          },
        ]}
      />
      <ScreenBody className="px-4 pt-4 pb-6">
        <Card className="mb-3">
          <div className="flex items-center gap-3 mb-4">
            <Avatar initials={currentClient.avatar} size={64} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-extrabold text-[18px] text-ink-900 truncate">
                  {currentClient.name}
                </div>
                {currentClient.verified && (
                  <span className="bg-teal-100 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Verificada
                  </span>
                )}
              </div>
              <div className="text-[12.5px] text-ink-500">
                {currentClient.email}
              </div>
              <div className="text-[11px] text-ink-400">
                Miembro desde {currentClient.memberSince}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Publicados", mine.length],
              ["Activos", active],
              ["Completados", completed],
            ].map(([l, v]) => (
              <div
                key={l}
                className="rounded-xl bg-sand-50 border border-sand-200/70 py-2.5"
              >
                <div className="font-extrabold text-[18px] text-ink-900">{v}</div>
                <div className="text-[10.5px] text-ink-400 font-semibold uppercase tracking-wide">
                  {l}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mb-3">
          <Link
            href="/cliente/publicar"
            className="flex items-center gap-3 py-1"
          >
            <div className="w-10 h-10 rounded-xl bg-coral-50 text-coral-600 flex items-center justify-center">
              <Icon name="plus" size={18} stroke={2.5} />
            </div>
            <div className="flex-1">
              <div className="font-bold text-[13.5px] text-ink-800">
                Publicar un trabajo
              </div>
              <div className="text-[11.5px] text-ink-400">
                Cuéntanos qué necesitas en 2 minutos
              </div>
            </div>
            <Icon name="forward" size={16} className="text-ink-400" />
          </Link>
        </Card>

        {sections.map((group, idx) => (
          <Card key={idx} className="mb-3 !p-0 overflow-hidden">
            {group.map((item, i) => {
              const content = (
                <div
                  className={`flex items-center gap-3 px-4 py-3.5 active:bg-sand-50 ${
                    i !== group.length - 1
                      ? "border-b border-sand-200/70"
                      : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      item.danger
                        ? "bg-rose-50 text-rose-600"
                        : "bg-sand-100 text-ink-600"
                    }`}
                  >
                    <Icon name={item.icon} size={14} />
                  </div>
                  <span
                    className={`flex-1 text-[13.5px] font-semibold ${
                      item.danger ? "text-rose-600" : "text-ink-800"
                    }`}
                  >
                    {item.label}
                  </span>
                  {!item.danger && (
                    <Icon name="forward" size={14} className="text-ink-400" />
                  )}
                </div>
              );
              if (item.onClick) {
                return (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className="w-full text-left"
                  >
                    {content}
                  </button>
                );
              }
              return (
                <Link key={item.label} href={item.href ?? "#"}>
                  {content}
                </Link>
              );
            })}
          </Card>
        ))}

        <div className="text-center text-[11px] text-ink-400 pt-2">
          Arranxos · v1.0 · DEMO
        </div>
      </ScreenBody>
    </div>
  );
}
