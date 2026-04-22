"use client";
import { useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { jobs, defaultAdminConfig } from "@/lib/data";
import type { JobStatus } from "@/lib/types";
import { formatEuro } from "@/lib/utils";
import Link from "next/link";

const FILTERS: { id: JobStatus | "all"; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "published", label: "Publicados" },
  { id: "agreement_pending", label: "Negociando" },
  { id: "escrow_funded", label: "En custodia" },
  { id: "in_progress", label: "En curso" },
  { id: "completed", label: "Completados" },
  { id: "dispute", label: "Disputa" },
  { id: "cancelled", label: "Cancelados" },
];

export default function AdminTrabajosPage() {
  const [filter, setFilter] = useState<JobStatus | "all">("all");
  const [q, setQ] = useState("");

  const filtered = jobs.filter((j) => {
    const ms = filter === "all" || j.status === filter;
    const mq =
      !q ||
      j.title.toLowerCase().includes(q.toLowerCase()) ||
      j.location.toLowerCase().includes(q.toLowerCase()) ||
      j.clientName.toLowerCase().includes(q.toLowerCase());
    return ms && mq;
  });

  const totalValue = filtered.reduce(
    (acc, j) => acc + (j.priceMin + j.priceMax) / 2,
    0,
  );
  const commissionValue = Math.round(
    (totalValue * defaultAdminConfig.commissionPct) / 100,
  );

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Trabajos" subtitle={`${jobs.length} totales`} />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="mb-3 !p-3 bg-ink-900 text-white border-ink-900">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10.5px] text-white/60 uppercase tracking-wide font-semibold">
                Valor filtrado
              </div>
              <div className="font-extrabold text-[18px]">
                {formatEuro(totalValue)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10.5px] text-white/60 uppercase tracking-wide font-semibold">
                Comisión ({defaultAdminConfig.commissionPct}%)
              </div>
              <div className="font-extrabold text-[18px] text-coral-400">
                {formatEuro(commissionValue)}
              </div>
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-2 bg-white rounded-2xl px-3.5 py-2.5 mb-3 border border-sand-200/70">
          <Icon name="search" size={16} stroke={2.2} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título, cliente, zona…"
            className="flex-1 bg-transparent outline-none text-[14px] text-ink-800 placeholder:text-ink-400"
          />
        </div>

        <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide">
          {FILTERS.map((f) => {
            const sel = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border-[1.5px] whitespace-nowrap ${
                  sel
                    ? "border-coral-500 bg-coral-50 text-coral-700"
                    : "border-sand-200 text-ink-500 bg-white"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          {filtered.map((j) => (
            <Card key={j.id} className="!p-3">
              <div className="flex items-start gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] text-ink-400 font-bold">
                      {j.id}
                    </span>
                    <StatusBadge status={j.status} />
                  </div>
                  <div className="font-bold text-[13.5px] text-ink-800 truncate">
                    {j.title}
                  </div>
                  <div className="text-[11.5px] text-ink-500 truncate">
                    {j.category} · {j.location} · {j.clientName}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[12.5px] text-coral-600">
                    {formatEuro(j.priceMin)}–{formatEuro(j.priceMax)}
                  </div>
                  <div className="text-[10.5px] text-ink-400">{j.posted}</div>
                </div>
              </div>
              <Link
                href={`/cliente/trabajos/${j.id}`}
                className="text-[11.5px] font-bold text-coral-600 inline-flex items-center gap-1"
              >
                Ver detalle
                <Icon name="forward" size={12} stroke={2.5} />
              </Link>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-ink-400 text-[12.5px]">
              Sin trabajos en este filtro.
            </div>
          )}
        </div>
      </ScreenBody>
    </div>
  );
}
