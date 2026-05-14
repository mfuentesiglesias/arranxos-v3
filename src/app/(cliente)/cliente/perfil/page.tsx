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
import { Button } from "@/components/ui/button";
import { currentClient, jobs } from "@/lib/data";
import { useSession } from "@/lib/store";

type ClientProfilePanelId =
  | "payment_methods"
  | "saved_addresses"
  | "notifications"
  | "identity_verification"
  | "privacy_security"
  | "language_region"
  | "help"
  | "terms";

type ClientProfileAction = {
  label: string;
  icon: string;
  panelId?: ClientProfilePanelId;
  danger?: boolean;
  onClick?: () => void;
  testId?: string;
};

export default function PerfilClientePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ClientProfilePanelId | null>(null);
  const router = useRouter();
  const reset = useSession((s) => s.reset);
  const mine = jobs.filter((j) => j.clientId === "u1");
  const completed = mine.filter((j) => j.status === "completed").length;
  const active = mine.filter((j) =>
    ["in_progress", "escrow_funded", "agreed"].includes(j.status),
  ).length;

  const openPanel = (panelId: ClientProfilePanelId) => {
    setSettingsOpen(false);
    setActivePanel(panelId);
  };

  const sections: ClientProfileAction[][] = [
    [
      {
        label: "Métodos de pago",
        panelId: "payment_methods",
        icon: "card",
        testId: "client-profile-payment-methods",
      },
      {
        label: "Direcciones guardadas",
        panelId: "saved_addresses",
        icon: "pin",
        testId: "client-profile-saved-addresses",
      },
      {
        label: "Notificaciones",
        panelId: "notifications",
        icon: "bell",
      },
    ],
    [
      { label: "Verificación de identidad", panelId: "identity_verification", icon: "shield" },
      { label: "Privacidad y seguridad", panelId: "privacy_security", icon: "lock" },
      { label: "Idioma y región", panelId: "language_region", icon: "layers" },
    ],
    [
      {
        label: "Centro de ayuda",
        panelId: "help",
        icon: "info",
        testId: "client-profile-help",
      },
      { label: "Términos y privacidad", panelId: "terms", icon: "file" },
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
            onClick: () => openPanel("payment_methods"),
          },
          {
            label: "Privacidad y seguridad",
            description: "Revisa permisos, seguridad y datos del perfil.",
            icon: "lock",
            onClick: () => openPanel("privacy_security"),
          },
          {
            label: "Centro de ayuda",
            description: "Atajos de soporte y preguntas frecuentes.",
            icon: "info",
            onClick: () => openPanel("help"),
          },
        ]}
      />
      <HeaderActionSheet
        open={activePanel !== null}
        onClose={() => setActivePanel(null)}
        title={getClientProfilePanelTitle(activePanel)}
        description={getClientProfilePanelDescription(activePanel)}
      >
        {activePanel && (
          <div className="flex flex-col gap-3 pb-1">
            {getClientProfilePanelCards(activePanel).map((card) => (
              <InfoPanel key={card.title} title={card.title} body={card.body} muted={card.muted} />
            ))}
            <Button full variant="outline" onClick={() => setActivePanel(null)}>
              Cerrar
            </Button>
          </div>
        )}
      </HeaderActionSheet>
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
                    data-testid={item.testId}
                  >
                    {content}
                  </button>
                );
              }
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    if (item.panelId) {
                      openPanel(item.panelId);
                    }
                  }}
                  className="w-full text-left"
                  data-testid={item.testId}
                >
                  {content}
                </button>
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

function getClientProfilePanelTitle(panelId: ClientProfilePanelId | null) {
  return (
    {
      payment_methods: "Métodos de pago",
      saved_addresses: "Direcciones guardadas",
      notifications: "Notificaciones",
      identity_verification: "Verificación de identidad",
      privacy_security: "Privacidad y seguridad",
      language_region: "Idioma y región",
      help: "Centro de ayuda",
      terms: "Términos y privacidad",
    } satisfies Record<ClientProfilePanelId, string>
  )[panelId ?? "payment_methods"];
}

