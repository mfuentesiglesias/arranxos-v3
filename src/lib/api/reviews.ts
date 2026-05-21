import type { PostgrestError } from "@supabase/supabase-js";

import type { ApiProfileRole } from "@/lib/api/profiles";
import { getCurrentProfile } from "@/lib/api/profiles";
import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export type ApiReviewTargetType = "client" | "professional";

export interface ApiReview {
  id: string;
  jobId: string;
  reviewerProfileId: string;
  reviewerRole: ApiProfileRole;
  targetProfileId: string;
  targetType: ApiReviewTargetType;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface ApiCreateReviewResult extends ApiReview {}

interface ReviewRow {
  id: string;
  job_id: string;
  reviewer_profile_id: string;
  reviewer_role: ApiProfileRole;
  target_profile_id: string;
  target_type: ApiReviewTargetType;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface CreateReviewRow {
  result_review_id: string;
  result_job_id: string;
  result_reviewer_profile_id: string;
  result_reviewer_role: ApiProfileRole;
  result_target_profile_id: string;
  result_target_type: ApiReviewTargetType;
  result_rating: number;
  result_comment: string | null;
  result_created_at: string;
}

const REVIEW_SELECT_FIELDS =
  "id, job_id, reviewer_profile_id, reviewer_role, target_profile_id, target_type, rating, comment, created_at";

function isNoRowsError(error: PostgrestError | null): boolean {
  return error?.code === "PGRST116";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "";
}

function mapReviewRow(row: ReviewRow): ApiReview {
  return {
    id: row.id,
    jobId: row.job_id,
    reviewerProfileId: row.reviewer_profile_id,
    reviewerRole: row.reviewer_role,
    targetProfileId: row.target_profile_id,
    targetType: row.target_type,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

function mapCreateReviewRow(row: CreateReviewRow): ApiCreateReviewResult {
  return {
    id: row.result_review_id,
    jobId: row.result_job_id,
    reviewerProfileId: row.result_reviewer_profile_id,
    reviewerRole: row.result_reviewer_role,
    targetProfileId: row.result_target_profile_id,
    targetType: row.result_target_type,
    rating: row.result_rating,
    comment: row.result_comment,
    createdAt: row.result_created_at,
  };
}

function normalizeCreateReviewError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile") ||
    message.includes("permission denied")
  ) {
    return new Error("Necesitas iniciar sesión para crear una valoración real.");
  }

  if (message.includes("only clients or professionals can create reviews")) {
    return new Error("Solo clientes o profesionales pueden crear valoraciones.");
  }

  if (message.includes("review rating must be an integer between 1 and 5")) {
    return new Error("La puntuación debe ser un entero entre 1 y 5.");
  }

  if (message.includes("review comment must contain at most 1000 characters")) {
    return new Error("El comentario no puede superar los 1000 caracteres.");
  }

  if (message.includes("is not in completed status")) {
    return new Error("Solo puedes valorar trabajos que ya estén completados.");
  }

  if (
    message.includes("agreement for job") &&
    (message.includes("is not released") ||
      message.includes("does not have a released_at timestamp") ||
      message.includes("does not exist"))
  ) {
    return new Error("Solo puedes valorar cuando el pago protegido ya fue liberado.");
  }

  if (
    message.includes("only the client owner can review") ||
    message.includes("only the assigned professional can review") ||
    message.includes("does not have an assigned professional")
  ) {
    return new Error(
      "Solo el cliente del trabajo o el profesional asignado pueden valorar este trabajo.",
    );
  }

  if (message.includes("already exists")) {
    return new Error("Ya has enviado tu valoración para este trabajo.");
  }

  if (message.includes("job") && message.includes("does not exist")) {
    return new Error("Este trabajo ya no está disponible para valoración.");
  }

  return new Error("No pudimos registrar la valoración. Inténtalo de nuevo.");
}

export async function createReview(
  jobId: string,
  rating: number,
  comment?: string,
): Promise<ApiCreateReviewResult> {
  if (!isSupabaseMode()) {
    throw new Error("createReview() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("La puntuación debe ser un entero entre 1 y 5.");
  }

  const normalizedComment = comment?.trim() ?? "";
  const client = getBrowserSupabaseClient();

  const { data, error } = await client.rpc("create_review", {
    p_job_id: jobId,
    p_rating: rating,
    p_comment: normalizedComment || null,
  });

  if (error) {
    throw normalizeCreateReviewError(error);
  }

  const result = Array.isArray(data)
    ? (data[0] as CreateReviewRow | undefined)
    : ((data as CreateReviewRow | null) ?? undefined);

  if (!result) {
    throw new Error("No pudimos registrar la valoración. Inténtalo de nuevo.");
  }

  return mapCreateReviewRow(result);
}

export async function getMyReviewForJob(jobId: string): Promise<ApiReview | null> {
  if (!isSupabaseMode()) {
    return null;
  }

  const currentProfile = await getCurrentProfile();

  if (!currentProfile) {
    return null;
  }

  const client = getBrowserSupabaseClient();

  const { data, error } = await client
    .from("reviews")
    .select(REVIEW_SELECT_FIELDS)
    .eq("job_id", jobId)
    .eq("reviewer_profile_id", currentProfile.id)
    .limit(1)
    .maybeSingle<ReviewRow>();

  if (error && !isNoRowsError(error)) {
    throw error;
  }

  return data ? mapReviewRow(data) : null;
}

export async function getJobReviews(jobId: string): Promise<ApiReview[]> {
  if (!isSupabaseMode()) {
    return [];
  }

  const currentProfile = await getCurrentProfile();

  if (!currentProfile) {
    return [];
  }

  const client = getBrowserSupabaseClient();

  const { data, error } = await client
    .from("reviews")
    .select(REVIEW_SELECT_FIELDS)
    .eq("job_id", jobId)
    // Newest first matches the other list endpoints and keeps the latest activity first.
    .order("created_at", { ascending: false })
    .returns<ReviewRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapReviewRow);
}
