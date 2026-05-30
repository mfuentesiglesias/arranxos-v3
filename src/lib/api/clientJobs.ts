import { getRealCatalogCategories, getRealCatalogServices } from "@/lib/api/catalog";
import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Job, JobStatus } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

export interface ApiClientJob {
  id: string;
  title: string;
  description: string;
  status: string;
  categoryId: string | null;
  categoryName: string | null;
  serviceId: string | null;
  serviceName: string | null;
  approxLocation: string | null;
  approxLat: number | null;
  approxLng: number | null;
  approxRadiusM: number;
  priceMin: number | null;
  priceMax: number | null;
  finalPrice: number | null;
  createdAt: string;
  updatedAt: string;
  clientId: string;
  assignedProfessionalId: string | null;
  invitedCount: number;
  invitationsSentAt: string | null;
  completionDeadline: string | null;
  commissionPctSnapshot: number | null;
  requestCount: number;
}

interface JobRow {
  id: string;
  client_id: string;
  assigned_professional_id: string | null;
  category_id: string | null;
  service_id: string | null;
  title: string;
  description: string;
  status: string;
  price_min: number | null;
  price_max: number | null;
  final_price: number | null;
  commission_pct_snapshot: number | null;
  approx_location: string | null;
  approx_lat: number | null;
  approx_lng: number | null;
  approx_radius_m: number;
  invited_count: number;
  invitations_sent_at: string | null;
  completion_deadline: string | null;
  created_at: string;
  updated_at: string;
}

async function getCatalogNameMaps() {
  const [categories, services] = await Promise.all([
    getRealCatalogCategories(),
    getRealCatalogServices(),
  ]);

  return {
    categoryNameById: new Map(categories.map((category) => [category.id, category.name])),
    serviceNameById: new Map(services.map((service) => [service.id, service.name])),
  };
}

function mapJobRowToApiClientJob(
  row: JobRow,
  categoryNameById: Map<string, string>,
  serviceNameById: Map<string, string>,
  requestCount: number,
): ApiClientJob {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    categoryId: row.category_id,
    categoryName: row.category_id ? categoryNameById.get(row.category_id) ?? null : null,
    serviceId: row.service_id,
    serviceName: row.service_id ? serviceNameById.get(row.service_id) ?? null : null,
    approxLocation: row.approx_location,
    approxLat: row.approx_lat,
    approxLng: row.approx_lng,
    approxRadiusM: row.approx_radius_m,
    priceMin: row.price_min,
    priceMax: row.price_max,
    finalPrice: row.final_price,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    clientId: row.client_id,
    assignedProfessionalId: row.assigned_professional_id,
    invitedCount: row.invited_count,
    invitationsSentAt: row.invitations_sent_at,
    completionDeadline: row.completion_deadline,
    commissionPctSnapshot: row.commission_pct_snapshot,
    requestCount,
  };
}

async function getRequestCountByJobId(jobId: string): Promise<number> {
  const client = getBrowserSupabaseClient();
  const { count, error } = await client
    .from("job_requests")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function listMyJobs(): Promise<ApiClientJob[]> {
  if (!isSupabaseMode()) {
    return [];
  }

  const client = getBrowserSupabaseClient();
  const { categoryNameById, serviceNameById } = await getCatalogNameMaps();

  const { data, error } = await client
    .from("jobs")
    .select(
      "id, client_id, assigned_professional_id, category_id, service_id, title, description, status, price_min, price_max, final_price, commission_pct_snapshot, approx_location, approx_lat, approx_lng, approx_radius_m, invited_count, invitations_sent_at, completion_deadline, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .returns<JobRow[]>();

  if (error) {
    throw error;
  }

  const rows = data ?? [];

  const requestCounts = await Promise.all(
    rows.map((row) => getRequestCountByJobId(row.id)),
  );

  return rows.map((row, index) =>
    mapJobRowToApiClientJob(row, categoryNameById, serviceNameById, requestCounts[index]),
  );
}

export async function getMyJobById(jobId: string): Promise<ApiClientJob | null> {
  if (!isSupabaseMode()) {
    return null;
  }

  const client = getBrowserSupabaseClient();
  const { categoryNameById, serviceNameById } = await getCatalogNameMaps();

  const { data, error } = await client
    .from("jobs")
    .select(
      "id, client_id, assigned_professional_id, category_id, service_id, title, description, status, price_min, price_max, final_price, commission_pct_snapshot, approx_location, approx_lat, approx_lng, approx_radius_m, invited_count, invitations_sent_at, completion_deadline, created_at, updated_at",
    )
    .eq("id", jobId)
    .maybeSingle<JobRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const requestCount = await getRequestCountByJobId(jobId);

  return mapJobRowToApiClientJob(data, categoryNameById, serviceNameById, requestCount);
}

export function toMockJob(apiJob: ApiClientJob, clientName?: string): Job {
  const location = apiJob.approxLocation ?? "Sin ubicación";
  const now = new Date();
  const createdDate = new Date(apiJob.createdAt);
  const posted = Number.isNaN(createdDate.getTime())
    ? ""
    : relativeTime(apiJob.createdAt);

  return {
    id: apiJob.id,
    title: apiJob.title,
    categoryId: apiJob.categoryId ?? "",
    category: apiJob.categoryName ?? "Sin categoría",
    service: apiJob.serviceName ?? "Sin servicio",
    location,
    locationApprox: apiJob.approxLocation ?? "Ubicación aproximada no disponible",
    lat: apiJob.approxLat ?? 0,
    lng: apiJob.approxLng ?? 0,
    status: apiJob.status as JobStatus,
    priceMin: apiJob.priceMin ?? 0,
    priceMax: apiJob.priceMax ?? 0,
    finalPrice: apiJob.finalPrice ?? undefined,
    requests: apiJob.requestCount,
    invitations: apiJob.invitedCount,
    posted,
    postedAt: apiJob.createdAt,
    clientId: apiJob.clientId,
    clientName: clientName ?? "Tú",
    clientAvatar: clientName ? clientName.substring(0, 2).toUpperCase() : "TU",
    clientRating: 0,
    description: apiJob.description,
    assignedProId: apiJob.assignedProfessionalId ?? undefined,
    completionDeadline: apiJob.completionDeadline ?? undefined,
    commissionPct: apiJob.commissionPctSnapshot ?? undefined,
  };
}
