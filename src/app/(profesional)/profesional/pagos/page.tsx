"use client";

import { StatusBar } from "@/components/layout/status-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { getCurrentProfessionalId, getEffectiveAdminConfig, getEffectiveJobs, useSession } from "@/lib/store";
import { formatEuro } from "@/lib/utils";

function calcPayout(priceMin: number, priceMax: number, commissionPct: number) {
  const total = Math.round((priceMin + priceMax) / 2);
  const commission = Math.round((total * commissionPct) / 100);
  return { total, commission, net: total - commission };
}

export default function PagosPage() {
  const adminConfig = useSession(getEffectiveAdminConfig);
  const currentProfessionalId = useSession(getCurrentProfessionalId);
  const jobs = useSession(getEffectiveJobs);

  const pending = jobs.filter(
    (j) =>
      (j.status === "escrow_funded" ||
        j.status === "in_progress" ||
        j.status === "completed_pending_confirmation") &&
      j.assignedProId === currentProfessionalId,
  );
  const released = jobs.filter(
    (j) => j.status === "completed" && j.assignedProId === currentProfessionalId,
  );

  const pendingTotal = pending.reduce(
    (acc, j) => acc + calcPayout(j.priceMin, j.priceMax, adminConfig.commissionPct).net,
    0,
  );
  const monthTotal = released.reduce(
    (acc, j) => acc + calcPayout(j.priceMin, j.priceMax, adminConfig.commissionPct).net,
    0,
  );

  return (
    <div className="flex-1 flex flex-col">
      <StatusBar />
      <div className="bg-white px-5 pt-2 pb-3 border-b border-sand-200/70">
        <h1 className="font-extrabold text-[20px] text-ink-900 tracking-tight">
          Pagos
        </h1>
      </div>
      <ScreenBody className="px-4 pt-4 pb-6">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Card className="!p-4">
            <div className="text-[10.5px] font-semibold text-ink-400 uppercase tracking-wide mb-0.5">
              En custodia
            </div>
            <div className="font-extrabold text-[20px] text-ink-900">
              {formatEuro(pendingTotal)}
            </div>
            <div className="text-[11px] text-ink-400">
              {pending.length} trabajo{pending.length === 1 ? "" : "s"}
            </div>
          </Card>
          <Card className="!p-4">
            <div className="text-[10.5px] font-semibold text-ink-400 uppercase tracking-wide mb-0.5">
              Liberado este mes
            </div>
            <div className="font-extrabold text-[20px] text-teal-600">
              {formatEuro(monthTotal)}
            </div>
            <div className="text-[11px] text-ink-400">
              {released.length} trabajo{released.length === 1 ? "" : "s"}
            </div>
          </Card>
        </div>

        <div className="text-[12px] font-bold text-ink-400 uppercase tracking-wide mb-2 px-1">
          Pendientes
        </div>
        <div className="flex flex-col gap-2 mb-4">
          {pending.length === 0 && (
            <Card className="text-[12.5px] text-ink-400 italic">
              No tienes pagos pendientes.
            </Card>
          )}
          {pending.map((j) => {
            const { total, commission, net } = calcPayout(
              j.priceMin,
              j.priceMax,
              adminConfig.commissionPct,
            );
            return (
              <Card key={j.id} className="!p-3.5">
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <Icon name="clock" size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[13.5px] text-ink-800 truncate">
                      {j.title}
                    </div>
                    <div className="text-[11px] text-ink-400">
                      {j.clientName} · {j.posted}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-[14px] text-ink-900">
                      {formatEuro(net)}
                    </div>
                    <div className="text-[10px] text-ink-400">
                      {formatEuro(total)} − {adminConfig.commissionPct}%
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="text-[12px] font-bold text-ink-400 uppercase tracking-wide mb-2 px-1">
          Historial
        </div>
        <div className="flex flex-col gap-2">
          {released.length === 0 && (
            <Card className="text-[12.5px] text-ink-400 italic">
              Sin pagos liberados todavía.
            </Card>
          )}
          {released.map((j) => {
            const { total, commission, net } = calcPayout(
              j.priceMin,
              j.priceMax,
              adminConfig.commissionPct,
            );
            return (
              <Card key={j.id} className="!p-3.5">
                <div className="flex items-start gap-2">
                  <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0">
                    <Icon name="check" size={14} stroke={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[13.5px] text-ink-800 truncate">
                      {j.title}
                    </div>
                    <div className="text-[11px] text-ink-400">
                      {j.clientName} · {j.posted}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-[14px] text-teal-600">
                      +{formatEuro(net)}
                    </div>
                    <div className="text-[10px] text-ink-400">
                      −{formatEuro(commission)} com.
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="mt-4 bg-sand-50 text-[11.5px] text-ink-500 leading-snug">
          La comisión de Arranxos ({adminConfig.commissionPct}%) se
          descuenta automáticamente antes de la liberación. Las transferencias
          llegan a tu cuenta bancaria en 1–3 días laborables.
        </Card>
      </ScreenBody>
    </div>
  );
}
