import type { PostgrestError } from "@supabase/supabase-js";

import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type { JobStatus } from "@/lib/types";

export type ApiDisputeStatus =
  | "open"
  | "under_review"
  | "resolved_client"
  | "resolved_professional"
  | "split"
  | "cancelled";

export type ApiDisputeOpenedByRole = "client" | "professional" | "admin";

export interface ApiDispute {
  id: string;
  jobId: string;
  openedByProfileId: string;
  openedByRole: ApiDisputeOpenedByRole;
  reason: string;
  description: string | null;
  status: ApiDisputeStatus;
  openedAt: string;
  resolvedAt: string | null;
  resolvedByAdminId: string | null;
  resolutionNote: string | null;
  evidence: unknown[];
}

export interface ApiOpenDisputeResult {
  disputeId: string;
  jobId: string;
  disputeStatus: ApiDisputeStatus;
  jobStatus: JobStatus;
}

export interface ApiResolveDisputeResult {
  disputeId: string;
  jobId: string;
  disputeStatus: ApiDisputeStatus;
  jobStatus: JobStatus;
  paymentStatus: "pending" | "protected" | "released" | "cancelled" | "refunded";
  releasedAt: string | null;
}

interface DisputeRow {
  id: string;
  job_id: string;
  opened_by_profile_id: string;
  opened_by_role: ApiDisputeOpenedByRole;
  reason: string;
  description: string | null;
  status: ApiDisputeStatus;
  opened_at: string;
  resolved_at: string | null;
  resolved_by_admin_id: string | null;
  resolution_note: string | null;
  evidence: unknown[] | null;
}

interface OpenDisputeRow {
  result_dispute_id: string;
  result_job_id: string;
  result_dispute_status: ApiDisputeStatus;
  result_job_status: JobStatus;
}

interface ResolveDisputeRow {
  result_dispute_id: string;
  result_job_id: string;
  result_dispute_status: ApiDisputeStatus;
  result_job_status: JobStatus;
  result_payment_status: "pending" | "protected" | "released" | "cancelled" | "refunded";
  result_released_at: string | null;
}

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

function mapDisputeRow(row: DisputeRow): ApiDispute {
  return {
    id: row.id,
    jobId: row.job_id,
    openedByProfileId: row.opened_by_profile_id,
    openedByRole: row.opened_by_role,
    reason: row.reason,
    description: row.description,
    status: row.status,
    openedAt: row.opened_at,
    resolvedAt: row.resolved_at,
    resolvedByAdminId: row.resolved_by_admin_id,
    resolutionNote: row.resolution_note,
    evidence: row.evidence ?? [],
  };
}

function mapOpenDisputeRow(row: OpenDisputeRow): ApiOpenDisputeResult {
  return {
    disputeId: row.result_dispute_id,
    jobId: row.result_job_id,
    disputeStatus: row.result_dispute_status,
    jobStatus: row.result_job_status,
  };
}

function mapResolveDisputeRow(row: ResolveDisputeRow): ApiResolveDisputeResult {
  return {
    disputeId: row.result_dispute_id,
    jobId: row.result_job_id,
    disputeStatus: row.result_dispute_status,
    jobStatus: row.result_job_status,
    paymentStatus: row.result_payment_status,
    releasedAt: row.result_released_at,
  };
}

function normalizeOpenDisputeError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile") ||
    message.includes("only the client owner or assigned professional") ||
    message.includes("only the client owner can open a dispute") ||
    message.includes("only the assigned professional can open a dispute") ||
    message.includes("permission denied")
  ) {
    return new Error("No puedes abrir una disputa para este trabajo.");
  }

  if (message.includes("approved and active")) {
    return new Error("La cuenta profesional ya no puede abrir esta disputa.");
  }

  if (message.includes("already has an active dispute")) {
    return new Error("Este trabajo ya tiene una disputa activa.");
  }

  if (message.includes("is not in completed_pending_confirmation status")) {
    return new Error("Este trabajo ya no admite abrir una disputa.");
  }

  if (message.includes("is not protected")) {
    return new Error("El pago protegido ya no está disponible para este trabajo.");
  }

  if (message.includes("paid_at timestamp")) {
    return new Error("Este acuerdo no tiene un pago protegido válido.");
  }

  if (message.includes("has already been released")) {
    return new Error("Este acuerdo ya fue liberado y no admite disputa.");
  }

  if (message.includes("reason must contain") || message.includes("evidence must be a json array")) {
    return new Error("La disputa no tiene un motivo válido.");
  }

  if (message.includes("does not exist")) {
    return new Error("Este trabajo o su acuerdo ya no están disponibles.");
  }

  return new Error("No pudimos abrir la disputa. Inténtalo de nuevo.");
}

