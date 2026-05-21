"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { RatingStars } from "@/components/pros/rating-stars";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { listAdminReviews, type ApiAdminReviewListItem } from "@/lib/api/reviews";
import { getEffectiveReviews, useSession } from "@/lib/store";
import { isSupabaseMode } from "@/lib/supabase/config";

function formatReviewDate(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SupabaseAdminValoracionesPage() {
  const [filter, setFilter] = useState<"all" | "low">("all");
  const [q, setQ] = useState("");
  const [reviews, setReviews] = useState<ApiAdminReviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadReviews() {
      setLoading(true);
      setPageError(null);

      try {
        const nextReviews = await listAdminReviews();

        if (!isCancelled) {
          setReviews(nextReviews);
        }
      } catch (error) {
        if (!isCancelled) {
          setReviews([]);
          setPageError(
            error instanceof Error && error.message
              ? error.message
              : "No pudimos cargar las valoraciones reales.",
          );
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void loadReviews();

    return () => {
      isCancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return reviews.filter((review) => {
      const matchesFilter = filter === "all" || review.rating <= 3;
      const query = q.trim().toLowerCase();
      const matchesQuery =
        !query ||
        review.comment?.toLowerCase().includes(query) ||
        review.reviewerName.toLowerCase().includes(query) ||
        review.targetName.toLowerCase().includes(query) ||
        review.jobTitle.toLowerCase().includes(query);

      return matchesFilter && Boolean(matchesQuery);
    });
  }, [filter, q, reviews]);

  const avg = reviews.length > 0 ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length : 0;

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Valoraciones reales" subtitle={`${reviews.length} reseñas · ${avg.toFixed(2)} media`} />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="mb-3 bg-teal-50/40 border-teal-100">
          <div className="text-[12px] text-teal-700 leading-snug">
            Listado real de reseñas registradas en Supabase.
          </div>
        </Card>

        {loading && (
          <Card className="mb-3 text-[12px] text-ink-600 leading-snug">
            Estamos cargando las valoraciones reales.
          </Card>
        )}

        {pageError && (
          <Card className="mb-3 bg-rose-50 border-rose-100 text-[12px] text-rose-700 leading-snug">
            {pageError}
          </Card>
        )}

        <div className="flex items-center gap-2 bg-white rounded-2xl px-3.5 py-2.5 mb-3 border border-sand-200/70">
          <Icon name="search" size={16} stroke={2.2} />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar autor, comentario, trabajo…"
            className="flex-1 bg-transparent outline-none text-[14px] text-ink-800 placeholder:text-ink-400"
          />
        </div>

        <div className="flex gap-1.5 mb-3">
          {(
            [
              { id: "all", label: "Todas" },
              { id: "low", label: "≤ 3★" },
            ] as const
          ).map((option) => {
            const selected = filter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold border-[1.5px] ${
                  selected
                    ? "border-coral-500 bg-coral-50 text-coral-700"
                    : "border-sand-200 text-ink-500 bg-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          {filtered.map((review) => (
            <Card key={review.id} testId={`admin-review-card-${review.id}`}>
              <div className="flex items-start gap-3 mb-2">
                <Avatar initials={review.reviewerAvatarInitials ?? review.reviewerName.slice(0, 2).toUpperCase()} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[13px] text-ink-800 truncate">{review.reviewerName}</span>
                    <span className="text-[10.5px] text-ink-400 ml-auto">{formatReviewDate(review.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <RatingStars value={review.rating} />
                    <span className="text-[11px] text-ink-400">
                      · {review.targetType === "professional" ? "Profesional" : "Cliente"} {review.targetName}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-[12px] text-ink-400 mb-2">Trabajo: {review.jobTitle}</div>
              <div className="text-[12.5px] leading-snug text-ink-600 mb-2">
                {review.comment ? `“${review.comment}”` : "Sin comentario"}
              </div>
              <div className="text-[10.5px] text-ink-400">
                Reviewer role: {review.reviewerRole} · Rating: {review.rating}/5
              </div>
            </Card>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-10 text-ink-400 text-[12.5px]">
              {reviews.length === 0 ? "Todavía no hay valoraciones reales." : "Sin valoraciones en este filtro."}
            </div>
          )}
        </div>
      </ScreenBody>
    </div>
  );
}

function MockAdminValoracionesPage() {
  const session = useSession();
  const [filter, setFilter] = useState<"all" | "low" | "reported">("all");
  const [q, setQ] = useState("");
  const [reviewActions, setReviewActions] = useState<
    Record<string, { reviewed: boolean; hidden: boolean }>
  >({});
  const reviews = useMemo(() => getEffectiveReviews(session), [session]);

  const filtered = reviews.filter((r) => {
    const ms =
      filter === "all" ||
      (filter === "low" && r.rating <= 3) ||
      (filter === "reported" && r.text.length > 100);
    const mq = !q || r.text.toLowerCase().includes(q.toLowerCase()) || r.author.toLowerCase().includes(q.toLowerCase());
    return ms && mq;
  });

  const avg = reviews.length > 0 ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;

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
          {filtered.map((r) => {
            const actionState = reviewActions[r.id] ?? {
              reviewed: false,
              hidden: false,
            };

            return (
              <Card key={r.id} testId={`admin-review-card-${r.id}`}>
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
                <div
                  className={`text-[12.5px] leading-snug mb-3 ${
                    actionState.hidden
                      ? "text-ink-400 line-through"
                      : "text-ink-600"
                  }`}
                >
                  “{r.text}”
                </div>
                <div className="flex items-center gap-1.5 mb-2" data-testid={`admin-review-status-${r.id}`}>
                  {actionState.reviewed && (
                    <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                      Revisada (demo)
                    </span>
                  )}
                  {actionState.hidden && (
                    <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[10px] font-bold text-ink-500">
                      Oculta demo
                    </span>
                  )}
                </div>
                <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">
                  Acciones demo
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    full
                    variant="outline"
                    onClick={() => {
                      setReviewActions((current) => ({
                        ...current,
                        [r.id]: {
                          reviewed: current[r.id]?.reviewed ?? false,
                          hidden: true,
                        },
                      }));
                    }}
                    disabled={actionState.hidden}
                    testId={`admin-review-hide-${r.id}`}
                  >
                    {actionState.hidden ? "Oculta demo ✓" : "Ocultar reseña"}
                  </Button>
                  <Button
                    size="sm"
                    full
                    onClick={() => {
                      setReviewActions((current) => ({
                        ...current,
                        [r.id]: {
                          reviewed: true,
                          hidden: current[r.id]?.hidden ?? false,
                        },
                      }));
                    }}
                    disabled={actionState.reviewed}
                    testId={`admin-review-reviewed-${r.id}`}
                  >
                    {actionState.reviewed ? "Revisada demo ✓" : "Marcar revisada"}
                  </Button>
                </div>
                <div className="mt-2 text-[10.5px] text-ink-400">
                  Acción demo local: no modifica backend ni elimina datos reales.
                </div>
              </Card>
            );
          })}
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

export default function AdminValoracionesPage() {
  if (isSupabaseMode()) {
    return <SupabaseAdminValoracionesPage />;
  }

  return <MockAdminValoracionesPage />;
}
