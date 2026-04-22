"use client";
import { useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { disputes as seed, jobs } from "@/lib/data";
import type { Dispute } from "@/lib/types";

export default function AdminDisputasPage() {
  const [list, setList] = useState<Dispute[]>(seed);
  const resolve = (id: string, status: Dispute["status"]) =>
    setList((d) => d.map((x) => (x.id === id ? { ...x, status } : x)));

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Disputas" subtitle={`${list.length} abiertas`} />
      <ScreenBody className="px-4 pt-3 pb-6">
        <div className="flex flex-col gap-2">
          {list.map((d) => {
            const job = jobs.find((j) => j.id === d.jobId);
            const isOpen = d.status === "open" || d.status === "reviewing";
            return (
              <Card key={d.id}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {d.status === "open"
                      ? "Abierta"
                      : d.status === "reviewing"
                      ? "En revisión"
                      : d.status === "resolved_client"
                      ? "A favor cliente"
                      : d.status === "resolved_pro"
                      ? "A favor pro"
                      : "Dividida"}
                  </span>
                  <span className="text-[10.5px] text-ink-400 ml-auto">
                    Trabajo {d.jobId} · abre por {d.openedBy}
                  </span>
                </div>
                <div className="font-bold text-[14px] text-ink-800 mb-1 leading-tight">
                  {job?.title ?? d.reason}
                </div>
                <div className="text-[12.5px] text-ink-600 leading-snug mb-2">
                  <strong>Motivo:</strong> {d.reason}
                </div>
                <div className="text-[12px] text-ink-500 leading-snug mb-3 bg-sand-50 rounded-xl p-3 border border-sand-200/70">
                  {d.description}
                </div>
                {d.evidence && d.evidence.length > 0 && (
                  <div className="flex items-center gap-1.5 mb-3 text-[11.5px] text-ink-500">
                    <Icon name="image" size={14} />
                    {d.evidence.length} evidencia
                    {d.evidence.length === 1 ? "" : "s"} adjunta
                    {d.evidence.length === 1 ? "" : "s"}
                  </div>
                )}
                {isOpen ? (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        full
                        variant="outline"
                        onClick={() => resolve(d.id, "resolved_client")}
                      >
                        A favor cliente
                      </Button>
                      <Button
                        size="sm"
                        full
                        variant="outline"
                        onClick={() => resolve(d.id, "resolved_pro")}
                      >
                        A favor pro
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      full
                      onClick={() => resolve(d.id, "split")}
                    >
                      Dividir responsabilidad
                    </Button>
                  </div>
                ) : (
                  <div className="text-[11.5px] text-teal-700 font-semibold bg-teal-50 rounded-xl px-3 py-2">
                    Resuelta · pago procesado
                  </div>
                )}
              </Card>
            );
          })}
          {list.length === 0 && (
            <div className="text-center py-16 text-ink-400 text-[12.5px]">
              No hay disputas activas.
            </div>
          )}
        </div>
      </ScreenBody>
    </div>
  );
}
