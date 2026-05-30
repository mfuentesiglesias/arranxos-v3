"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { professionals } from "@/lib/data";
import { getProfessionalReliabilitySummary } from "@/lib/reliability";
import { getEffectiveJobs, getReviewsForProfessional, useSession } from "@/lib/store";

function Inner() {
  const session = useSession();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const params = useSearchParams();
  const id = params?.get("id") ?? "p1";
  const jobId = params?.get("jobId");
  const pro = professionals.find((p) => p.id === id) ?? professionals[0];
  const mockProReviews = session.reviews.filter(
    (review) => review.targetId === pro.id && review.targetType === "professional",
  );
  const proReviews = useMemo(() => getReviewsForProfessional(session, pro.id), [session, pro.id]);
  const reliabilitySummary = useMemo(
    () =>
      getProfessionalReliabilitySummary({
        professional: pro,
        reviews: proReviews,
        jobs: getEffectiveJobs(session),
        disputes: session.disputes,
      }),
    [pro, proReviews, session],
  );
  const displayedRating =
    mockProReviews.length > 0 && proReviews.length > 0
      ? proReviews.reduce((total, review) => total + review.rating, 0) / proReviews.length
      : pro.rating;
  const displayedReviewCount = mockProReviews.length > 0 ? proReviews.length : pro.reviews;

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
            description: "Acción demo: copia la URL actual del perfil en tu dispositivo.",
            icon: "share",
            onClick: async () => {
              const url = typeof window !== "undefined" ? window.location.href : "";
              try {
                if (navigator?.clipboard?.writeText) {
                  await navigator.clipboard.writeText(url);
                }
                setShareNotice("Enlace copiado (demo).");
              } catch {
                setShareNotice("No se pudo copiar automáticamente. Copia manualmente la URL.");
              }
            },
          },
          {
            label: "Volver al trabajo",
            description: jobId ? "Regresa al detalle del trabajo actual." : "No hay trabajo vinculado en esta vista.",
            icon: "briefcase",
            href: jobId ? `/cliente/trabajos/${jobId}` : undefined,
            onClick: jobId
              ? undefined
              : () => setShareNotice("Esta vista demo no tiene un trabajo vinculado."),
          },
        ]}
      />
      <ScreenBody className="px-4 pt-3 pb-6">
        {shareNotice && (
          <Card className="mb-3 bg-teal-50/60 border-teal-100 text-[12px] text-teal-700 leading-snug">
            {shareNotice}
          </Card>
        )}
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
                  {displayedRating.toFixed(1)}
                </span>
                <span className="text-[11px] text-ink-400">
                  ({displayedReviewCount} reseñas)
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
              ["Fiabilidad", `${reliabilitySummary.score}/100`],
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
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="font-bold text-[13px] text-ink-800">Fiabilidad</div>
              <div className="mt-0.5 text-[11.5px] text-ink-400">
                Score público demo derivado para esta simulación.
              </div>
            </div>
            <div className="text-right">
              <div
                className="font-extrabold text-[22px] leading-none text-ink-900"
                data-testid="public-professional-reliability-score"
              >
                {reliabilitySummary.score}
              </div>
              <div
                className={`mt-1 text-[11px] font-bold uppercase tracking-wide ${getReliabilityLabelClassName(reliabilitySummary.label)}`}
                data-testid="public-professional-reliability-label"
              >
                {getReliabilityLabelText(reliabilitySummary.label)}
              </div>
            </div>
          </div>
          <div className="text-[12px] text-ink-600 leading-snug">
            {reliabilitySummary.reviewCount} reseñas demo, media de {reliabilitySummary.averageRating.toFixed(1)} y {reliabilitySummary.completedJobs} trabajos completados en la simulación.
          </div>
          <div className="mt-2 text-[11.5px] text-ink-400 leading-snug">
            Cancelados: {reliabilitySummary.cancelledJobs} · Disputas abiertas: {reliabilitySummary.openDisputes} · Resueltas contra el pro: {reliabilitySummary.resolvedAgainstPro}
          </div>
        </Card>

        <Card className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="font-bold text-[13px] text-ink-800">Confianza</div>
            <StrikeBadge strikes={pro.strikes ?? 0} />
          </div>
          <div className="text-[12px] text-ink-500 leading-snug">
            Datos simulados de confianza en esta demo: en Dersux desde {pro.since}
            y cumplimiento estimado del <strong>{pro.completedOnTime ?? 95}%</strong>.
          </div>
        </Card>

        {proReviews.length > 0 && (
          <Card className="mb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-[13px] text-ink-800">
                Reseñas ({proReviews.length})
              </div>
              <button
                type="button"
                className="text-[12px] text-coral-600 font-bold"
                onClick={() => setShowAllReviews((current) => !current)}
                data-testid="public-profile-toggle-reviews"
              >
                {showAllReviews ? "Ver menos" : "Ver todas"}
              </button>
            </div>
            {showAllReviews && (
              <div
                className="mb-3 rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-2 text-[11.5px] text-teal-700"
                data-testid="public-profile-all-reviews-note"
              >
                Mostrando todas las reseñas demo.
              </div>
            )}
            <div className="flex flex-col gap-3">
              {(showAllReviews ? proReviews : proReviews.slice(0, 3)).map((r) => (
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
              profesional. Mantén la conversación dentro del chat de Dersux.
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

function getReliabilityLabelText(label: "alta" | "media" | "baja") {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getReliabilityLabelClassName(label: "alta" | "media" | "baja") {
  return (
    {
      alta: "text-teal-700",
      media: "text-amber-700",
      baja: "text-rose-600",
    } satisfies Record<"alta" | "media" | "baja", string>
  )[label];
}
