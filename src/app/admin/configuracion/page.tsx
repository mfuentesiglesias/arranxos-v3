"use client";

import { useEffect, useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getAdminConfig,
  updateAdminConfig,
  type ApiAdminConfig,
} from "@/lib/api/adminConfig";
import { getEffectiveAdminConfig, useSession } from "@/lib/store";
import { isSupabaseMode } from "@/lib/supabase/config";
import type { AdminConfig } from "@/lib/types";

function mapApiAdminConfigToDomain(config: ApiAdminConfig): AdminConfig {
  return {
    commissionPct: config.commissionPct,
    autoReleaseDays: config.autoReleaseDays,
    invitationLimitPerJob: config.invitationLimitPerJob,
    searchTicketNoResponseDays: config.searchTicketNoResponseDays,
    strikeAutoBlockThreshold: config.strikeAutoBlockThreshold,
    antiLeakEnabled: config.antiLeakEnabled,
    antiLeakRules: config.antiLeakRules,
  };
}

function validateConfig(config: AdminConfig): string | null {
  if (config.commissionPct < 0 || config.commissionPct > 100) {
    return "La comisión base debe estar entre 0 y 100.";
  }

  if (config.autoReleaseDays <= 0) {
    return "Los días para auto-liberación deben ser mayores que 0.";
  }

  if (config.invitationLimitPerJob <= 0) {
    return "El límite de invitaciones por trabajo debe ser mayor que 0.";
  }

  if (config.searchTicketNoResponseDays <= 0) {
    return "Los días sin respuesta para ticket deben ser mayores que 0.";
  }

  if (config.strikeAutoBlockThreshold <= 0) {
    return "Los strikes para bloqueo automático deben ser mayores que 0.";
  }

  if (typeof config.antiLeakEnabled !== "boolean") {
    return "El valor de anti-fuga activo no es válido.";
  }

  return null;
}

