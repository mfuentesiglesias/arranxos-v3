"use client";
import { useMemo } from "react";
import Link from "next/link";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { chatMessages, jobs, professionals } from "@/lib/data";
import { scanLeaks, LEAK_LABELS } from "@/lib/anti-leak";

// DEMO: simulamos algunos flagged messages adicionales para la moderación
const EXTRA_FLAGGED = [
  {
    id: "mf1",
    jobId: "j7",
    text: "Si quieres te llamo al 612 345 678 y lo hablamos fuera.",
    from: "pro" as const,
    time: "ayer · 18:30",
  },
  {
    id: "mf2",
    jobId: "j12",
    text: "Mejor mándame un whatsapp al mio",
    from: "client" as const,
    time: "ayer · 20:05",
  },
  {
    id: "mf3",
    jobId: "j22",
    text: "Escríbeme a roi.miweb@gmail.com para enviarte fotos",
    from: "pro" as const,
    time: "hace 2 d",
  },
];

export default function AdminChatsPage() {
  const flagged = useMemo(() => {
    const fromSeed = chatMessages
      .filter((m) => m.flagged)
      .map((m) => ({ id: m.id, jobId: m.jobId, text: m.text, from: m.from as "pro" | "client", time: m.time }));
    return [...fromSeed, ...EXTRA_FLAGGED];
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Moderación de chats" subtitle={`${flagged.length} mensajes para revisar`} />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="bg-amber-50 border-amber-100 mb-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center">
              <Icon name="alert" size={16} />
            </div>
            <div className="text-[12px] text-amber-700 leading-snug">
              Mensajes detectados por el filtro anti-fuga. Revisa cada caso,
              aplica strikes si procede y cierra el aviso.
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-2">
          {flagged.map((m) => {
            const job = jobs.find((j) => j.id === m.jobId);
            const pro = job?.assignedProId
              ? professionals.find((p) => p.id === job.assignedProId)
              : null;
            const leaks = scanLeaks(m.text);
            const types = Array.from(new Set(leaks.map((l) => l.type)));
            return (
              <Card key={m.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {types.map((t) => LEAK_LABELS[t]).join(" · ") || "Sospechoso"}
                  </span>
                  <span className="text-[10.5px] text-ink-400 ml-auto">
                    {m.time}
                  </span>
                </div>
                <div className="text-[13px] text-ink-700 bg-sand-50 rounded-xl p-3 border border-sand-200/70 mb-3 leading-relaxed">
                  “{m.text}”
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar
                    initials={
                      m.from === "pro" && pro ? pro.avatar : job?.clientAvatar ?? "??"
                    }
                    size={32}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[12.5px] text-ink-800 truncate">
                      {m.from === "pro" && pro ? pro.name : job?.clientName ?? "Usuario"}
                    </div>
                    <div className="text-[11px] text-ink-400 truncate">
                      {m.from === "pro" ? "Profesional" : "Cliente"} · trabajo {m.jobId}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/chat/${m.jobId}`}
                    className="text-center text-[12px] font-bold py-2 rounded-xl bg-sand-100 text-ink-700"
                  >
                    Ver chat
                  </Link>
                  <button className="text-center text-[12px] font-bold py-2 rounded-xl bg-rose-500 text-white">
                    Aplicar strike
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </ScreenBody>
    </div>
  );
}
