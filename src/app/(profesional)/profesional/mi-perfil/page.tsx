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
import { getSeedCatalogServices, slugifyCatalogText } from "@/lib/catalog";
import { currentPro, reviews, defaultAdminConfig } from "@/lib/data";
import { useSession } from "@/lib/store";
import type { CatalogRequest, CatalogService, Professional } from "@/lib/types";

const catalogServices = getSeedCatalogServices();
const SPECIALTY_RADIUS_OPTIONS = [5, 10, 25, 50, 100] as const;
const POSTAL_CODE_LOOKUP = {
  "15824": { municipality: "O Pino", locality: "Boavista" },
  "15705": { municipality: "Santiago de Compostela", locality: "" },
  "15001": { municipality: "A Coruña", locality: "" },
  "36201": { municipality: "Vigo", locality: "" },
} as const;

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

type EditableSpecialty = {
  id: string;
  label: string;
  source: "catalog" | "legacy";
  categoryName?: string;
  serviceId?: string;
};

type WorkBaseDraft = {
  postalCode: string;
  municipality: string;
  locality: string;
  privateAddress: string;
};

export default function PerfilProPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ProfilePanelId | null>(null);
  const [savedSpecialties, setSavedSpecialties] = useState<EditableSpecialty[]>(() =>
    getInitialEditableSpecialties(currentPro),
  );
  const [specialtiesDraft, setSpecialtiesDraft] = useState<EditableSpecialty[]>(() =>
    getInitialEditableSpecialties(currentPro),
  );
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [savedWorkBase, setSavedWorkBase] = useState<WorkBaseDraft>(() =>
    getInitialWorkBase(currentPro),
  );
  const [workBaseDraft, setWorkBaseDraft] = useState<WorkBaseDraft>(() =>
    getInitialWorkBase(currentPro),
  );
  const [savedRadiusKm, setSavedRadiusKm] = useState(currentPro.radiusKm ?? 25);
  const [radiusDraft, setRadiusDraft] = useState(currentPro.radiusKm ?? 25);
  const [catalogRequests, setCatalogRequests] = useState<CatalogRequest[]>([]);
  const [catalogRequestFeedback, setCatalogRequestFeedback] = useState<string | null>(null);
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
  const displayedPrimarySpecialty = savedSpecialties[0]?.label ?? currentPro.specialty;
  const workBaseLookup = getWorkBaseLookup(workBaseDraft.postalCode);
  const normalizedSpecialtySearch = normalizeSpecialtySearch(specialtySearch.trim());
  const matchingCatalogServices = catalogServices
    .filter((service) => {
      if (!normalizedSpecialtySearch) return true;

      const haystack = [
        service.name,
        service.categoryName,
        ...(service.aliases ?? []),
      ]
        .map(normalizeSpecialtySearch)
        .join(" ");

      return haystack.includes(normalizedSpecialtySearch);
    });
  const specialtySuggestions = matchingCatalogServices
    .filter(
      (service) =>
        !specialtiesDraft.some(
          (selected) =>
            selected.serviceId === service.id ||
            normalizeSpecialtySearch(selected.label) === normalizeSpecialtySearch(service.name),
        ),
    )
    .slice(0, normalizedSpecialtySearch ? 8 : 6);
  const requestableSpecialtySearch = specialtySearch.trim();
  const canRequestNewSpecialty =
    requestableSpecialtySearch.length > 0 && matchingCatalogServices.length === 0;

  const syncSpecialtiesDraftFromSaved = () => {
    setSpecialtiesDraft(savedSpecialties);
    setWorkBaseDraft(savedWorkBase);
    setRadiusDraft(savedRadiusKm);
    setSpecialtySearch("");
    setSpecialtiesSaved(false);
    setCatalogRequestFeedback(null);
  };

  const openPanel = (panelId: ProfilePanelId) => {
    if (panelId === "specialties") {
      syncSpecialtiesDraftFromSaved();
    }
    setSettingsOpen(false);
    setActivePanel(panelId);
  };

  const addSpecialty = (service: CatalogService) => {
    setSpecialtiesSaved(false);
    setCatalogRequestFeedback(null);
    setSpecialtiesDraft((current) => [
      ...current,
      {
        id: `service-${service.id}`,
        label: service.name,
        source: "catalog",
        categoryName: service.categoryName,
        serviceId: service.id,
      },
    ]);
    setSpecialtySearch("");
  };

  const removeSpecialty = (specialtyId: string) => {
    setSpecialtiesSaved(false);
    setCatalogRequestFeedback(null);
    setSpecialtiesDraft((current) =>
      current.filter((specialty) => specialty.id !== specialtyId),
    );
  };

  const requestNewSpecialty = () => {
    const requestedName = requestableSpecialtySearch.trim();
    if (!requestedName) return;

    const normalizedRequestedName = normalizeSpecialtySearch(requestedName);
    const alreadyRequested = catalogRequests.some(
      (request) => normalizeSpecialtySearch(request.requestedName) === normalizedRequestedName,
    );

    if (alreadyRequested) {
      setCatalogRequestFeedback("Esta especialidad ya está solicitada en esta demo.");
      return;
    }

    const request: CatalogRequest = {
      id: `catalog-request-${slugifyCatalogText(requestedName)}-${Date.now()}`,
      requestedName,
      suggestedCategoryName: inferSuggestedCategoryName(requestedName),
      requestedByUserId: currentPro.id || "p1",
      requestedByName: currentPro.name,
      requestedByRole: "professional",
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    setCatalogRequests((current) => [request, ...current]);
    setCatalogRequestFeedback("Solicitud enviada a revisión en demo");
  };

  const saveSpecialties = () => {
    setSavedSpecialties(specialtiesDraft);
    setSavedWorkBase({
      postalCode: workBaseDraft.postalCode.trim(),
      municipality:
        workBaseDraft.municipality.trim() || currentPro.location || "Zona pendiente",
      locality: workBaseDraft.locality.trim(),
      privateAddress: workBaseDraft.privateAddress.trim(),
    });
    setSavedRadiusKm(radiusDraft);
    setSpecialtiesSaved(true);
  };

  const syncWorkBaseFromPostalCode = (postalCode: string) => {
    const lookup = getWorkBaseLookup(postalCode);

    setWorkBaseDraft((current) => ({
      ...current,
      postalCode,
      municipality: lookup?.municipality ?? current.municipality,
      locality: lookup?.locality ?? current.locality,
    }));
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
                {specialtiesDraft.map((specialty, index) => (
                  <div
                    key={specialty.id}
                    data-testid={`profile-specialty-chip-${slugifyCatalogText(specialty.label)}`}
                    className="inline-flex max-w-full items-center gap-2 rounded-full bg-coral-50 px-3 py-1.5 text-[12px] font-semibold text-coral-700"
                  >
                    <span className="truncate">
                      {specialty.label}
                      {index === 0 ? " · principal" : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSpecialty(specialty.id)}
                      className="rounded-full bg-coral-100 px-1.5 py-0.5 text-[10px] font-bold text-coral-700"
                      aria-label={`Quitar ${specialty.label}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {specialtiesDraft.length === 0 && (
                <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-[12px] text-amber-700 leading-snug">
                  Añade al menos una especialidad para que podamos recomendarte trabajos.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-ink-500">
                Buscar especialidad o servicio
              </label>
              <Input
                value={specialtySearch}
                onChange={(event) => {
                  setSpecialtiesSaved(false);
                  setCatalogRequestFeedback(null);
                  setSpecialtySearch(event.target.value);
                }}
                placeholder="Buscar especialidad o servicio"
                data-testid="profile-specialties-search"
                note="Puedes añadir varias especialidades. La primera seguirá siendo la principal en esta demo."
              />
              <div className="rounded-2xl border border-sand-200 bg-white overflow-hidden">
                {specialtySuggestions.length > 0 ? (
                  <div className="divide-y divide-sand-200/70">
                    {specialtySuggestions.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => addSpecialty(service)}
                        className="w-full px-4 py-3 text-left transition active:bg-sand-50"
                      >
                        <div className="font-semibold text-[13px] text-ink-800">
                          {service.name}
                        </div>
                        <div className="text-[11px] text-ink-400">
                          {service.categoryName}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : canRequestNewSpecialty ? (
                  <div className="px-4 py-3 text-[12px] leading-snug">
                    <div className="font-semibold text-ink-700">
                      No encontramos esa especialidad.
                    </div>
                    <div className="text-ink-400 mt-1">
                      Puedes solicitar que admin la revise.
                    </div>
                    <Button
                      full
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={requestNewSpecialty}
                      testId="request-new-specialty"
                    >
                      Solicitar nueva especialidad
                    </Button>
                  </div>
                ) : specialtySearch.trim() ? (
                  <div className="px-4 py-3 text-[12px] leading-snug">
                    <div className="font-semibold text-ink-700">
                      Ya tienes esa especialidad añadida o hay sugerencias equivalentes.
                    </div>
                    <div className="text-ink-400 mt-1">
                      Ajusta la búsqueda o revisa los chips seleccionados arriba.
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-3 text-[12px] text-ink-400 leading-snug">
                    Empieza a escribir para filtrar servicios o elige una sugerencia.
                  </div>
                )}
              </div>
              {catalogRequestFeedback && (
                <div
                  data-testid="catalog-request-feedback"
                  className={`rounded-2xl border px-3.5 py-3 text-[12px] font-semibold ${
                    catalogRequestFeedback.includes("ya está")
                      ? "border-amber-100 bg-amber-50 text-amber-700"
                      : "border-teal-100 bg-teal-50 text-teal-700"
                  }`}
                >
                  {catalogRequestFeedback}
                </div>
              )}
              {catalogRequests.length > 0 && (
                <div className="rounded-2xl border border-sand-200/70 bg-sand-50/70 p-3.5">
                  <div className="font-bold text-[13px] text-ink-800 mb-2">
                    Solicitudes enviadas
                  </div>
                  <div className="flex flex-col gap-2">
                    {catalogRequests.map((request) => (
                      <div
                        key={request.id}
                        data-testid={`catalog-request-${slugifyCatalogText(request.requestedName)}`}
                        className="rounded-2xl border border-sand-200/70 bg-white px-3.5 py-3"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-bold text-[12.5px] text-ink-800">
                            {request.requestedName}
                          </div>
                          <span className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Pendiente de revisión
                          </span>
                        </div>
                        <div className="text-[11.5px] text-ink-400 leading-snug">
                          {request.suggestedCategoryName
                            ? `Sugerencia: ${request.suggestedCategoryName} · `
                            : ""}
                          Creada ahora
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Input
              label="Código postal"
              value={workBaseDraft.postalCode}
              onChange={(event) => {
                setSpecialtiesSaved(false);
                syncWorkBaseFromPostalCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 5));
              }}
              placeholder="Ej. 15824"
              data-testid="profile-postal-code"
            />

            <Input
              label="Concello / municipio"
              value={workBaseDraft.municipality}
              onChange={(event) => {
                setSpecialtiesSaved(false);
                setWorkBaseDraft((current) => ({
                  ...current,
                  municipality: event.target.value,
                }));
              }}
              placeholder="Ej. O Pino"
              data-testid="profile-municipality"
            />

            <Input
              label="Localidad o lugar"
              value={workBaseDraft.locality}
              onChange={(event) => {
                setSpecialtiesSaved(false);
                setWorkBaseDraft((current) => ({
                  ...current,
                  locality: event.target.value,
                }));
              }}
              placeholder="Ej. Boavista"
              data-testid="profile-locality"
            />

            <Input
              label="Dirección o referencia privada"
              value={workBaseDraft.privateAddress}
              onChange={(event) => {
                setSpecialtiesSaved(false);
                setWorkBaseDraft((current) => ({
                  ...current,
                  privateAddress: event.target.value,
                }));
              }}
              placeholder="Ej. Boavista 9"
              data-testid="profile-private-address"
              note="La dirección privada no se muestra al cliente. Se usa para calcular trabajos cercanos y validar tu zona de servicio."
            />

            {workBaseDraft.postalCode.trim() && !workBaseLookup && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-[12px] text-amber-700 leading-snug">
                Código postal pendiente de validar en esta demo.
              </div>
            )}

            {workBaseLookup && (
              <div className="rounded-2xl border border-teal-100 bg-teal-50 px-3.5 py-3 text-[12px] text-teal-700 leading-snug">
                Base sugerida para {workBaseDraft.postalCode}: {workBaseLookup.municipality}
                {workBaseLookup.locality ? ` · ${workBaseLookup.locality}` : ""}
              </div>
            )}

            <div className="rounded-2xl border border-sand-200/70 bg-white p-3.5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-[13px] text-ink-800">
                    Radio de acción habitual
                  </div>
                  <div className="text-[11px] text-ink-400 leading-snug">
                    Ajuste local de demo. Todavía no modifica el matching de oportunidades.
                  </div>
                </div>
                <div className="rounded-full bg-coral-50 px-3 py-1 text-[12px] font-bold text-coral-700 whitespace-nowrap">
                  {radiusDraft} km
                </div>
              </div>
              <input
                type="range"
                min={SPECIALTY_RADIUS_OPTIONS[0]}
                max={SPECIALTY_RADIUS_OPTIONS[SPECIALTY_RADIUS_OPTIONS.length - 1]}
                step={5}
                value={radiusDraft}
                onChange={(event) => {
                  setSpecialtiesSaved(false);
                  setRadiusDraft(Number(event.target.value));
                }}
                className="w-full accent-[#FF5A5F]"
                aria-label="Radio de acción habitual"
                data-testid="profile-radius"
              />
              <div className="mt-3 flex items-center justify-between gap-2">
                {SPECIALTY_RADIUS_OPTIONS.map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => {
                      setSpecialtiesSaved(false);
                      setRadiusDraft(km);
                    }}
                    className={`min-w-[42px] rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                      radiusDraft === km
                        ? "bg-coral-50 text-coral-700"
                        : "bg-sand-100 text-ink-500"
                    }`}
                  >
                    {km}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-[12px] text-amber-700 leading-snug">
              La base de trabajo ya es usable en esta demo, pero todavía no cambia el matching real ni crea nuevas solicitudes de catálogo.
            </div>
            {specialtiesSaved && (
              <div className="rounded-2xl border border-teal-100 bg-teal-50 px-3.5 py-3 text-[12px] font-semibold text-teal-700">
                Especialidades y zona actualizadas en demo.
              </div>
            )}
            <Button
              full
              onClick={saveSpecialties}
              disabled={specialtiesDraft.length === 0}
              testId="profile-save-specialties"
            >
              Guardar cambios
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
                {displayedPrimarySpecialty} · {profileDraft.location}
              </div>
              <div className="mt-1 text-[11.5px] font-semibold text-ink-500">
                Base: {formatWorkBaseSummary(savedWorkBase, savedRadiusKm)}
              </div>
              {savedSpecialties.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {savedSpecialties.slice(0, 3).map((specialty) => (
                    <span
                      key={specialty.id}
                      className="rounded-full bg-sand-100 px-2 py-0.5 text-[10.5px] font-semibold text-ink-500"
                    >
                      {specialty.label}
                    </span>
                  ))}
                </div>
              )}
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
                  data-testid={item.panelId ? `profile-${item.panelId}` : undefined}
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
                  data-testid={item.panelId ? `profile-${item.panelId}` : undefined}
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

function normalizeSpecialtySearch(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getWorkBaseLookup(postalCode: string) {
  return POSTAL_CODE_LOOKUP[postalCode as keyof typeof POSTAL_CODE_LOOKUP];
}

function inferSuggestedCategoryName(requestedName: string) {
  const normalizedRequestedName = normalizeSpecialtySearch(requestedName);
  const categoryMatch = catalogServices.find((service) => {
    const normalizedCategory = normalizeSpecialtySearch(service.categoryName);
    return (
      normalizedCategory.includes(normalizedRequestedName) ||
      normalizedRequestedName.includes(normalizedCategory)
    );
  });

  return categoryMatch?.categoryName;
}

function getInitialWorkBase(professional: Professional): WorkBaseDraft {
  const normalizedLocation = normalizeSpecialtySearch(professional.location || "");

  if (normalizedLocation.includes("vigo")) {
    return {
      postalCode: "36201",
      municipality: "Vigo",
      locality: "",
      privateAddress: "",
    };
  }

  if (normalizedLocation.includes("coruna")) {
    return {
      postalCode: "15001",
      municipality: "A Coruña",
      locality: "",
      privateAddress: "",
    };
  }

  if (normalizedLocation.includes("santiago")) {
    return {
      postalCode: "15705",
      municipality: "Santiago de Compostela",
      locality: "",
      privateAddress: "",
    };
  }

  return {
    postalCode: "",
    municipality: professional.location || "",
    locality: "",
    privateAddress: "",
  };
}

function formatWorkBaseSummary(base: WorkBaseDraft, radiusKm: number) {
  const normalizedMunicipality = normalizeSpecialtySearch(base.municipality);
  const normalizedLocality = normalizeSpecialtySearch(base.locality);
  const locality =
    normalizedLocality && normalizedLocality !== normalizedMunicipality
      ? base.locality
      : "";
  const area = [locality, base.municipality].filter(Boolean).join(" · ");
  return `${area || "Zona pendiente"} · ${radiusKm} km`;
}

function getInitialEditableSpecialties(professional: Professional): EditableSpecialty[] {
  const seen = new Set<string>();

  return [professional.specialty, ...(professional.specialties ?? [])]
    .filter((value): value is string => Boolean(value))
    .filter((value) => {
      const normalized = normalizeSpecialtySearch(value);
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .map((value) => {
      const matchedService = catalogServices.find(
        (service) => normalizeSpecialtySearch(service.name) === normalizeSpecialtySearch(value),
      );

      if (matchedService) {
        return {
          id: `service-${matchedService.id}`,
          label: matchedService.name,
          source: "catalog" as const,
          categoryName: matchedService.categoryName,
          serviceId: matchedService.id,
        };
      }

      return {
        id: `legacy-${slugifyCatalogText(value)}`,
        label: value,
        source: "legacy" as const,
      };
    });
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