function SupabaseInner() {
  const [cfg, setCfg] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadConfig() {
      setLoading(true);
      setPageError(null);

      try {
        const config = await getAdminConfig();

        if (!isCancelled) {
          setCfg(mapApiAdminConfigToDomain(config));
        }
      } catch (error) {
        if (!isCancelled) {
          setCfg(null);
          setPageError(
            error instanceof Error && error.message
              ? error.message
              : "No pudimos cargar la configuración global real.",
          );
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void loadConfig();

    return () => {
      isCancelled = true;
    };
  }, []);

  const save = async () => {
    if (!cfg || saving) {
      return;
    }

    const validationError = validateConfig(cfg);
    if (validationError) {
      setSaveError(validationError);
      setSaved(false);
      return;
    }

    setSaveError(null);
    setSaved(false);
    setSaving(true);

    try {
      const updatedConfig = await updateAdminConfig({
        commissionPct: cfg.commissionPct,
        autoReleaseDays: cfg.autoReleaseDays,
        invitationLimitPerJob: cfg.invitationLimitPerJob,
        searchTicketNoResponseDays: cfg.searchTicketNoResponseDays,
        strikeAutoBlockThreshold: cfg.strikeAutoBlockThreshold,
        antiLeakEnabled: cfg.antiLeakEnabled,
      });

      setCfg(mapApiAdminConfigToDomain(updatedConfig));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (error) {
      setSaveError(
        error instanceof Error && error.message
          ? error.message
          : "No pudimos guardar la configuración global real.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Configuración" subtitle="Configuración global" />
      <ScreenBody className="px-4 pt-3 pb-6">
        {loading && (
          <Card className="mb-3 text-[12px] text-ink-600 leading-snug">
            Estamos cargando la configuración global real.
          </Card>
        )}

        {pageError && (
          <Card className="mb-3 bg-rose-50 border-rose-100 text-[12px] text-rose-700 leading-snug">
            {pageError}
          </Card>
        )}

        {saveError && (
          <Card className="mb-3 bg-rose-50 border-rose-100 text-[12px] text-rose-700 leading-snug">
            {saveError}
          </Card>
        )}

        {saved && (
          <Card className="mb-3 bg-teal-50 border-teal-100 text-[12px] text-teal-700 leading-snug">
            Configuración guardada correctamente.
          </Card>
        )}

        {cfg && (
          <>
            <Card className="bg-teal-50/40 border-teal-100 mb-3">
              <div className="text-[12px] text-teal-700 leading-snug">
                Esta configuración se guarda en la fila global real mediante RPC protegida.
              </div>
            </Card>

            <Card className="mb-3">
              <div className="font-bold text-[14px] text-ink-800 mb-3">Configuración global</div>
              <div className="flex flex-col gap-4">
                <Input
                  label="Comisión base (%)"
                  type="number"
                  min={0}
                  max={100}
                  value={String(cfg.commissionPct)}
                  onChange={(e) => setCfg({ ...cfg, commissionPct: Number(e.target.value) || 0 })}
                />
                <Input
                  label="Días para auto-liberación"
                  type="number"
                  min={1}
                  value={String(cfg.autoReleaseDays)}
                  onChange={(e) => setCfg({ ...cfg, autoReleaseDays: Number(e.target.value) || 1 })}
                />
                <Input
                  label="Límite de invitaciones por trabajo"
                  type="number"
                  min={1}
                  value={String(cfg.invitationLimitPerJob)}
                  onChange={(e) =>
                    setCfg({ ...cfg, invitationLimitPerJob: Number(e.target.value) || 1 })
                  }
                />
                <Input
                  label="Días sin respuesta para ticket"
                  type="number"
                  min={1}
                  value={String(cfg.searchTicketNoResponseDays)}
                  onChange={(e) =>
                    setCfg({ ...cfg, searchTicketNoResponseDays: Number(e.target.value) || 1 })
                  }
                />
                <Input
                  label="Strikes para bloqueo automático"
                  type="number"
                  min={1}
                  value={String(cfg.strikeAutoBlockThreshold)}
                  onChange={(e) =>
                    setCfg({ ...cfg, strikeAutoBlockThreshold: Number(e.target.value) || 1 })
                  }
                />
              </div>
            </Card>

            <Card className="mb-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-bold text-[14px] text-ink-800">Anti-fuga activo</div>
                  <div className="text-[11.5px] text-ink-400">
                    El detalle de reglas se mantiene estable y esta pantalla solo edita el estado global.
                  </div>
                </div>
                <Toggle on={cfg.antiLeakEnabled} onChange={(v) => setCfg({ ...cfg, antiLeakEnabled: v })} />
              </div>
              <div className="flex flex-col gap-2 pt-3 border-t border-sand-200/70">
                {(
                  [
                    ["phones", "Números de teléfono"],
                    ["emails", "Correos electrónicos"],
                    ["urls", "URLs y enlaces"],
                    ["whatsapp", "Menciones a WhatsApp / Telegram"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between text-[13px] text-ink-700">
                    <span>{label}</span>
                    <span className="text-[11.5px] text-ink-400">
                      {cfg.antiLeakRules[key] ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button full onClick={() => void save()} disabled={loading || saving || !cfg}>
          {saving ? "Guardando..." : saved ? "Guardado ✓" : "Guardar configuración"}
        </Button>
      </div>
    </div>
  );
}

function MockInner() {
  const effectiveConfig = useSession(getEffectiveAdminConfig);
  const setAdminConfig = useSession((s) => s.setAdminConfig);
  const [cfg, setCfg] = useState<AdminConfig>(effectiveConfig);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setCfg(effectiveConfig);
  }, [effectiveConfig]);

  const save = () => {
    setAdminConfig(cfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Configuración" subtitle="Parámetros globales de la plataforma" />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="bg-amber-50 border-amber-100 mb-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center text-[14px]">
              ⚠️
            </div>
            <div className="text-[12px] text-amber-700 leading-snug">
              DEMO: estos cambios se aplican solo en el estado local de la app.
              En producción, se guardarían en la configuración global real de
              Arranxos.
            </div>
          </div>
        </Card>

        <Card className="mb-3">
          <div className="font-bold text-[14px] text-ink-800 mb-3">Economía</div>
          <div className="flex flex-col gap-4">
            <Input
              label={`Comisión Arranxos (%) · actual ${cfg.commissionPct}%`}
              type="number"
              min={0}
              max={30}
              value={String(cfg.commissionPct)}
              onChange={(e) =>
                setCfg({ ...cfg, commissionPct: Number(e.target.value) || 0 })
              }
              note="Se aplica al importe acordado mock en cada trabajo de la demo."
            />
            <Input
              label="Días para auto-liberación mock del pago"
              type="number"
              min={1}
              max={30}
              value={String(cfg.autoReleaseDays)}
              onChange={(e) =>
                setCfg({ ...cfg, autoReleaseDays: Number(e.target.value) || 1 })
              }
              note="Si el cliente no confirma en este plazo tras el aviso del pro, en la demo se simula la liberación del pago mock."
            />
          </div>
        </Card>

        <Card className="mb-3">
          <div className="font-bold text-[14px] text-ink-800 mb-3">
            Reglas de plataforma
          </div>
          <div className="flex flex-col gap-4">
            <Input
              label="Máx. invitaciones por trabajo"
              type="number"
              min={1}
              max={50}
              value={String(cfg.invitationLimitPerJob)}
              onChange={(e) =>
                setCfg({
                  ...cfg,
                  invitationLimitPerJob: Number(e.target.value) || 1,
                })
              }
            />
            <Input
              label="Días sin respuesta útil para habilitar ticket"
              type="number"
              min={1}
              max={30}
              value={String(cfg.searchTicketNoResponseDays)}
              onChange={(e) =>
                setCfg({
                  ...cfg,
                  searchTicketNoResponseDays: Number(e.target.value) || 1,
                })
              }
              note="Si pasa este plazo tras invitar profesionales y no hay respuesta útil, el cliente puede abrir ticket de búsqueda."
            />
            <Input
              label="Umbral de strikes para bloqueo automático"
              type="number"
              min={1}
              max={10}
              value={String(cfg.strikeAutoBlockThreshold)}
              onChange={(e) =>
                setCfg({
                  ...cfg,
                  strikeAutoBlockThreshold: Number(e.target.value) || 1,
                })
              }
              note="Al llegar a este número, la cuenta queda suspendida pendiente de revisión."
            />
          </div>
        </Card>

        <Card className="mb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-bold text-[14px] text-ink-800">
                Anti-fuga de contactos
              </div>
              <div className="text-[11.5px] text-ink-400">
                Detecta y bloquea teléfonos, emails, URLs, redes sociales.
              </div>
            </div>
            <Toggle
              on={cfg.antiLeakEnabled}
              onChange={(v) => setCfg({ ...cfg, antiLeakEnabled: v })}
            />
          </div>
          {cfg.antiLeakEnabled && (
            <div className="flex flex-col gap-2 pt-3 border-t border-sand-200/70">
              {(
                [
                  ["phones", "Números de teléfono"],
                  ["emails", "Correos electrónicos"],
                  ["urls", "URLs y enlaces"],
                  ["whatsapp", "Menciones a WhatsApp / Telegram"],
                ] as const
              ).map(([k, label]) => (
                <div
                  key={k}
                  className="flex items-center justify-between"
                >
                  <div className="text-[13px] text-ink-700">{label}</div>
                  <Toggle
                    on={cfg.antiLeakRules[k]}
                    onChange={(v) =>
                      setCfg({
                        ...cfg,
                        antiLeakRules: { ...cfg.antiLeakRules, [k]: v },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button full onClick={save}>
          {saved ? "Guardado ✓" : "Guardar configuración"}
        </Button>
      </div>
    </div>
  );
}

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition ${
        on ? "bg-coral-500" : "bg-sand-300"
      }`}
      aria-pressed={on}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-card transition-transform ${
          on ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

export default function AdminConfiguracionPage() {
  if (isSupabaseMode()) {
    return <SupabaseInner />;
  }

  return <MockInner />;
}
