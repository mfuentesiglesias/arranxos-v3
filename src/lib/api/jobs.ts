import { getRealCatalogCategories, getRealCatalogServices } from "@/lib/api/catalog";
import { getCurrentProfile } from "@/lib/api/profiles";
import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

const PROFESSIONAL_ACTIVE_JOB_STATUSES = [
  "in_progress",
  "agreement_pending",
  "agreed",
  "escrow_funded",
  "completed_pending_confirmation",
  "dispute",
] as const;

export interface ApiProfessionalPublishedJob {
  id: string;
  title: string;
  description: string;
  status: "published";
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
  createdAt: string;
  clientId: string;
  invitedCount: number;
}

export interface ApiProfessionalAssignedJob {
  id: string;
  title: string;
  status: (typeof PROFESSIONAL_ACTIVE_JOB_STATUSES)[number];
  categoryId: string | null;
  categoryName: string | null;
  serviceId: string | null;
  serviceName: string | null;
  approxLocation: string | null;
  priceMin: number | null;
  priceMax: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiProfessionalAssignedJobDetail {
  id: string;
  title: string;
  description: string;
  status: (typeof PROFESSIONAL_ACTIVE_JOB_STATUSES)[number];
  categoryId: string | null;
  categoryName: string | null;
  serviceId: string | null;
  serviceName: string | null;
  approxLocation: string | null;
  priceMin: number | null;
  priceMax: number | null;
  createdAt: string;
  updatedAt: string;
  assignedProfessionalId: string | null;
}

interface PublishedJobRow {
  id: string;
  client_id: string;
  category_id: string | null;
  service_id: string | null;
  title: string;
  description: string;
  status: "published";
  price_min: number | null;
  price_max: number | null;
  approx_location: string | null;
  approx_lat: number | null;
  approx_lng: number | null;
  approx_radius_m: number;
  invited_count: number;
  created_at: string;
}

interface AssignedJobRow {
  id: string;
  assigned_professional_id: string | null;
  category_id: string | null;
  service_id: string | null;
  title: string;
  status: (typeof PROFESSIONAL_ACTIVE_JOB_STATUSES)[number];
  price_min: number | null;
  price_max: number | null;
  approx_location: string | null;
  created_at: string;
  updated_at: string;
}

interface AssignedJobDetailRow {
  id: string;
  assigned_professional_id: string | null;
  category_id: string | null;
  service_id: string | null;
  title: string;
  description: string;
  status: (typeof PROFESSIONAL_ACTIVE_JOB_STATUSES)[number];
  price_min: number | null;
  price_max: number | null;
  approx_location: string | null;
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

function mapJobRowToDomain(
  row: PublishedJobRow,
  categoryNameById: Map<string, string>,
  serviceNameById: Map<string, string>,
): ApiProfessionalPublishedJob {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: "published",
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
    createdAt: row.created_at,
    clientId: row.client_id,
    invitedCount: row.invited_count,
  };
}

function mapAssignedJobRowToDomain(
  row: AssignedJobRow,
  categoryNameById: Map<string, string>,
  serviceNameById: Map<string, string>,
): ApiProfessionalAssignedJob {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    categoryId: row.category_id,
    categoryName: row.category_id ? categoryNameById.get(row.category_id) ?? null : null,
    serviceId: row.service_id,
    serviceName: row.service_id ? serviceNameById.get(row.service_id) ?? null : null,
    approxLocation: row.approx_location,
    priceMin: row.price_min,
    priceMax: row.price_max,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAssignedJobDetailRowToDomain(
  row: AssignedJobDetailRow,
  categoryNameById: Map<string, string>,
  serviceNameById: Map<string, string>,
): ApiProfessionalAssignedJobDetail {
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
    priceMin: row.price_min,
    priceMax: row.price_max,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assignedProfessionalId: row.assigned_professional_id,
  };
}

export async function getPublishedJobsForProfessional(): Promise<ApiProfessionalPublishedJob[]> {
  if (!isSupabaseMode()) {
    return [];
  }

  const client = getBrowserSupabaseClient();
  const { categoryNameById, serviceNameById } = await getCatalogNameMaps();

  const { data, error } = await client
    .from("jobs")
    .select(
      "id, client_id, category_id, service_id, title, description, status, price_min, price_max, approx_location, approx_lat, approx_lng, approx_radius_m, invited_count, created_at",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .returns<PublishedJobRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapJobRowToDomain(row, categoryNameById, serviceNameById));
}

export async function getPublishedJobForProfessional(
  jobId: string,
): Promise<ApiProfessionalPublishedJob | null> {
  if (!isSupabaseMode()) {
    return null;
  }

  const client = getBrowserSupabaseClient();
  const { categoryNameById, serviceNameById } = await getCatalogNameMaps();

  const { data, error } = await client
    .from("jobs")
    .select(
      "id, client_id, category_id, service_id, title, description, status, price_min, price_max, approx_location, approx_lat, approx_lng, approx_radius_m, invited_count, created_at",
    )
    .eq("id", jobId)
    .eq("status", "published")
    .maybeSingle<PublishedJobRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapJobRowToDomain(data, categoryNameById, serviceNameById);
}

export async function getAssignedJobsForProfessional(): Promise<ApiProfessionalAssignedJob[]> {
  if (!isSupabaseMode()) {
    return [];
  }

  const currentProfile = await getCurrentProfile();

  if (
    !currentProfile ||
    currentProfile.role !== "professional" ||
    currentProfile.professionalStatus !== "approved"
  ) {
    return [];
  }

  const client = getBrowserSupabaseClient();
  const { categoryNameById, serviceNameById } = await getCatalogNameMaps();

  const { data, error } = await client
    .from("jobs")
    .select(
      "id, assigned_professional_id, category_id, service_id, title, status, price_min, price_max, approx_location, created_at, updated_at",
    )
    .eq("assigned_professional_id", currentProfile.id)
    .in("status", [...PROFESSIONAL_ACTIVE_JOB_STATUSES])
    .order("updated_at", { ascending: false })
    .returns<AssignedJobRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) =>
    mapAssignedJobRowToDomain(row, categoryNameById, serviceNameById),
  );
}

export async function getAssignedJobForProfessional(
  jobId: string,
): Promise<ApiProfessionalAssignedJobDetail | null> {
  if (!isSupabaseMode()) {
    return null;
  }

  const currentProfile = await getCurrentProfile();

  if (
    !currentProfile ||
    currentProfile.role !== "professional" ||
    currentProfile.professionalStatus !== "approved"
  ) {
    return null;
  }

  const client = getBrowserSupabaseClient();
  const { categoryNameById, serviceNameById } = await getCatalogNameMaps();

  const { data, error } = await client
    .from("jobs")
    .select(
      "id, assigned_professional_id, category_id, service_id, title, description, status, price_min, price_max, approx_location, created_at, updated_at",
    )
    .eq("id", jobId)
    .eq("assigned_professional_id", currentProfile.id)
    .in("status", [...PROFESSIONAL_ACTIVE_JOB_STATUSES])
    .maybeSingle<AssignedJobDetailRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapAssignedJobDetailRowToDomain(data, categoryNameById, serviceNameById);
}
