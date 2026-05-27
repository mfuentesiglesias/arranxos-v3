import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export interface ApiAdminJobRequestListItem {
  id: string;
  jobId: string;
  professionalId: string;
  status: string;
  createdAt: string;
  jobTitle: string | null;
  jobStatus: string | null;
  approxLocation: string | null;
  clientName: string | null;
  professionalName: string | null;
  categoryName: string | null;
  serviceName: string | null;
}

interface AdminJobRequestRow {
  id: string;
  job_id: string;
  professional_id: string;
  status: string;
  created_at: string;
}

interface AdminJobRequestJobRow {
  id: string;
  title: string;
  status: string;
  approx_location: string | null;
  category_id: string | null;
  service_id: string | null;
  client_id: string;
}

interface AdminJobRequestProfileRow {
  id: string;
  full_name: string;
}

interface AdminJobRequestCategoryRow {
  id: string;
  name: string;
}

interface AdminJobRequestServiceRow {
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

function normalizeGetAdminJobRequestsError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile")
  ) {
    return new Error("Necesitas iniciar sesión para consultar las solicitudes reales.");
  }

  if (message.includes("permission denied") || message.includes("only admins")) {
    return new Error("Solo admins pueden consultar las solicitudes reales.");
  }

  return new Error("No pudimos cargar las solicitudes reales. Inténtalo de nuevo.");
}

function mapRowsToMap<T extends { id: string }>(rows: T[] | null): Map<string, T> {
  return new Map((rows ?? []).map((row) => [row.id, row]));
}

function mapAdminJobRequestRow(
  row: AdminJobRequestRow,
  jobMap: Map<string, AdminJobRequestJobRow>,
  profileMap: Map<string, AdminJobRequestProfileRow>,
  categoryMap: Map<string, AdminJobRequestCategoryRow>,
  serviceMap: Map<string, AdminJobRequestServiceRow>,
): ApiAdminJobRequestListItem {
  const job = jobMap.get(row.job_id);

  return {
    id: row.id,
    jobId: row.job_id,
    professionalId: row.professional_id,
    status: row.status,
    createdAt: row.created_at,
    jobTitle: job?.title ?? null,
    jobStatus: job?.status ?? null,
    approxLocation: job?.approx_location ?? null,
    clientName: job ? (profileMap.get(job.client_id)?.full_name ?? null) : null,
    professionalName: profileMap.get(row.professional_id)?.full_name ?? null,
    categoryName: job?.category_id ? (categoryMap.get(job.category_id)?.name ?? null) : null,
    serviceName: job?.service_id ? (serviceMap.get(job.service_id)?.name ?? null) : null,
  };
}

export async function getAdminJobRequests(): Promise<ApiAdminJobRequestListItem[] | null> {
  if (!isSupabaseMode()) {
    return null;
  }

  const client = getBrowserSupabaseClient();

  try {
    const { data: requestRows, error: requestError } = await client
      .from("job_requests")
      .select("id, job_id, professional_id, status, created_at")
      .order("created_at", { ascending: false })
      .returns<AdminJobRequestRow[]>();

    if (requestError) {
      throw requestError;
    }

    const requests = requestRows ?? [];

    if (requests.length === 0) {
      return [];
    }

    const jobIds = [...new Set(requests.map((request) => request.job_id))];

    const { data: jobRows, error: jobError } = await client
      .from("jobs")
      .select("id, title, status, approx_location, category_id, service_id, client_id")
      .in("id", jobIds)
      .returns<AdminJobRequestJobRow[]>();

    if (jobError) {
      throw jobError;
    }

    const jobs = jobRows ?? [];
    const jobMap = mapRowsToMap(jobs);

    const profileIds = [...new Set(
      [
        ...requests.map((request) => request.professional_id),
        ...jobs.map((job) => job.client_id),
      ],
    )];

    const categoryIds = [...new Set(jobs.map((job) => job.category_id).filter(Boolean) as string[])];
    const serviceIds = [...new Set(jobs.map((job) => job.service_id).filter(Boolean) as string[])];

    const [profilesResponse, categoriesResponse, servicesResponse] = await Promise.all([
      profileIds.length > 0
        ? client
            .from("profiles")
            .select("id, full_name")
            .in("id", profileIds)
            .returns<AdminJobRequestProfileRow[]>()
        : Promise.resolve({ data: [] as AdminJobRequestProfileRow[], error: null }),
      categoryIds.length > 0
        ? client
            .from("catalog_categories")
            .select("id, name")
            .in("id", categoryIds)
            .returns<AdminJobRequestCategoryRow[]>()
        : Promise.resolve({ data: [] as AdminJobRequestCategoryRow[], error: null }),
      serviceIds.length > 0
        ? client
            .from("catalog_services")
            .select("id, name")
            .in("id", serviceIds)
            .returns<AdminJobRequestServiceRow[]>()
        : Promise.resolve({ data: [] as AdminJobRequestServiceRow[], error: null }),
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

    return requests.map((row) => mapAdminJobRequestRow(row, jobMap, profileMap, categoryMap, serviceMap));
  } catch (error) {
    throw normalizeGetAdminJobRequestsError(error);
  }
}