function getClientProfilePanelDescription(panelId: ClientProfilePanelId | null) {
  return (
    {
      payment_methods: "Sección demo para explicar cómo se gestionarán los cobros y pagos en la versión real.",
      saved_addresses: "Resumen demo de cómo guardarás ubicaciones habituales sin mostrar datos sensibles fuera de contexto.",
      notifications: "Preferencias demo para avisos de trabajos, chat, pagos y disputas.",
      identity_verification: "Explicación demo del proceso de confianza y validación futura de identidad.",
      privacy_security: "Resumen corto de ubicación exacta, anti-fuga y controles de privacidad dentro de Arranxos.",
      language_region: "Espacio demo para futuros ajustes de idioma y configuración regional.",
      help: "Ayuda rápida y soporte demo para resolver dudas frecuentes.",
      terms: "Texto demo orientativo, no documento legal definitivo.",
    } satisfies Record<ClientProfilePanelId, string>
  )[panelId ?? "payment_methods"];
}

function getClientProfilePanelCards(panelId: ClientProfilePanelId) {
  return (
    {
      payment_methods: [
        {
          title: "Pagos en la versión real",
          body: "Stripe y los pagos reales no están conectados todavía. Esta demo solo muestra el flujo visual de pago protegido.",
          muted: false,
        },
        {
          title: "Qué verás más adelante",
          body: "Métodos guardados, historial de cargos y control de pagos protegidos desde una sección segura de cuenta.",
          muted: true,
        },
      ],
      saved_addresses: [
        {
          title: "Direcciones guardadas",
          body: "En la versión real podrás guardar ubicaciones frecuentes para publicar más rápido sin reescribir cada zona.",
          muted: false,
        },
        {
          title: "Privacidad",
          body: "La dirección exacta solo se compartirá cuando el trabajo avance al estado adecuado. Antes de eso seguiremos usando ubicación aproximada.",
          muted: true,
        },
      ],
      notifications: [
        {
          title: "Avisos previstos",
          body: "Solicitudes nuevas, mensajes de chat, acuerdos, pagos protegidos, disputas y auto-release se podrán activar o silenciar por tipo.",
          muted: false,
        },
        {
          title: "Estado actual",
          body: "Esta sección es demo. Las notificaciones de la app siguen funcionando dentro de la sesión actual, pero aún no hay preferencias persistentes separadas por canal.",
          muted: true,
        },
      ],
      identity_verification: [
        {
          title: "Verificación futura",
          body: "Arranxos añadirá controles de identidad y confianza para determinados flujos, pero esta demo no solicita documentos reales.",
          muted: false,
        },
        {
          title: "Qué no pedimos ahora",
          body: "No subas documentación sensible en esta fase. El flujo actual es puramente visual y de prueba funcional.",
          muted: true,
        },
      ],
      privacy_security: [
        {
          title: "Ubicación y contacto",
          body: "La dirección exacta solo se revela al profesional aceptado. Además, el chat bloquea teléfonos, emails y enlaces externos.",
          muted: false,
        },
        {
          title: "Seguridad de la demo",
          body: "Todo vive en localStorage de esta demo. No hay backend real ni gestión de credenciales definitivas todavía.",
          muted: true,
        },
      ],
      language_region: [
        {
          title: "Idioma y región",
          body: "Más adelante podrás ajustar idioma principal, formatos locales y experiencia regional sin salir del perfil.",
          muted: false,
        },
        {
          title: "Cobertura actual",
          body: "La demo está centrada en flujos funcionales. La configuración de idioma/región sigue siendo orientativa.",
          muted: true,
        },
      ],
      help: [
        {
          title: "Ayuda demo",
          body: "Si estás probando la app, revisa primero publicación de trabajos, aceptación, chat, pago mock, disputa y valoración.",
          muted: false,
        },
        {
          title: "Soporte actual",
          body: "Usa esta demo para validar navegación móvil, estados y paneles. El soporte operativo real llegará con backend y canales definitivos.",
          muted: true,
        },
      ],
      terms: [
        {
          title: "Texto orientativo",
          body: "Los términos y la privacidad visibles en esta demo no son el documento legal final. Sirven para contextualizar el producto antes de la integración real.",
          muted: false,
        },
        {
          title: "Versión real",
          body: "Cuando Arranxos conecte backend, autenticación y pagos reales, esta sección deberá sustituirse por textos legales definitivos y versionados.",
          muted: true,
        },
      ],
    } satisfies Record<
      ClientProfilePanelId,
      Array<{ title: string; body: string; muted: boolean }>
    >
  )[panelId];
}

function InfoPanel({
  title,
  body,
  muted = false,
}: {
  title: string;
  body: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-3.5 py-3 ${
        muted
          ? "border-sand-200/70 bg-sand-50/70"
          : "border-sand-200/70 bg-white"
      }`}
    >
      <div className="font-bold text-[13px] text-ink-800 mb-1">{title}</div>
      <div className="text-[12px] leading-snug text-ink-500">{body}</div>
    </div>
  );
}
