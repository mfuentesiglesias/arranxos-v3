import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export type ApiReliabilityRiskState = "low" | "medium" | "high" | "critical";
export type ApiReliabilityLabel = "alta" | "buena" | "media" | "baja";

export interface ApiReliabilityComponents {
  reviewConfidence: number;
  reviewQualityPenalty: number;
  disputePenalty: number;
  cancellationPenalty: number;
  strikePenalty: number;
  completionBonus: number;
}

export interface ApiProfessionalReliabilityScore {
  professionalId: string;
  score: number;
  label: ApiReliabilityLabel;
  riskState: ApiReliabilityRiskState;
  reviewCount: number;
  averageRating: number | null;
  completedJobs: number;
  cancelledJobs: number;
  openDisputes: number;
  resolvedAgainstProfessional: number;
  splitDisputes: number;
  strikeCount: number;
  components: ApiReliabilityComponents;
  snapshot: Record<string, unknown>;
  updatedAt: string;
}

export interface ApiAdminProfessionalScoreListItem extends ApiProfessionalReliabilityScore {
  fullName: string;
  avatarInitials: string | null;
  status: "pending" | "approved" | "blocked";
  verificationStatus: "not_verified" | "pending" | "verified" | "rejected";
}

interface ReliabilityScoreRow {
  result_professional_id: string;
  result_score: number;
  result_label: ApiReliabilityLabel;
  result_risk_state: ApiReliabilityRiskState;
  result_review_count: number;
  result_average_rating: number | null;
  result_completed_jobs: number;
  result_cancelled_jobs: number;
  result_open_disputes: number;
  result_resolved_against_professional: number;
  result_split_disputes: number;
  result_strike_count: number;
  result_components: ApiReliabilityComponents | null;
  result_snapshot: Record<string, unknown> | null;
  result_updated_at: string;
}

interface AdminReliabilityScoreRow extends ReliabilityScoreRow {
  result_full_name: string;
  result_avatar_initials: string | null;
  result_status: "pending" | "approved" | "blocked";
  result_verification_status: "not_verified" | "pending" | "verified" | "rejected";
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

function mapReliabilityScoreRow(row: ReliabilityScoreRow): ApiProfessionalReliabilityScore {
  return {
    professionalId: row.result_professional_id,
    score: row.result_score,
    label: row.result_label,
    riskState: row.result_risk_state,
    reviewCount: row.result_review_count,
    averageRating: row.result_average_rating,
    completedJobs: row.result_completed_jobs,
    cancelledJobs: row.result_cancelled_jobs,
    openDisputes: row.result_open_disputes,
    resolvedAgainstProfessional: row.result_resolved_against_professional,
    splitDisputes: row.result_split_disputes,
    strikeCount: row.result_strike_count,
    components: row.result_components ?? {
      reviewConfidence: 0,
      reviewQualityPenalty: 0,
      disputePenalty: 0,
      cancellationPenalty: 0,
      strikePenalty: 0,
      completionBonus: 0,
    },
    snapshot: row.result_snapshot ?? {},
    updatedAt: row.result_updated_at,
  };
}

function mapAdminReliabilityScoreRow(row: AdminReliabilityScoreRow): ApiAdminProfessionalScoreListItem {
  return {
    ...mapReliabilityScoreRow(row),
    fullName: row.result_full_name,
    avatarInitials: row.result_avatar_initials,
    status: row.result_status,
    verificationStatus: row.result_verification_status,
  };
}

function getFirstRow<T>(data: unknown): T | undefined {
  if (Array.isArray(data)) {
    return data[0] as T | undefined;
  }

  return (data as T | null) ?? undefined;
}

function normalizeGetReliabilityError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile")
  ) {
    return new Error("Necesitas iniciar sesión para consultar la fiabilidad real.");
  }

  if (
    message.includes("only admins or the target professional can read this reliability score") ||
    message.includes("permission denied")
  ) {
    return new Error("No tienes permiso para consultar esta fiabilidad real.");
  }

  if (message.includes("does not exist")) {
    return new Error("El profesional indicado ya no existe.");
  }

  return new Error("No pudimos cargar la fiabilidad real. Inténtalo de nuevo.");
}

function normalizeRecalculateReliabilityError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile")
  ) {
    return new Error("Necesitas iniciar sesión para recalcular la fiabilidad real.");
  }

  if (
    message.includes("only admins can recalculate professional reliability scores") ||
    message.includes("permission denied")
  ) {
    return new Error("Solo admins pueden recalcular la fiabilidad real.");
  }

  if (message.includes("does not exist")) {
    return new Error("El profesional indicado ya no existe.");
  }

  return new Error("No pudimos recalcular la fiabilidad real. Inténtalo de nuevo.");
}

function normalizeListAdminReliabilityError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile")
  ) {
    return new Error("Necesitas iniciar sesión para consultar los scores reales.");
  }

  if (
    message.includes("only admins can list professional reliability scores") ||
    message.includes("permission denied")
  ) {
    return new Error("Solo admins pueden consultar los scores reales.");
  }

  return new Error("No pudimos cargar los scores reales. Inténtalo de nuevo.");
}

export async function getProfessionalReliabilityScore(
  professionalId: string,
): Promise<ApiProfessionalReliabilityScore> {
  if (!isSupabaseMode()) {
    throw new Error("getProfessionalReliabilityScore() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const client = getBrowserSupabaseClient();
  const { data, error } = await client.rpc("get_professional_reliability_score", {
    p_professional_id: professionalId,
  });

  if (error) {
    throw normalizeGetReliabilityError(error);
  }

  const row = getFirstRow<ReliabilityScoreRow>(data);

  if (!row) {
    throw new Error("No pudimos cargar la fiabilidad real. Inténtalo de nuevo.");
  }

  return mapReliabilityScoreRow(row);
}

export async function recalculateProfessionalReliabilityScore(
  professionalId: string,
): Promise<ApiProfessionalReliabilityScore> {
  if (!isSupabaseMode()) {
    throw new Error("recalculateProfessionalReliabilityScore() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const client = getBrowserSupabaseClient();
  const { data, error } = await client.rpc("recalculate_professional_reliability_score", {
    p_professional_id: professionalId,
  });

  if (error) {
    throw normalizeRecalculateReliabilityError(error);
  }

  const row = getFirstRow<ReliabilityScoreRow>(data);

  if (!row) {
    throw new Error("No pudimos recalcular la fiabilidad real. Inténtalo de nuevo.");
  }

  return mapReliabilityScoreRow(row);
}

export async function listAdminProfessionalScores(): Promise<ApiAdminProfessionalScoreListItem[]> {
  if (!isSupabaseMode()) {
    return [];
  }

  const client = getBrowserSupabaseClient();
  const { data, error } = await client.rpc("list_admin_professional_scores");

  if (error) {
    throw normalizeListAdminReliabilityError(error);
  }

  const rows = Array.isArray(data)
    ? (data as AdminReliabilityScoreRow[])
    : data
      ? ([data] as AdminReliabilityScoreRow[])
      : [];

  return rows.map(mapAdminReliabilityScoreRow);
}
