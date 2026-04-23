"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { HeaderActionSheet } from "@/components/layout/header-action-sheet";
import { HeaderIconButton } from "@/components/layout/header-icon-button";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { RatingStars } from "@/components/pros/rating-stars";
import { StrikeBadge } from "@/components/pros/strike-badge";
import { professionals, reviews } from "@/lib/data";
import { formatEuro } from "@/lib/utils";

function Inner() {
  const [shareOpen, setShareOpen] = useState(false);
  const params = useSearchParams();
  const id = params.get("id") ?? "p1";
  const jobId = params.get("jobId");
  const pro = professionals.find((p) => p.id === id) ?? professionals[0];
  const proReviews = reviews.filter((r) => r.targetId === pro.id);

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar
        title="Perfil profesional"
        right={
          <HeaderIconButton
            label="Abrir opciones para compartir perfil"
            onClick={() => setShareOpen(true)}
          >
            <Icon name="share" size={16} />
          </HeaderIconButton>
        }
      />
      <HeaderActionSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Compartir perfil"
        description="Fallback ligero mientras no conectamos compartir nativo real."
        items={[
          {
            label: "Copiar enlace del perfil",
            description: "Disponible como acción nativa en la siguiente iteración.",
            icon: "share",
          },
          {
            label: "Volver al trabajo",
            description: jobId ? "Regresa al detalle del trabajo actual." : "No hay trabajo vinculado en esta vista.",
            icon: "briefcase",
            href: jobId ? `/cliente/trabajos/${jobId}` : undefined,
          },
        ]}
      />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="mb-3">
          <div className="flex items-start gap-3 mb-3">
            <div className="relative">
              <Avatar initials={pro.avatar} size={68} />
              {pro.verified && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-teal-500 text-white border-2 border-white flex items-center justify-center text-[10px] font-bold">
                  ✓
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-[17px] text-ink-900 truncate">
                {pro.name}
              </div>
              <div className="text-[12.5px] text-ink-500 mb-1">
                {pro.specialty} · {pro.location}
              </div>
              <div className="flex items-center gap-1.5">
                <RatingStars value={pro.rating} />
                <span className="text-[12px] font-bold text-ink-800">
                  {pro.rating.toFixed(1)}
                </span>
                <span className="text-[11px] text-ink-400">
                  ({pro.reviews} reseñas)
                </span>
              </div>
              {pro.badge && (
                <span className="inline-block mt-1.5 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {pro.badge}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Trabajos", pro.jobs ?? 0],
              ["Fiabilidad", `${pro.reliability ?? 0}%`],
              ["Respuesta", pro.responseTime],
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

        {pro.bio && (
          <Card className="mb-3">
            <div className="font-bold text-[13px] text-ink-800 mb-2">
              Sobre {pro.name.split(" ")[0]}
            </div>
            <div className="text-[13px] text-ink-600 leading-relaxed">
              {pro.bio}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-[12px]">
              <div className="bg-sand-50 rounded-lg px-3 py-2 border border-sand-200/70">
                <div className="text-[10.5px] text-ink-400 font-semibold uppercase tracking-wide">
                  Zona
                </div>
                <div className="font-bold text-ink-800">
                  {pro.zone ?? pro.location}
                </div>
              </div>
              <div className="bg-sand-50 rounded-lg px-3 py-2 border border-sand-200/70">
                <div className="text-[10.5px] text-ink-400 font-semibold uppercase tracking-wide">
                  Precio medio
                </div>
                <div className="font-bold text-ink-800">{pro.avgPrice ?? "—"}</div>
              </div>
            </div>
          </Card>
        )}

        <Card className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="font-bold text-[13px] text-ink-800">Confianza</div>
            <StrikeBadge strikes={pro.strikes ?? 0} />
          </div>
          <div className="text-[12px] text-ink-500 leading-snug">
            En Arranxos desde {pro.since}. Cumple plazos en{" "}
            <strong>{pro.completedOnTime ?? 95}%</strong> de los trabajos.
          </div>
        </Card>

        {proReviews.length > 0 && (
          <Card className="mb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-[13px] text-ink-800">
                Reseñas ({proReviews.length})
              </div>
              <button className="text-[12px] text-coral-600 font-bold">
                Ver todas
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {proReviews.map((r) => (
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

        <Card className="bg-amber-50/60 border-amber-100 mb-2">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center text-[14px]">
              ⚠️
            </div>
            <div className="text-[12px] text-amber-700 leading-snug">
              Contacto y dirección exactos solo se comparten al aceptar al
              profesional. Mantén la conversación dentro del chat de Arranxos.
            </div>
          </div>
        </Card>
      </ScreenBody>

      {jobId && (
        <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70 grid grid-cols-2 gap-2">
          <Button full variant="outline" href={`/cliente/trabajos/${jobId}`}>
            Volver
          </Button>
          <Button full href={`/cliente/trabajos/${jobId}/aceptar?proId=${pro.id}`}>
            Aceptar
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div />}>
      <Inner />
    </Suspense>
  );
}
