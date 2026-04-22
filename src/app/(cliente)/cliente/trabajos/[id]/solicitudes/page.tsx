"use client";
import { use, useState } from "react";
import Link from "next/link";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { RatingStars } from "@/components/pros/rating-stars";
import { VerifiedDot } from "@/components/pros/verified-dot";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { jobs, professionals } from "@/lib/data";

interface Props {
  params: Promise<{ id: string }>;
}

export default function Page({ params }: Props) {
  const { id } = use(params);
  const job = jobs.find((j) => j.id === id) ?? jobs[0];
  const [sort, setSort] = useState<"relevant" | "rating" | "price">("relevant");
  const requestors = professionals
    .filter((p) => p.status === "approved")
    .slice(0, job.requests || 3);

  const sorted = [...requestors].sort((a, b) => {
    if (sort === "rating") return b.rating - a.rating;
    if (sort === "price") return (a.reviews ?? 0) - (b.reviews ?? 0);
    return 0;
  });

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title={`Solicitudes (${job.requests})`} subtitle={job.title} />
      <ScreenBody className="px-4 pt-3 pb-6">
        <div className="flex items-center gap-2 mb-3">
          {(["relevant", "rating", "price"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1.5 rounded-full text-[11.5px] font-bold border-[1.5px] ${
                sort === s
                  ? "border-coral-500 bg-coral-50 text-coral-700"
                  : "border-sand-200 text-ink-500 bg-white"
              }`}
            >
              {s === "relevant"
                ? "Relevancia"
                : s === "rating"
                ? "Mejor valorados"
                : "Más económicos"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          {sorted.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <Avatar initials={p.avatar} size={48} />
                  {p.verified && <VerifiedDot size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[14.5px] text-ink-800 truncate">
                    {p.name}
                  </div>
                  <div className="text-[12px] text-ink-500 mb-1">
                    {p.specialty} · {p.distance ?? p.location}
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <RatingStars value={p.rating} />
                    <span className="text-[11.5px] font-bold text-ink-800">
                      {p.rating.toFixed(1)}
                    </span>
                    <span className="text-[11px] text-ink-400">
                      ({p.reviews})
                    </span>
                  </div>
                  <div className="text-[12px] text-ink-600 bg-sand-50 rounded-lg p-2.5 border border-sand-200/70 mb-3 leading-relaxed">
                    “{p.bio?.slice(0, 110) ?? "Profesional disponible"}…”
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/profesional/perfil?id=${p.id}&jobId=${job.id}`}
                      className="text-center text-[12px] font-bold py-2.5 rounded-xl bg-sand-100 text-ink-700"
                    >
                      Ver perfil
                    </Link>
                    <Link
                      href={`/cliente/trabajos/${job.id}/aceptar?proId=${p.id}`}
                      className="text-center text-[12px] font-bold py-2.5 rounded-xl bg-coral-500 text-white shadow-coral"
                    >
                      Aceptar
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Link
          href={`/cliente/trabajos/${job.id}/invitaciones`}
          className="mt-4 flex items-center justify-center gap-1.5 text-[12.5px] font-bold text-coral-600 bg-coral-50 rounded-full py-2.5"
        >
          <Icon name="plus" size={14} stroke={2.5} />
          Invitar a otros profesionales
        </Link>
      </ScreenBody>
    </div>
  );
}
