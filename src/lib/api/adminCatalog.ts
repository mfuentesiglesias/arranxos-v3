import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type { CatalogCategory, CatalogRequest, CatalogService } from "@/lib/types";

interface CatalogCategoryRow {
  id: string;
  name: string;
  icon: string | null;
  group_name: string | null;
  color: string | null;
  active: boolean;
  source: "seed" | "admin_approved";
  created_from_request_id: string | null;
}

interface CatalogServiceRow {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  aliases: string[] | null;
  active: boolean;
  source: "seed" | "admin_approved";
  created_from_request_id: string | null;
}

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

interface ProfileNameRow {
  id: string;
  full_name: string;
}

interface CatalogRequestResultRow {
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

const ADMIN_CATALOG_CATEGORY_SELECT =
  "id, name, icon, group_name, color, active, source, created_from_request_id";

const ADMIN_CATALOG_SERVICE_SELECT =
  "id, category_id, name, description, aliases, active, source, created_from_request_id";

const ADMIN_CATALOG_REQUEST_SELECT =
  "id, requested_name, suggested_category_id, suggested_category_name, description, requested_by_profile_id, requested_by_role, status, created_at, reviewed_at, reviewed_by_admin_id, rejection_reason, merged_into_service_id, approved_service_id";

function mapCatalogCategoryRow(row: CatalogCategoryRow): CatalogCategory {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon ?? undefined,
    group: row.group_name ?? undefined,
    color: row.color ?? undefined,
    active: row.active,
    source: row.source,
    createdFromRequestId: row.created_from_request_id ?? undefined,
  };
}

function mapCatalogServiceRow(row: CatalogServiceRow, catNameById: Map<string, string>): CatalogService {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: catNameById.get(row.category_id) ?? row.category_id,
    name: row.name,
    description: row.description ?? undefined,
    aliases: row.aliases ?? [],
    active: row.active,
    source: row.source,
    createdFromRequestId: row.created_from_request_id ?? undefined,
  };
}

function mapCatalogRequestRow(row: CatalogRequestRow, nameById: Map<string, string>): CatalogRequest {
  return {
    id: row.id,
    requestedName: row.requested_name,
    suggestedCategoryId: row.suggested_category_id ?? undefined,
    suggestedCategoryName: row.suggested_category_name ?? undefined,
    description: row.description ?? undefined,
    requestedByUserId: row.requested_by_profile_id,
    requestedByName:
      nameById.get(row.requested_by_profile_id) ?? `Usuario ${row.requested_by_profile_id.slice(0, 8)}`,
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

function mapCatalogRequestResultRow(row: CatalogRequestResultRow, nameById: Map<string, string>): CatalogRequest {
  return {
    id: row.result_request_id,
    requestedName: row.result_requested_name,
    suggestedCategoryId: row.result_suggested_category_id ?? undefined,
    suggestedCategoryName: row.result_suggested_category_name ?? undefined,
    description: row.result_description ?? undefined,
    requestedByUserId: row.result_requested_by_profile_id,
    requestedByName:
      nameById.get(row.result_requested_by_profile_id) ?? `Usuario ${row.result_requested_by_profile_id.slice(0, 8)}`,
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

function normalizeAdminCatalogActionError(error: unknown, actionLabel: string): Error {
  const message = getErrorMessage(error).toLowerCase();
  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile") ||
    message.includes("permission denied")
  ) {
    return new Error(`Necesitas iniciar sesión como admin para ${actionLabel}.`);
  }
  if (message.includes("only admins")) {
    return new Error(`Solo admins pueden ${actionLabel}.`);
  }
  if (message.includes("already exists")) {
    return new Error("Ya existe una categoría, servicio o solicitud equivalente.");
  }
  return new Error(`No pudimos ${actionLabel}. Inténtalo de nuevo.`);
}

async function getProfileNameMap(ids: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();
  const client = getBrowserSupabaseClient();
  const { data, error } = await client
    .from("profiles")
    .select("id, full_name")
    .in("id", uniqueIds)
    .returns<ProfileNameRow[]>();
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.id, r.full_name]));
}

export async function listAdminCatalogCategories(): Promise<CatalogCategory[]> {
  if (!isSupabaseMode()) return [];
  const client = getBrowserSupabaseClient();
  const { data, error } = await client
    .from("catalog_categories")
    .select(ADMIN_CATALOG_CATEGORY_SELECT)
    .order("name", { ascending: true })
    .returns<CatalogCategoryRow[]>();
  if (error) throw error;
  return (data ?? []).map(mapCatalogCategoryRow);
}

