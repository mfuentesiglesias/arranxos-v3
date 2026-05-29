import { getCurrentProfile } from "@/lib/api/profiles";
import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type { CatalogRequest } from "@/lib/types";

interface CatalogRequestRow {
  id: string;
  requested_name: string;
  suggested_category_id: string | null;
  suggested_category_name: string | null;
  description: string | null;
  requested_by_profile_id: string;
  requested_by_role: "client" | "professional" | "admin";
  status: "pending" | "reviewing" | "approved" | "rejected" | "merged";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by_admin_id: string | null;
  rejection_reason: string | null;
  merged_into_service_id: string | null;
  approved_service_id: string | null;
}

interface CreateCatalogRequestResultRow {
  result_request_id: string;
  result_requested_name: string;
  result_suggested_category_id: string | null;
  result_suggested_category_name: string | null;
  result_description: string | null;
  result_requested_by_profile_id: string;
  result_requested_by_role: "client" | "professional" | "admin";
  result_status: "pending" | "reviewing" | "approved" | "rejected" | "merged";
  result_created_at: string;
  result_reviewed_at: string | null;
  result_reviewed_by_admin_id: string | null;
  result_rejection_reason: string | null;
  result_merged_into_service_id: string | null;
  result_approved_service_id: string | null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
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

function mapCatalogRequestRow(row: CatalogRequestRow, requestedByName: string): CatalogRequest {
  return {
    id: row.id,
    requestedName: row.requested_name,
    suggestedCategoryId: row.suggested_category_id ?? undefined,
    suggestedCategoryName: row.suggested_category_name ?? undefined,
    description: row.description ?? undefined,
    requestedByUserId: row.requested_by_profile_id,
    requestedByName,
    requestedByRole: row.requested_by_role,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewedByAdminId: row.reviewed_by_admin_id ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    mergedIntoServiceId: row.merged_into_service_id ?? undefined,
    approvedServiceId: row.approved_service_id ?? undefined,
  };
}

function mapCreateCatalogRequestResultRow(
  row: CreateCatalogRequestResultRow,
  requestedByName: string,
): CatalogRequest {
  return {
    id: row.result_request_id,
    requestedName: row.result_requested_name,
    suggestedCategoryId: row.result_suggested_category_id ?? undefined,
    suggestedCategoryName: row.result_suggested_category_name ?? undefined,
    description: row.result_description ?? undefined,
    requestedByUserId: row.result_requested_by_profile_id,
    requestedByName,
    requestedByRole: row.result_requested_by_role,
    status: row.result_status,
    createdAt: row.result_created_at,
    reviewedAt: row.result_reviewed_at ?? undefined,
    reviewedByAdminId: row.result_reviewed_by_admin_id ?? undefined,
    rejectionReason: row.result_rejection_reason ?? undefined,
    mergedIntoServiceId: row.result_merged_into_service_id ?? undefined,
    approvedServiceId: row.result_approved_service_id ?? undefined,
  };
}

function normalizeCreateCatalogRequestError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();
  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile") ||
    message.includes("permission denied")
  ) {
    return new Error("Necesitas iniciar sesión para solicitar una nueva especialidad real.");
  }
  if (message.includes("only clients or professionals")) {
    return new Error("Solo clientes o profesionales pueden solicitar nuevas especialidades.");
  }
  if (message.includes("already exists")) {
    return new Error("Esta especialidad ya existe o ya está pendiente de revisión.");
  }
  if (message.includes("requested_name is required")) {
    return new Error("Escribe un nombre válido para la especialidad solicitada.");
  }
  return new Error("No pudimos registrar la solicitud de especialidad. Inténtalo de nuevo.");
}

export async function createCatalogRequest(input: {
  requestedName: string;
  suggestedCategoryId?: string;
  suggestedCategoryName?: string;
  description?: string;
}): Promise<CatalogRequest> {
  if (!isSupabaseMode()) {
    throw new Error("createCatalogRequest() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const requestedName = input.requestedName.trim();
  if (!requestedName) {
    throw new Error("Escribe un nombre válido para la especialidad solicitada.");
  }

  const currentProfile = await getCurrentProfile();
  if (!currentProfile) {
    throw new Error("Necesitas iniciar sesión para solicitar una nueva especialidad real.");
  }

  const client = getBrowserSupabaseClient();
  const { data, error } = await client.rpc("create_catalog_request", {
    p_requested_name: requestedName,
    p_suggested_category_id: input.suggestedCategoryId ?? null,
    p_suggested_category_name: input.suggestedCategoryName?.trim() || null,
    p_description: input.description?.trim() || null,
  });

  if (error) {
    throw normalizeCreateCatalogRequestError(error);
  }

  const row = Array.isArray(data)
    ? (data[0] as CreateCatalogRequestResultRow | undefined)
    : ((data as CreateCatalogRequestResultRow | null) ?? undefined);

  if (!row) {
    throw new Error("No pudimos registrar la solicitud de especialidad. Inténtalo de nuevo.");
  }

  return mapCreateCatalogRequestResultRow(row, currentProfile.fullName);
}

export async function getMyCatalogRequests(): Promise<CatalogRequest[]> {
  if (!isSupabaseMode()) return [];

  const currentProfile = await getCurrentProfile();
  if (!currentProfile) return [];

  const client = getBrowserSupabaseClient();
  const { data, error } = await client
    .from("catalog_requests")
    .select(
      "id, requested_name, suggested_category_id, suggested_category_name, description, requested_by_profile_id, requested_by_role, status, created_at, reviewed_at, reviewed_by_admin_id, rejection_reason, merged_into_service_id, approved_service_id",
    )
    .eq("requested_by_profile_id", currentProfile.id)
    .order("created_at", { ascending: false })
    .returns<CatalogRequestRow[]>();

  if (error) throw error;

  return (data ?? []).map((row) => mapCatalogRequestRow(row, currentProfile.fullName));
}
