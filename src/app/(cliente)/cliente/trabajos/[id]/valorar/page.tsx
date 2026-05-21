"use client";
import { use, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { getJobAgreementContext, type ApiJobAgreementContext } from "@/lib/api/agreements";
import {
  createReview,
  getMyReviewForJob,
  type ApiReview,
} from "@/lib/api/reviews";
import { getCurrentProfile, type ApiProfile } from "@/lib/api/profiles";
import { jobs, professionals } from "@/lib/data";
import { getEffectiveJobById, getReviewForJobByReviewer, useSession } from "@/lib/store";
import { isSupabaseMode } from "@/lib/supabase/config";

interface Props {
  params: Promise<{ id: string }>;
}

const TAGS = [
  "Puntual",
  "Profesional",
  "Buen precio",
  "Limpio",
  "Amable",
  "Comunicativo",
  "Experto",
  "Rápido",
];

function getReviewLabel(rating: number): string {
  if (rating === 5) {
    return "Excelente";
  }

  if (rating === 4) {
    return "Muy bien";
  }

  if (rating === 3) {
    return "Correcto";
  }

  if (rating === 2) {
    return "Regular";
  }

  if (rating === 1) {
    return "Mal";
  }

  return "Pulsa una estrella";
}

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

function renderStars(
  rating: number,
  onSelect?: (value: number) => void,
  disabled = false,
) {
  return [1, 2, 3, 4, 5].map((value) => (
    <button
      key={value}
      type="button"
      onClick={() => onSelect?.(value)}
      disabled={disabled || !onSelect}
      className="text-[36px] leading-none transition disabled:cursor-default"
      aria-label={`${value} estrella${value === 1 ? "" : "s"}`}
    >
      <span className={rating >= value ? "text-amber-400" : "text-sand-200"}>★</span>
    </button>
  ));
}

function ReviewSummary({ review }: { review: ApiReview }) {
  return (
    <Card className="mb-3 bg-teal-50/40 border-teal-100" testId="review-existing-summary">
      <div className="font-bold text-[13px] text-teal-700 mb-1">Ya has enviado tu valoración</div>
      <div className="text-[11.5px] text-teal-700/80 leading-snug space-y-1">
        <div>
          {review.rating} de 5 estrellas. {getReviewLabel(review.rating)}.
        </div>
        {review.comment && <div>{review.comment}</div>}
        <div>Enviada el {formatReviewDate(review.createdAt)}</div>
      </div>
    </Card>
  );
}

function SupabaseInner({ id }: { id: string }) {
  const [agreementContext, setAgreementContext] = useState<ApiJobAgreementContext | null>(null);
  const [currentProfile, setCurrentProfile] = useState<ApiProfile | null>(null);
  const [review, setReview] = useState<ApiReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    async function loadContext() {
      setLoading(true);
      setPageError(null);

      try {
        const [profile, nextAgreementContext, nextReview] = await Promise.all([
          getCurrentProfile(),
          getJobAgreementContext(id),
          getMyReviewForJob(id),
        ]);

        if (!isCancelled) {
          setCurrentProfile(profile);
          setAgreementContext(nextAgreementContext);
          setReview(nextReview);
        }
      } catch (error) {
        if (!isCancelled) {
          setCurrentProfile(null);
          setAgreementContext(null);
          setReview(null);
          setPageError(
            error instanceof Error && error.message
              ? error.message
              : "No pudimos cargar la valoración real de este trabajo.",
          );
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void loadContext();

    return () => {
      isCancelled = true;
    };
  }, [id, reloadKey]);

  const currentJob = agreementContext?.status === "ready" ? agreementContext.job : null;
  const currentAgreement = agreementContext?.status === "ready" ? agreementContext.agreement : null;
  const canReview = Boolean(
    currentProfile?.role === "client" &&
      currentJob?.status === "completed" &&
      currentAgreement?.paymentStatus === "released" &&
      !review,
  );

  const submit = async () => {
    if (sending || !canReview) {
      return;
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setSubmitError("Selecciona una puntuación entera entre 1 y 5.");
      return;
    }

    if (comment.length > 1000) {
      setSubmitError("El comentario no puede superar los 1000 caracteres.");
      return;
    }

    setSubmitError(null);
    setSubmitNotice(null);
    setSending(true);

    try {
      const createdReview = await createReview(id, rating, comment);
      setReview(createdReview);
      setSubmitNotice("Tu valoración se ha publicado correctamente.");
      setReloadKey((currentValue) => currentValue + 1);
    } catch (error) {
      setSubmitError(
        error instanceof Error && error.message
          ? error.message
          : "No pudimos publicar tu valoración. Inténtalo de nuevo.",
      );
    } finally {
      setSending(false);
    }
  };

  let statusMessage: string | null = null;

  if (!loading && !pageError) {
    if (agreementContext?.status === "unauthenticated" || !currentProfile) {
      statusMessage = "Necesitas iniciar sesión para valorar este trabajo real.";
    } else if (currentProfile.role !== "client") {
      statusMessage = "Solo el cliente puede valorar desde esta página.";
    } else if (!currentJob || !currentAgreement || agreementContext?.status === "unavailable") {
      statusMessage = "Sin acceso o valoración no disponible para este trabajo.";
    } else if (review) {
      statusMessage = "Ya has valorado este trabajo.";
    } else if (currentJob.status !== "completed") {
      statusMessage = "Este trabajo todavía no está completado.";
    } else if (currentAgreement.paymentStatus !== "released") {
      statusMessage = "El pago protegido todavía no ha sido liberado.";
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Valorar profesional" subtitle="Fase 1 · Valoración real sin score ni ranking" />
      <ScreenBody className="px-4 pt-3 pb-6">
        {loading && (
          <Card className="mb-3 text-[12px] text-ink-600 leading-snug">
            Estamos cargando la valoración real de este trabajo.
          </Card>
        )}

        {pageError && (
          <Card className="mb-3 bg-rose-50 border-rose-100 text-[12px] text-rose-700 leading-snug">
            {pageError}
          </Card>
        )}

        {submitError && (
          <Card className="mb-3 bg-rose-50 border-rose-100 text-[12px] text-rose-700 leading-snug">
            {submitError}
          </Card>
        )}

        {submitNotice && (
          <Card className="mb-3 bg-teal-50 border-teal-100 text-[12px] text-teal-700 leading-snug">
            {submitNotice}
          </Card>
        )}

        {review && <ReviewSummary review={review} />}

        {statusMessage && !submitNotice && (
          <Card className="mb-3 bg-amber-50 border-amber-100 text-[12px] text-amber-700 leading-snug">
            {statusMessage}
          </Card>
        )}

        <Card className="mb-3 text-center">
          <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto mb-2 text-[14px] font-extrabold">
            PRO
          </div>
          <div className="font-extrabold text-[16px] text-ink-800">Profesional asignado</div>
          <div className="text-[12px] text-ink-500 mb-1">Trabajo {currentJob?.id ?? id}</div>
          <div className="text-[11.5px] text-ink-400 mb-3">
            La valoración se registra mediante RPC y queda visible solo según RLS.
          </div>
          <div className="flex items-center justify-center gap-1 mb-2">
            {renderStars(review?.rating ?? rating, review ? undefined : setRating, Boolean(review))}
          </div>
          <div className="text-[12px] text-ink-400">{getReviewLabel(review?.rating ?? rating)}</div>
        </Card>

        <Card className="mb-3">
          <div className="font-bold text-[13.5px] text-ink-800 mb-3">Resumen real</div>
          <div className="space-y-2 text-[12.5px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-500">Trabajo</span>
              <span className="font-bold text-ink-800 text-right">{currentJob?.id ?? id}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-500">Estado del trabajo</span>
              <span className="font-bold text-ink-800">{currentJob?.status ?? "Sin contexto"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-500">Estado del pago</span>
              <span className="font-bold text-ink-800">{currentAgreement?.paymentStatus ?? "Sin acuerdo"}</span>
            </div>
            {review && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-500">Puntuación</span>
                  <span className="font-bold text-ink-800">{review.rating}/5</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-500">Fecha</span>
                  <span className="font-bold text-ink-800 text-right">{formatReviewDate(review.createdAt)}</span>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card className="mb-3">
          <Textarea
            label="Reseña pública (opcional)"
            value={review?.comment ?? comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Cuenta a otros clientes cómo fue tu experiencia con este profesional."
            rows={4}
            disabled={sending || Boolean(review)}
          />
          <div className="mt-2 text-[11.5px] text-ink-500 text-right">
            {(review?.comment ?? comment).length}/1000
          </div>
        </Card>
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button
          full
          onClick={() => void submit()}
          disabled={sending || !canReview || rating === 0}
          testId="submit-job-review"
        >
          {sending ? "Publicando valoración..." : review ? "Valoración publicada" : "Publicar valoración"}
        </Button>
      </div>
    </div>
  );
}

function MockInner({ id }: { id: string }) {
  const router = useRouter();
  const session = useSession();
  const createJobReview = useSession((s) => s.createJobReview);
  const job = useMemo(() => getEffectiveJobById(session, id), [session, id]) ?? jobs.find((j) => j.id === id) ?? jobs[0];
  const pro = job.assignedProId
    ? professionals.find((p) => p.id === job.assignedProId) ?? professionals[0]
    : professionals[0];
  const existingReview = getReviewForJobByReviewer(session, id, session.currentClientId);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const canReview = job.status === "completed" && Boolean(job.assignedProId) && !existingReview;

  const toggleTag = (t: string) => {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const submit = () => {
    if (!canReview || rating === 0) return;

    const reviewText = [
      tags.length > 0 ? `Destacó: ${tags.join(", ")}.` : "",
      text.trim(),
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    const created = createJobReview({
      jobId: id,
      rating,
      comment: reviewText,
    });
    if (!created) return;

    setSent(true);
    setTimeout(() => router.push(`/cliente/trabajos/${id}`), 800);
  };

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Valorar profesional" />
      <ScreenBody className="px-4 pt-3 pb-6">
        {!canReview && existingReview && (
          <Card className="mb-3 bg-teal-50/40 border-teal-100" testId="review-existing-summary">
            <div className="font-bold text-[13px] text-teal-700 mb-1">
              Ya has enviado tu valoración
            </div>
            <div className="text-[11.5px] text-teal-700/80 leading-snug">
              {existingReview.rating} de 5 estrellas. {existingReview.text}
            </div>
          </Card>
        )}

        {!canReview && !existingReview && (
          <Card className="mb-3 bg-amber-50 border-amber-100 text-[12px] text-amber-700 leading-snug">
            Solo puedes valorar al profesional cuando el trabajo ya esté completado.
          </Card>
        )}

        <Card className="mb-3 text-center">
          <Avatar initials={pro.avatar} size={64} className="mx-auto mb-2" />
          <div className="font-extrabold text-[16px] text-ink-800">{pro.name}</div>
          <div className="text-[12px] text-ink-500 mb-3">{pro.specialty}</div>
          <div className="flex items-center justify-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setRating(s)}
                className="text-[36px] leading-none transition"
                aria-label={`${s} estrella${s === 1 ? "" : "s"}`}
              >
                <span className={rating >= s ? "text-amber-400" : "text-sand-200"}>
                  ★
                </span>
              </button>
            ))}
          </div>
          <div className="text-[12px] text-ink-400">
            {getReviewLabel(rating)}
          </div>
        </Card>

        <Card className="mb-3">
          <div className="text-[12.5px] font-bold text-ink-700 mb-2">
            Lo que más destacas (opcional)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TAGS.map((t) => {
              const sel = tags.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-bold border-[1.5px] transition ${
                    sel
                      ? "border-coral-500 bg-coral-50 text-coral-700"
                      : "border-sand-200 text-ink-500 bg-white"
                  }`}
                >
                  {sel && <Icon name="check" size={10} stroke={3} className="inline mr-1" />}
                  {t}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="mb-3">
          <Textarea
            label="Reseña pública (opcional)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cuenta a otros clientes cómo fue tu experiencia con este profesional."
            rows={4}
          />
        </Card>
      </ScreenBody>

      <div className="app-bottom-bar px-5 pb-5 pt-3 bg-white border-t border-sand-200/70">
        <Button full onClick={submit} disabled={!canReview || rating === 0 || sent} testId="submit-job-review">
          {sent ? "Gracias por tu valoración ✓" : "Publicar valoración"}
        </Button>
      </div>
    </div>
  );
}

export default function Page({ params }: Props) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div />}>
      {isSupabaseMode() ? <SupabaseInner id={id} /> : <MockInner id={id} />}
    </Suspense>
  );
}
