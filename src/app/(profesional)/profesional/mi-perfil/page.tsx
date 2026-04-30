"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { HeaderActionSheet } from "@/components/layout/header-action-sheet";
import { HeaderIconButton } from "@/components/layout/header-icon-button";
import { StatusBar } from "@/components/layout/status-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input, Textarea } from "@/components/ui/input";
import { RatingStars } from "@/components/pros/rating-stars";
import { StrikeBadge } from "@/components/pros/strike-badge";
import { currentPro, reviews, defaultAdminConfig } from "@/lib/data";
import { useSession } from "@/lib/store";

type ProfilePanelId =
  | "edit"
  | "specialties"
  | "banking"
  | "verification"
  | "notifications"
  | "language"
  | "help"
  | "terms"
  | "reviews";

type ProfilePanelAction = {
  label: string;
  icon: string;
  panelId?: ProfilePanelId;
  danger?: boolean;
  onClick?: () => void;
};

export default function PerfilProPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ProfilePanelId | null>(null);
  const [profileDraft, setProfileDraft] = useState({
    name: currentPro.name,
    bio: currentPro.bio ?? "",
    location: currentPro.zone ?? currentPro.location,
  });
  const [editSaved, setEditSaved] = useState(false);
  const [specialtiesSaved, setSpecialtiesSaved] = useState(false);
  const [bankingSaved, setBankingSaved] = useState(false);
  const [verificationRequested, setVerificationRequested] = useState(false);
  const [language, setLanguage] = useState<"es" | "gl">("es");
  const [notificationPrefs, setNotificationPrefs] = useState({
    jobs: true,
    messages: true,
    payments: true,
  });
  const router = useRouter();
  const reset = useSession((s) => s.reset);
  const myReviews = reviews
    .filter((r) => r.targetId === "p1")
    .slice(0, 3);
  const specialtyList = [currentPro.specialty, ...(currentPro.specialties ?? [])].filter(
    (value, index, values) => values.indexOf(value) === index,
  );

  const openPanel = (panelId: ProfilePanelId) => {
    setSettingsOpen(false);
    setActivePanel(panelId);
  };

  const sections: ProfilePanelAction[][] = [
    [
      { label: "Editar perfil público", icon: "edit", panelId: "edit" },
      { label: "Especialidades y zonas", icon: "pin", panelId: "specialties" },
      { label: "Cuenta bancaria", icon: "card", panelId: "banking" },
    ],
    [
      { label: "Verificación de identidad", icon: "shield", panelId: "verification" },
      { label: "Notificaciones", icon: "bell", panelId: "notifications" },
      { label: "Idioma y región", icon: "layers", panelId: "language" },
    ],
    [
      { label: "Centro de ayuda", icon: "info", panelId: "help" },
      { label: "Términos y privacidad", icon: "file", panelId: "terms" },
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
          label="Abrir ajustes del perfil profesional"
          onClick={() => setSettingsOpen(true)}
        >
          <Icon name="settings" size={16} />
        </HeaderIconButton>
      </div>

      <HeaderActionSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Ajustes del perfil profesional"
        description="Accesos rápidos a la configuración más habitual en esta demo."
        items={[
          {
            label: "Especialidades y zonas",
            description: "Actualiza lo que muestras a clientes y admin.",
            icon: "pin",
            onClick: () => openPanel("specialties"),
          },
          {
            label: "Cuenta bancaria",
            description: "Revisa la cuenta donde recibirás las liberaciones.",
            icon: "card",
            onClick: () => openPanel("banking"),
          },
          {
            label: "Notificaciones",
            description: "Controla avisos de trabajos, mensajes y pagos.",
            icon: "bell",
            onClick: () => openPanel("notifications"),
          },
          {
            label: "Centro de ayuda",
            description: "Atajos de soporte y recursos para profesionales.",
            icon: "info",
            onClick: () => openPanel("help"),
          },
        ]}
      />

      <HeaderActionSheet
        open={activePanel !== null}
        onClose={() => setActivePanel(null)}
        title={getPanelTitle(activePanel)}
        description={getPanelDescription(activePanel)}
      >
        {activePanel === "edit" && (
          <div className="flex flex-col gap-4 pb-1">
            <Input
              label="Nombre profesional"
              value={profileDraft.name}
              onChange={(event) => {
                setEditSaved(false);
                setProfileDraft((current) => ({ ...current, name: event.target.value }));
              }}
              placeholder="Tu nombre visible"
            />
            <Textarea
              label="Bio pública"
              value={profileDraft.bio}
              onChange={(event) => {
                setEditSaved(false);
                setProfileDraft((current) => ({ ...current, bio: event.target.value }));
              }}
              placeholder="Cuéntales a los clientes en qué destacas"
              rows={5}
            />
            <Input
              label="Ubicación visible"
              value={profileDraft.location}
              onChange={(event) => {
                setEditSaved(false);
                setProfileDraft((current) => ({ ...current, location: event.target.value }));
              }}
              placeholder="Zona principal donde trabajas"
            />
            <div className="rounded-2xl border border-sand-200/70 bg-sand-50/70 px-3.5 py-3 text-[12px] text-ink-500 leading-snug">
              Esta edición es local a la demo. No cambia todavía la ficha pública real ni el store global.
            </div>
            {editSaved && (
              <div className="rounded-2xl border border-teal-100 bg-teal-50 px-3.5 py-3 text-[12px] font-semibold text-teal-700">
                Cambios guardados en demo.
              </div>
            )}
            <Button
              full
              onClick={() => {
                setEditSaved(true);
              }}
            >
              Guardar cambios
            </Button>
          </div>
        )}

        {activePanel === "specialties" && (
          <div className="flex flex-col gap-4 pb-1">
            <div className="rounded-2xl border border-sand-200/70 bg-sand-50/70 p-3.5">
              <div className="font-bold text-[13px] text-ink-800 mb-2">
                Especialidades actuales
              </div>
              <div className="flex flex-wrap gap-2">
                {specialtyList.map((specialty) => (
                  <span
                    key={specialty}
                    className="rounded-full bg-coral-50 px-3 py-1.5 text-[12px] font-bold text-coral-700"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-2xl border border-sand-200/70 bg-white px-3.5 py-3">
                <div className="text-ink-400 font-semibold uppercase tracking-wide text-[10.5px] mb-1">
                  Zona visible
                </div>
                <div className="font-bold text-ink-800">{currentPro.zone ?? currentPro.location}</div>
              </div>
              <div className="rounded-2xl border border-sand-200/70 bg-white px-3.5 py-3">
                <div className="text-ink-400 font-semibold uppercase tracking-wide text-[10.5px] mb-1">
                  Radio actual
                </div>
                <div className="font-bold text-ink-800">
                  {currentPro.radiusKm ? `${currentPro.radiusKm} km` : "Pendiente"}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-[12px] text-amber-700 leading-snug">
              La edición avanzada de especialidades, zonas y radio se conectará en una siguiente fase sin tocar todavía el matching ni el catálogo.
            </div>
            {specialtiesSaved && (
              <div className="rounded-2xl border border-teal-100 bg-teal-50 px-3.5 py-3 text-[12px] font-semibold text-teal-700">
                Preferencias revisadas en demo.
              </div>
            )}
            <Button
              full
              variant="outline"
              onClick={() => {
                setSpecialtiesSaved(true);
              }}
            >
              Editar especialidades
            </Button>
          </div>
        )}

        {activePanel === "banking" && (
          <div className="flex flex-col gap-4 pb-1">
            <div className="rounded-2xl border border-sand-200/70 bg-white p-3.5">
              <div className="font-bold text-[13px] text-ink-800 mb-1">
                Estado de cobros
              </div>
              <div className="text-[12px] text-ink-500 leading-snug">
                Cuenta preparada para cobrar tras completar la verificación y cerrar trabajos con pago protegido.
              </div>
            </div>
            <div className="rounded-2xl border border-sand-200/70 bg-sand-50/70 p-3.5 text-[12px] text-ink-500 leading-snug">
              Tus datos fiscales y bancarios serán privados y solo se usarán para pagos, facturación y revisiones internas de Arranxos.
            </div>
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-2xl border border-sand-200/70 bg-white px-3.5 py-3">
                <div className="text-ink-400 font-semibold uppercase tracking-wide text-[10.5px] mb-1">
                  Cuenta bancaria
                </div>
                <div className="font-bold text-ink-800">Pendiente</div>
              </div>
              <div className="rounded-2xl border border-sand-200/70 bg-white px-3.5 py-3">
                <div className="text-ink-400 font-semibold uppercase tracking-wide text-[10.5px] mb-1">
                  Datos fiscales
                </div>
                <div className="font-bold text-ink-800">No añadidos</div>
              </div>
            </div>
            {bankingSaved && (
              <div className="rounded-2xl border border-teal-100 bg-teal-50 px-3.5 py-3 text-[12px] font-semibold text-teal-700">
                Solicitud de alta iniciada en demo.
              </div>
            )}
            <Button
              full
              onClick={() => {
                setBankingSaved(true);
              }}
            >
              Añadir datos
            </Button>
          </div>
        )}

        {activePanel === "verification" && (
          <div className="flex flex-col gap-4 pb-1">
            <div className="rounded-2xl border border-teal-100 bg-teal-50 p-3.5">
              <div className="font-bold text-[13px] text-teal-700 mb-1">
                Estado actual
              </div>
              <div className="text-[12px] text-teal-700/90 leading-snug">
                {currentPro.verified
                  ? "Tu perfil aparece como verificado en esta demo."
                  : "Tu perfil todavía no está marcado como verificado."}
              </div>
            </div>
            <div className="rounded-2xl border border-sand-200/70 bg-white p-3.5">
              <div className="font-bold text-[13px] text-ink-800 mb-2">
                Checklist mock
              </div>
              <div className="flex flex-col gap-2 text-[12px] text-ink-600">
                <ChecklistRow label="Identidad profesional" status="ok" />
                <ChecklistRow label="Experiencia y perfil público" status="ok" />
                <ChecklistRow label="Seguro o documentación adicional" status="pending" />
              </div>
            </div>
            {verificationRequested && (
              <div className="rounded-2xl border border-teal-100 bg-teal-50 px-3.5 py-3 text-[12px] font-semibold text-teal-700">
                Solicitud de revisión enviada en demo.
              </div>
            )}
            <Button
              full
              variant="outline"
              onClick={() => {
                setVerificationRequested(true);
              }}
            >
              Solicitar revisión
            </Button>
          </div>
        )}

        {activePanel === "notifications" && (
          <div className="flex flex-col gap-3 pb-1">
            <MockToggleRow
              label="Avisos de trabajos"
              description="Nuevas oportunidades y cambios de estado."
              value={notificationPrefs.jobs}
              onToggle={() =>
                setNotificationPrefs((current) => ({ ...current, jobs: !current.jobs }))
              }
            />
            <MockToggleRow
              label="Mensajes y chat"
              description="Alertas de negociación, seguimiento y respuestas."
              value={notificationPrefs.messages}
              onToggle={() =>
                setNotificationPrefs((current) => ({
                  ...current,
                  messages: !current.messages,
                }))
              }
            />
            <MockToggleRow
              label="Pagos y liberaciones"
              description="Cobros protegidos, confirmaciones y auto-liberación."
              value={notificationPrefs.payments}
              onToggle={() =>
                setNotificationPrefs((current) => ({
                  ...current,
                  payments: !current.payments,
                }))
              }
            />
            <div className="rounded-2xl border border-sand-200/70 bg-sand-50/70 px-3.5 py-3 text-[12px] text-ink-500 leading-snug">
              Estos ajustes son mock y solo viven dentro de esta sesión visual.
            </div>
          </div>
        )}

        {activePanel === "language" && (
          <div className="flex flex-col gap-3 pb-1">
            {[
              {
                id: "es" as const,
                label: "Español",
                description: "Idioma principal actual de la demo.",
              },
              {
                id: "gl" as const,
                label: "Galego",
                description: "Selección local mientras completamos traducciones.",
              },
            ].map((option) => {
              const active = language === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setLanguage(option.id)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-coral-500 bg-coral-50 text-coral-700"
                      : "border-sand-200 bg-white text-ink-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-[13px]">{option.label}</div>
                      <div className={`text-[11.5px] mt-0.5 ${active ? "text-coral-600" : "text-ink-400"}`}>
                        {option.description}
                      </div>
                    </div>
                    {active && <Icon name="check" size={16} className="text-coral-600" />}
                  </div>
                </button>
              );
            })}
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-[12px] text-amber-700 leading-snug">
              Próximamente añadiremos cobertura más completa de idioma y región en toda la app.
            </div>
          </div>
        )}

        {activePanel === "help" && (
          <div className="flex flex-col gap-3 pb-1">
            <InfoPanel
              title="Ayuda rápida"
              body="Responde pronto, evita compartir datos fuera del chat y revisa los pagos protegidos antes de marcar un trabajo como terminado."
            />
            <InfoPanel
              title="Soporte demo"
              body="Si algo no encaja en esta maqueta, usa este panel como referencia. La conexión con soporte real llegará en una fase posterior."
            />
            <InfoPanel
              title="Recursos próximos"
              body="Centro de ayuda, FAQs y contacto directo aparecerán aquí sin salir de la experiencia móvil."
              muted
            />
          </div>
        )}

        {activePanel === "terms" && (
          <div className="flex flex-col gap-3 pb-1">
            <InfoPanel
              title="Términos de uso"
              body="Arranxos actúa como plataforma de conexión y pago protegido. Los acuerdos, estados y revisiones de esta demo son representaciones funcionales, no un contrato real."
            />
            <InfoPanel
              title="Privacidad"
              body="Los datos fiscales, bancarios y de contacto se tratarán con acceso restringido. En esta fase todavía no se están solicitando datos sensibles reales."
            />
          </div>
        )}

        {activePanel === "reviews" && (
          <div className="flex flex-col gap-3 pb-1">
            {reviews.filter((review) => review.targetId === "p1").map((review) => (
              <div
                key={review.id}
                className="rounded-2xl border border-sand-200/70 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Avatar initials={review.avatar} size={28} />
                  <div className="font-bold text-[12.5px] text-ink-800">{review.author}</div>
                  <span className="ml-auto text-[10.5px] text-ink-400">{review.date}</span>
                </div>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <RatingStars value={review.rating} />
                </div>
                <div className="text-[12px] text-ink-600 leading-snug">{review.text}</div>
              </div>
            ))}
          </div>
        )}
      </HeaderActionSheet>

      <ScreenBody className="px-4 pt-4 pb-6">
        <Card className="mb-3">
          <div className="flex items-start gap-3 mb-4">
            <div className="relative">
              <Avatar initials={currentPro.avatar} size={68} />
              {currentPro.verified && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-teal-500 text-white border-2 border-white flex items-center justify-center text-[10px] font-bold">
                  ✓
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-[17px] text-ink-900 truncate">
                {profileDraft.name}
              </div>
              <div className="text-[12.5px] text-ink-500">
                {currentPro.specialty} · {profileDraft.location}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <RatingStars value={currentPro.rating} />
                <span className="text-[12px] font-bold text-ink-800">
                  {currentPro.rating.toFixed(1)}
                </span>
                <span className="text-[11px] text-ink-400">
                  ({currentPro.reviews})
                </span>
              </div>
              {currentPro.badge && (
                <span className="inline-block mt-1.5 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {currentPro.badge}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Trabajos", currentPro.jobs],
              ["Fiabilidad", `${currentPro.reliability}%`],
              ["Respuesta", currentPro.responseTime],
            ].map(([l, v]) => (
              <div
                key={String(l)}
                className="rounded-xl bg-sand-50 border border-sand-200/70 py-2.5"
              >
                <div className="font-extrabold text-[14px] text-ink-900">{v}</div>
                <div className="text-[10px] text-ink-400 font-semibold uppercase tracking-wide">
                  {l}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="font-bold text-[13px] text-ink-800">
              Reputación interna
            </div>
            <StrikeBadge strikes={currentPro.strikes ?? 0} />
          </div>
          <div className="text-[12px] text-ink-500 leading-snug">
            {currentPro.strikes === 0
              ? "Sin incidencias. Sigue así."
              : `Tienes ${currentPro.strikes} strike${currentPro.strikes === 1 ? "" : "s"} acumulados. Al alcanzar ${defaultAdminConfig.strikeAutoBlockThreshold}, la cuenta puede ser revisada por admin.`}
          </div>
        </Card>

        {profileDraft.bio && (
          <Card className="mb-3">
            <div className="font-bold text-[13px] text-ink-800 mb-2">
              Sobre mí
            </div>
            <div className="text-[13px] text-ink-600 leading-relaxed">
              {profileDraft.bio}
            </div>
          </Card>
        )}

        {myReviews.length > 0 && (
          <Card className="mb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-[13px] text-ink-800">
                Reseñas recientes
              </div>
              <button
                type="button"
                onClick={() => openPanel("reviews")}
                className="text-[12px] text-coral-600 font-bold"
              >
                Ver todas
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {myReviews.map((r) => (
                <div
                  key={r.id}
                  className="border-t border-sand-200/70 pt-3 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Avatar initials={r.avatar} size={28} />
                    <div className="font-bold text-[12.5px] text-ink-800">
                      {r.author}
                    </div>
                    <span className="text-[10.5px] text-ink-400 ml-auto">
                      {r.date}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <RatingStars value={r.rating} />
                  </div>
                  <div className="text-[12px] text-ink-600 leading-snug">
                    {r.text}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

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
                    type="button"
                    onClick={item.onClick}
                    className="w-full text-left"
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

function getPanelTitle(panelId: ProfilePanelId | null) {
  return (
    {
      edit: "Editar perfil",
      specialties: "Especialidades y zonas",
      banking: "Cuenta bancaria y fiscal",
      verification: "Verificación",
      notifications: "Notificaciones",
      language: "Idioma y región",
      help: "Centro de ayuda",
      terms: "Términos y privacidad",
      reviews: "Todas las reseñas",
    } satisfies Record<ProfilePanelId, string>
  )[panelId ?? "edit"];
}

function getPanelDescription(panelId: ProfilePanelId | null) {
  return (
    {
      edit: "Actualiza la información visible del profesional dentro de esta demo.",
      specialties: "Resumen mock de cómo presentas servicios, zona y radio de trabajo.",
      banking: "Estado orientativo de cobros y privacidad fiscal, sin pedir datos reales todavía.",
      verification: "Checklist mock de revisión profesional y documentación.",
      notifications: "Preferencias locales para avisos de trabajos, mensajes y pagos.",
      language: "Selección visual de idioma mientras completamos cobertura multilenguaje.",
      help: "Recursos rápidos y soporte orientativo para la demo.",
      terms: "Resumen corto de privacidad y términos sin salir de la pantalla.",
      reviews: "Vista ampliada de las valoraciones recientes del profesional.",
    } satisfies Record<ProfilePanelId, string>
  )[panelId ?? "edit"];
}

function ChecklistRow({
  label,
  status,
}: {
  label: string;
  status: "ok" | "pending";
}) {
  const active = status === "ok";

  return (
    <div className="flex items-center gap-2 rounded-xl border border-sand-200/70 bg-sand-50/70 px-3 py-2.5">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full text-white ${
          active ? "bg-teal-500" : "bg-amber-500"
        }`}
      >
        <Icon name={active ? "check" : "clock"} size={12} stroke={2.5} />
      </div>
      <div className="flex-1 text-[12px] font-semibold text-ink-700">{label}</div>
      <div className={`text-[11px] font-bold ${active ? "text-teal-700" : "text-amber-700"}`}>
        {active ? "Completo" : "Pendiente"}
      </div>
    </div>
  );
}

function MockToggleRow({
  label,
  description,
  value,
  onToggle,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-sand-200/70 bg-white px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <div className="font-bold text-[13px] text-ink-800">{label}</div>
        <div className="mt-0.5 text-[11.5px] leading-snug text-ink-400">{description}</div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative h-6 w-11 rounded-full transition ${
          value ? "bg-coral-500" : "bg-sand-300"
        }`}
        aria-pressed={value}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-card transition-transform ${
            value ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
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