function normalizeResolveDisputeError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile") ||
    message.includes("only admins can resolve disputes") ||
    message.includes("permission denied")
  ) {
    return new Error("No puedes resolver esta disputa.");
  }

  if (message.includes("resolution action must be")) {
    return new Error("La acción de resolución no es válida.");
  }

  if (message.includes("is not active")) {
    return new Error("Esta disputa ya no está activa.");
  }

  if (message.includes("is not in dispute status")) {
    return new Error("El trabajo ya no está en estado de disputa.");
  }

  if (message.includes("is not protected")) {
    return new Error("El acuerdo ya no tiene un pago protegido para resolver.");
  }

  if (message.includes("paid_at timestamp")) {
    return new Error("Este acuerdo no tiene un pago protegido válido.");
  }

  if (message.includes("has already been released")) {
    return new Error("Este acuerdo ya fue liberado o resuelto.");
  }

  if (message.includes("does not exist")) {
    return new Error("La disputa, el trabajo o el acuerdo ya no están disponibles.");
  }

  return new Error("No pudimos resolver la disputa. Inténtalo de nuevo.");
}

export async function openDispute(
  jobId: string,
  reason: string,
  description?: string,
  evidence: unknown[] = [],
): Promise<ApiOpenDisputeResult> {
  if (!isSupabaseMode()) {
    throw new Error("openDispute() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const client = getBrowserSupabaseClient();

  const { data, error } = await client.rpc("open_dispute", {
    p_job_id: jobId,
    p_reason: reason,
    p_description: description ?? null,
    p_evidence: evidence,
  });

  if (error) {
    throw normalizeOpenDisputeError(error);
  }

  const result = Array.isArray(data)
    ? (data[0] as OpenDisputeRow | undefined)
    : ((data as OpenDisputeRow | null) ?? undefined);

  if (!result) {
    throw new Error("No pudimos abrir la disputa. Inténtalo de nuevo.");
  }

  return mapOpenDisputeRow(result);
}

export async function resolveDispute(
  disputeId: string,
  action: "release_to_professional" | "refund_to_client",
  note?: string,
): Promise<ApiResolveDisputeResult> {
  if (!isSupabaseMode()) {
    throw new Error("resolveDispute() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const client = getBrowserSupabaseClient();

  const { data, error } = await client.rpc("resolve_dispute", {
    p_dispute_id: disputeId,
    p_resolution_action: action,
    p_resolution_note: note ?? null,
  });

  if (error) {
    throw normalizeResolveDisputeError(error);
  }

  const result = Array.isArray(data)
    ? (data[0] as ResolveDisputeRow | undefined)
    : ((data as ResolveDisputeRow | null) ?? undefined);

  if (!result) {
    throw new Error("No pudimos resolver la disputa. Inténtalo de nuevo.");
  }

  return mapResolveDisputeRow(result);
}

export async function getActiveJobDispute(jobId: string): Promise<ApiDispute | null> {
  if (!isSupabaseMode()) {
    return null;
  }

  const client = getBrowserSupabaseClient();

  const { data, error } = await client
    .from("disputes")
    .select(
      "id, job_id, opened_by_profile_id, opened_by_role, reason, description, status, opened_at, resolved_at, resolved_by_admin_id, resolution_note, evidence",
    )
    .eq("job_id", jobId)
    .in("status", ["open", "under_review"])
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle<DisputeRow>();

  if (error && !isNoRowsError(error)) {
    throw error;
  }

  return data ? mapDisputeRow(data) : null;
}

export async function listAdminDisputes(): Promise<ApiDispute[]> {
  if (!isSupabaseMode()) {
    return [];
  }

  const client = getBrowserSupabaseClient();

  const { data, error } = await client
    .from("disputes")
    .select(
      "id, job_id, opened_by_profile_id, opened_by_role, reason, description, status, opened_at, resolved_at, resolved_by_admin_id, resolution_note, evidence",
    )
    .order("opened_at", { ascending: false })
    .returns<DisputeRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapDisputeRow);
}