export async function listAdminCatalogServices(): Promise<CatalogService[]> {
  if (!isSupabaseMode()) return [];
  const client = getBrowserSupabaseClient();
  const [catRes, svcRes] = await Promise.all([
    client.from("catalog_categories").select(ADMIN_CATALOG_CATEGORY_SELECT).returns<CatalogCategoryRow[]>(),
    client.from("catalog_services").select(ADMIN_CATALOG_SERVICE_SELECT).order("name", { ascending: true }).returns<CatalogServiceRow[]>(),
  ]);
  if (catRes.error) throw catRes.error;
  if (svcRes.error) throw svcRes.error;
  const nameById = new Map((catRes.data ?? []).map((r) => [r.id, r.name]));
  return (svcRes.data ?? []).map((r) => mapCatalogServiceRow(r, nameById));
}

export async function listAdminCatalogRequests(): Promise<CatalogRequest[]> {
  if (!isSupabaseMode()) return [];
  const client = getBrowserSupabaseClient();
  const { data, error } = await client
    .from("catalog_requests")
    .select(ADMIN_CATALOG_REQUEST_SELECT)
    .order("created_at", { ascending: false })
    .returns<CatalogRequestRow[]>();
  if (error) throw error;
  const rows = data ?? [];
  const nameById = await getProfileNameMap(rows.map((r) => r.requested_by_profile_id));
  return rows.map((r) => mapCatalogRequestRow(r, nameById));
}

export async function approveCatalogRequest(input: {
  requestId: string;
  categoryId?: string;
  categoryName?: string;
  serviceName?: string;
  categoryGroupName?: string;
}): Promise<CatalogRequest> {
  const client = getBrowserSupabaseClient();
  const { data, error } = await client.rpc("approve_catalog_request", {
    p_request_id: input.requestId,
    p_category_id: input.categoryId ?? null,
    p_category_name: input.categoryName?.trim() || null,
    p_service_name: input.serviceName?.trim() || null,
    p_category_group_name: input.categoryGroupName?.trim() || null,
  });
  if (error) throw normalizeAdminCatalogActionError(error, "aprobar solicitudes");
  const row = Array.isArray(data) ? (data[0] as CatalogRequestResultRow) : (data as CatalogRequestResultRow);
  if (!row) throw new Error("No pudimos aprobar la solicitud. Inténtalo de nuevo.");
  const nameById = await getProfileNameMap([row.result_requested_by_profile_id]);
  return mapCatalogRequestResultRow(row, nameById);
}

export async function rejectCatalogRequest(input: {
  requestId: string;
  rejectionReason?: string;
}): Promise<CatalogRequest> {
  const client = getBrowserSupabaseClient();
  const { data, error } = await client.rpc("reject_catalog_request", {
    p_request_id: input.requestId,
    p_rejection_reason: input.rejectionReason?.trim() || null,
  });
  if (error) throw normalizeAdminCatalogActionError(error, "rechazar solicitudes");
  const row = Array.isArray(data) ? (data[0] as CatalogRequestResultRow) : (data as CatalogRequestResultRow);
  if (!row) throw new Error("No pudimos rechazar la solicitud. Inténtalo de nuevo.");
  const nameById = await getProfileNameMap([row.result_requested_by_profile_id]);
  return mapCatalogRequestResultRow(row, nameById);
}

export async function mergeCatalogRequest(input: {
  requestId: string;
  serviceId: string;
}): Promise<CatalogRequest> {
  const client = getBrowserSupabaseClient();
  const { data, error } = await client.rpc("merge_catalog_request", {
    p_request_id: input.requestId,
    p_service_id: input.serviceId,
  });
  if (error) throw normalizeAdminCatalogActionError(error, "fusionar solicitudes");
  const row = Array.isArray(data) ? (data[0] as CatalogRequestResultRow) : (data as CatalogRequestResultRow);
  if (!row) throw new Error("No pudimos fusionar la solicitud. Inténtalo de nuevo.");
  const nameById = await getProfileNameMap([row.result_requested_by_profile_id]);
  return mapCatalogRequestResultRow(row, nameById);
}
