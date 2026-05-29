import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type { CatalogCategory, CatalogService } from "@/lib/types";

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

function mapCatalogServiceRow(
  row: CatalogServiceRow,
  categoryName?: string,
): CatalogService {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: categoryName ?? row.category_id,
    name: row.name,
    description: row.description ?? undefined,
    aliases: row.aliases ?? [],
    active: row.active,
    source: row.source,
    createdFromRequestId: row.created_from_request_id ?? undefined,
  };
}

export async function getRealCatalogCategories(): Promise<CatalogCategory[]> {
  if (!isSupabaseMode()) {
    return [];
  }

  const client = getBrowserSupabaseClient();

  const { data, error } = await client
    .from("catalog_categories")
    .select("id, name, icon, group_name, color, active, source, created_from_request_id")
    .eq("active", true)
    .order("name", { ascending: true })
    .returns<CatalogCategoryRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapCatalogCategoryRow);
}

export async function getRealCatalogServices(): Promise<CatalogService[]> {
  if (!isSupabaseMode()) {
    return [];
  }

  const client = getBrowserSupabaseClient();

  const { data: categoryRows, error: categoryError } = await client
    .from("catalog_categories")
    .select("id, name")
    .eq("active", true)
    .returns<{ id: string; name: string }[]>();

  if (categoryError) {
    throw categoryError;
  }

  const categoryNameById = new Map(
    (categoryRows ?? []).map((row) => [row.id, row.name]),
  );

  const { data: serviceRows, error: serviceError } = await client
    .from("catalog_services")
    .select("id, category_id, name, description, aliases, active, source, created_from_request_id")
    .eq("active", true)
    .order("name", { ascending: true })
    .returns<CatalogServiceRow[]>();

  if (serviceError) {
    throw serviceError;
  }

  return (serviceRows ?? []).map((row) =>
    mapCatalogServiceRow(row, categoryNameById.get(row.category_id)),
  );
}
