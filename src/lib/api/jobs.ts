import { getRealCatalogCategories, getRealCatalogServices } from "@/lib/api/catalog";
import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

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

interface JobRow {
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

function mapJobRowToDomain(
  row: JobRow,
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

export async function getPublishedJobsForProfessional(): Promise<ApiProfessionalPublishedJob[]> {
  if (!isSupabaseMode()) {
    return [];
  }

  const client = getBrowserSupabaseClient();

  const [categories, services] = await Promise.all([
    getRealCatalogCategories(),
    getRealCatalogServices(),
  ]);

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const serviceNameById = new Map(services.map((service) => [service.id, service.name]));

  const { data, error } = await client
    .from("jobs")
    .select(
      "id, client_id, category_id, service_id, title, description, status, price_min, price_max, approx_location, approx_lat, approx_lng, approx_radius_m, invited_count, created_at",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .returns<JobRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapJobRowToDomain(row, categoryNameById, serviceNameById));
}
