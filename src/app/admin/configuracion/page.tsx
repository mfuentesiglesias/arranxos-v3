"use client";
import { useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { defaultAdminConfig } from "@/lib/data";
import type { AdminConfig } from "@/lib/types";

export default function AdminConfiguracionPage() {
  const [cfg, setCfg] = useState<AdminConfig>(defaultAdminConfig);
  const [saved, setSaved] = useState(false);

  const save = () => {
    // DEMO: en producción, esto persistiría en tabla admin_config con RLS.
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
              DEMO: cambios no persisten. En producción, estos valores se
              guardarán en Supabase (<code>admin_config</code>) con reglas de
              acceso restringidas a admins.
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
              note="Se aplica al importe acordado en cada trabajo."
            />
            <Input
              label="Días para auto-liberación del pago"
              type="number"
              min={1}
              max={30}
              value={String(cfg.autoReleaseDays)}
              onChange={(e) =>
                setCfg({ ...cfg, autoReleaseDays: Number(e.target.value) || 1 })
              }
              note="Si el cliente no confirma en este plazo tras el aviso del pro, se libera el pago."
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
