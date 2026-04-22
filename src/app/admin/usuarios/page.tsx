"use client";
import { useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { currentClient, jobs } from "@/lib/data";

// DEMO: we only seed one client user. Build a small list for table-feel.
const USERS = [
  currentClient,
  { id: "u2", name: "Roi Castro Pérez", avatar: "RC", email: "roi.castro@email.com", location: "A Coruña", strikes: 0, jobsPublished: 4 },
  { id: "u3", name: "Helena Méndez", avatar: "HM", email: "helena.m@email.com", location: "Santiago", strikes: 0, jobsPublished: 2 },
  { id: "u4", name: "Noa Fernández", avatar: "NF", email: "noa.f@email.com", location: "Pontevedra", strikes: 1, jobsPublished: 6 },
  { id: "u5", name: "Martín Lage", avatar: "ML", email: "martin.l@email.com", location: "Vilagarcía", strikes: 0, jobsPublished: 1 },
  { id: "u6", name: "Clara Ribas", avatar: "CR", email: "clara.r@email.com", location: "Vigo", strikes: 0, jobsPublished: 3 },
  { id: "u7", name: "Iria Lorenzo", avatar: "IL", email: "iria.l@email.com", location: "Ourense", strikes: 2, jobsPublished: 5 },
];

export default function AdminUsuariosPage() {
  const [q, setQ] = useState("");
  const filtered = USERS.filter(
    (u) =>
      !q ||
      u.name.toLowerCase().includes(q.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(q.toLowerCase()) ||
      u.location.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Usuarios" subtitle={`${USERS.length} clientes`} />
      <ScreenBody className="px-4 pt-3 pb-6">
        <div className="flex items-center gap-2 bg-white rounded-2xl px-3.5 py-2.5 mb-3 border border-sand-200/70">
          <Icon name="search" size={16} stroke={2.2} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente…"
            className="flex-1 bg-transparent outline-none text-[14px] text-ink-800 placeholder:text-ink-400"
          />
        </div>
        <div className="flex flex-col gap-2">
          {filtered.map((u) => (
            <Card key={u.id} className="!p-3">
              <div className="flex items-center gap-3">
                <Avatar initials={u.avatar} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[13.5px] text-ink-800 truncate">
                    {u.name}
                  </div>
                  <div className="text-[11.5px] text-ink-500 truncate">
                    {u.email} · {u.location}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-ink-400">
                    {u.jobsPublished} trabajos
                  </div>
                  {(u.strikes ?? 0) > 0 && (
                    <div className="text-[11px] text-amber-700 font-bold">
                      ⚠ {u.strikes} strike{u.strikes === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-ink-400 text-[12.5px]">
              Sin resultados.
            </div>
          )}
        </div>
      </ScreenBody>
    </div>
  );
}
