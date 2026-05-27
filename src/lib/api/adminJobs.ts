import type { JobStatus } from "@/lib/types";
import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export interface ApiAdminJobListItem {
  id: string;
  title: string;
  status: JobStatus;
  approxLocation: string | null;
  priceMin: number | null;
  priceMax: number | null;
  createdAt: string;
  clientId: string;
  assignedProfessionalId: string | null;
  categoryId: string | null;
  serviceId: string | null;
  clientName: string | null;
  professionalName: string | null;
  categoryName: string | null;
  serviceName: string | null;
}

interface AdminJobRow {
  id: string;
  title: string;
  status: JobStatus;
  approx_location: string | null;
  price_min: number | null;
  price_max: number | null;
  created_at: string;
  client_id: string;
  assigned_professional_id: string | null;
  category_id: string | null;
  service_id: string | null;
}

interface AdminJobProfileRow {
  id: string;
  full_name: string;
}

interface AdminJobCategoryRow {
  id: string;
  name: string;
}

interface AdminJobServiceRow {
  id: string;
  name: string;
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

function normalizeGetAdminJobsError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile")
  ) {
    return new Error("Necesitas iniciar sesión para consultar los trabajos reales.");
  }

  if (message.includes("permission denied") || message.includes("only admins")) {
    return new Error("Solo admins pueden consultar los trabajos reales.");
  }

  return new Error("No pudimos cargar los trabajos reales. Inténtalo de nuevo.");
}

function mapRowsToMap<T extends { id: string }>(rows: T[] | null): Map<string, T> {
  return new Map((rows ?? []).map((row) => [row.id, row]));
}

function mapAdminJobRow(
  row: AdminJobRow,
  profileMap: Map<string, AdminJobProfileRow>,
  categoryMap: Map<string, AdminJobCategoryRow>,
  serviceMap: Map<string, AdminJobServiceRow>,
): ApiAdminJobListItem {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    approxLocation: row.approx_location,
    priceMin: row.price_min,
    priceMax: row.price_max,
    createdAt: row.created_at,
    clientId: row.client_id,
    assignedProfessionalId: row.assigned_professional_id,
    categoryId: row.category_id,
    serviceId: row.service_id,
    clientName: profileMap.get(row.client_id)?.full_name ?? null,
    professionalName: row.assigned_professional_id
      ? (profileMap.get(row.assigned_professional_id)?.full_name ?? null)
      : null,
    categoryName: row.category_id ? (categoryMap.get(row.category_id)?.name ?? null) : null,
    serviceName: row.service_id ? (serviceMap.get(row.service_id)?.name ?? null) : null,
  };
}

export async function getAdminJobs(): Promise<ApiAdminJobListItem[] | null> {
  if (!isSupabaseMode()) {
    return null;
  }

  const client = getBrowserSupabaseClient();

  try {
    const { data: jobRows, error: jobsError } = await client
      .from("jobs")
      .select(
        "id, title, status, approx_location, price_min, price_max, created_at, client_id, assigned_professional_id, category_id, service_id",
      )
      .order("created_at", { ascending: false })
      .returns<AdminJobRow[]>();

    if (jobsError) {
      throw jobsError;
    }

    const jobs = jobRows ?? [];

    if (jobs.length === 0) {
      return [];
    }

    const profileIds = [...new Set(
      jobs.flatMap((job) => [job.client_id, job.assigned_professional_id].filter(Boolean) as string[]),
    )];
    const categoryIds = [...new Set(jobs.map((job) => job.category_id).filter(Boolean) as string[])];
    const serviceIds = [...new Set(jobs.map((job) => job.service_id).filter(Boolean) as string[])];

    const [profilesResponse, categoriesResponse, servicesResponse] = await Promise.all([
      profileIds.length > 0
        ? client
            .from("profiles")
            .select("id, full_name")
            .in("id", profileIds)
            .returns<AdminJobProfileRow[]>()
        : Promise.resolve({ data: [] as AdminJobProfileRow[], error: null }),
      categoryIds.length > 0
        ? client
            .from("catalog_categories")
            .select("id, name")
            .in("id", categoryIds)
            .returns<AdminJobCategoryRow[]>()
        : Promise.resolve({ data: [] as AdminJobCategoryRow[], error: null }),
      serviceIds.length > 0
        ? client
            .from("catalog_services")
            .select("id, name")
            .in("id", serviceIds)
            .returns<AdminJobServiceRow[]>()
        : Promise.resolve({ data: [] as AdminJobServiceRow[], error: null }),
    ]);

    if (profilesResponse.error) {
      throw profilesResponse.error;
    }

    if (categoriesResponse.error) {
      throw categoriesResponse.error;
    }

    if (servicesResponse.error) {
      throw servicesResponse.error;
    }

    const profileMap = mapRowsToMap(profilesResponse.data);
    const categoryMap = mapRowsToMap(categoriesResponse.data);
    const serviceMap = mapRowsToMap(servicesResponse.data);

    return jobs.map((row) => mapAdminJobRow(row, profileMap, categoryMap, serviceMap));
  } catch (error) {
    throw normalizeGetAdminJobsError(error);
  }
}
