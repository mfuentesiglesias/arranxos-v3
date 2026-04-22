"use client";
import { useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { RatingStars } from "@/components/pros/rating-stars";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { reviews } from "@/lib/data";

export default function AdminValoracionesPage() {
  const [filter, setFilter] = useState<"all" | "low" | "reported">("all");
  const [q, setQ] = useState("");

  const filtered = reviews.filter((r) => {
    const ms =
      filter === "all" ||
      (filter === "low" && r.rating <= 3) ||
      (filter === "reported" && r.text.length > 100);
    const mq = !q || r.text.toLowerCase().includes(q.toLowerCase()) || r.author.toLowerCase().includes(q.toLowerCase());
    return ms && mq;
  });

  const avg = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar
        title="Valoraciones"
        subtitle={`${reviews.length} reseñas · ${avg.toFixed(2)} media`}
      />
      <ScreenBody className="px-4 pt-3 pb-6">
        <div className="flex items-center gap-2 bg-white rounded-2xl px-3.5 py-2.5 mb-3 border border-sand-200/70">
          <Icon name="search" size={16} stroke={2.2} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar texto, autor…"
            className="flex-1 bg-transparent outline-none text-[14px] text-ink-800 placeholder:text-ink-400"
          />
        </div>
        <div className="flex gap-1.5 mb-3">
          {(
            [
              { id: "all", label: "Todas" },
              { id: "low", label: "≤ 3★" },
              { id: "reported", label: "Largas" },
            ] as const
          ).map((f) => {
            const sel = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold border-[1.5px] ${
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
          {filtered.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start gap-3 mb-2">
                <Avatar initials={r.avatar} size={36} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[13px] text-ink-800">
                      {r.author}
                    </span>
                    <span className="text-[10.5px] text-ink-400 ml-auto">
                      {r.date}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RatingStars value={r.rating} />
                    <span className="text-[11px] text-ink-400">
                      · {r.targetType === "professional" ? `Pro ${r.targetId}` : `Cliente ${r.targetId}`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-[12.5px] text-ink-600 leading-snug mb-3">
                “{r.text}”
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" full variant="outline">
                  Ocultar reseña
                </Button>
                <Button size="sm" full>
                  Marcar revisada
                </Button>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-ink-400 text-[12.5px]">
              Sin valoraciones en este filtro.
            </div>
          )}
        </div>
      </ScreenBody>
    </div>
  );
}
