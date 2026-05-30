import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export type ApiSearchTicketReason = "no_pros_in_zone" | "no_useful_response" | "other";
export type ApiSearchTicketStatus = "open" | "in_progress" | "resolved" | "cancelled";

export interface ApiSearchTicket {
  id: string;
  jobId: string | null;
  clientId: string;
  clientName: string | null;
  serviceLabel: string | null;
  zone: string | null;
  radiusKm: number | null;
  reason: ApiSearchTicketReason;
  status: ApiSearchTicketStatus;
  createdAt: string;
  updatedAt: string;
  jobTitle: string | null;
}

interface SearchTicketRow {
  id: string;
  job_id: string | null;
  client_id: string;
  service_label: string | null;
  zone: string | null;
  radius_km: number | null;
  reason: ApiSearchTicketReason;
  status: ApiSearchTicketStatus;
  created_at: string;
  updated_at: string;
}

interface SearchTicketResultRow {
  result_ticket_id: string;
  result_job_id: string | null;
  result_client_id: string;
  result_service_label: string | null;
  result_zone: string | null;
  result_radius_km: number | null;
  result_reason: ApiSearchTicketReason;
  result_status: ApiSearchTicketStatus;
  result_created_at: string;
  result_updated_at: string;
}

interface ProfileNameRow {
  id: string;
  full_name: string;
}

interface JobTitleRow {
  id: string;
  title: string;
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

function mapSearchTicketRow(
  row: SearchTicketRow,
  clientNameById: Map<string, string>,
  jobTitleById: Map<string, string>,
): ApiSearchTicket {
  return {
    id: row.id,
    jobId: row.job_id,
    clientId: row.client_id,
    clientName: clientNameById.get(row.client_id) ?? null,
    serviceLabel: row.service_label,
    zone: row.zone,
    radiusKm: row.radius_km,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    jobTitle: row.job_id ? (jobTitleById.get(row.job_id) ?? null) : null,
  };
}

function mapSearchTicketResultRow(
  row: SearchTicketResultRow,
  clientNameById: Map<string, string>,
  jobTitleById: Map<string, string>,
): ApiSearchTicket {
  return {
    id: row.result_ticket_id,
    jobId: row.result_job_id,
    clientId: row.result_client_id,
    clientName: clientNameById.get(row.result_client_id) ?? null,
    serviceLabel: row.result_service_label,
    zone: row.result_zone,
    radiusKm: row.result_radius_km,
    reason: row.result_reason,
    status: row.result_status,
    createdAt: row.result_created_at,
    updatedAt: row.result_updated_at,
    jobTitle: row.result_job_id ? (jobTitleById.get(row.result_job_id) ?? null) : null,
  };
}

async function getProfileNameMap(profileIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(profileIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const client = getBrowserSupabaseClient();
  const { data, error } = await client
    .from("profiles")
    .select("id, full_name")
    .in("id", uniqueIds)
    .returns<ProfileNameRow[]>();

  if (error) throw error;

  return new Map((data ?? []).map((row) => [row.id, row.full_name]));
}

async function getJobTitleMap(jobIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(jobIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const client = getBrowserSupabaseClient();
  const { data, error } = await client
    .from("jobs")
    .select("id, title")
    .in("id", uniqueIds)
    .returns<JobTitleRow[]>();

  if (error) throw error;

  return new Map((data ?? []).map((row) => [row.id, row.title]));
}

function normalizeCreateSearchTicketError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();
  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile") ||
    message.includes("permission denied")
  ) {
    return new Error("Necesitas iniciar sesión para crear un ticket de búsqueda real.");
  }
  if (message.includes("only clients can create search tickets from jobs")) {
    return new Error("Solo el cliente propietario puede activar este ticket de búsqueda.");
  }
  if (message.includes("does not exist")) {
    return new Error("Este trabajo ya no existe o ya no está disponible para crear ticket.");
  }
  return new Error("No pudimos crear el ticket de búsqueda real. Inténtalo de nuevo.");
}

function normalizeUpdateSearchTicketError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();
  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile") ||
    message.includes("permission denied")
  ) {
    return new Error("Necesitas iniciar sesión como admin para actualizar tickets reales.");
  }
  if (message.includes("only admins can update search ticket status")) {
    return new Error("Solo admins pueden actualizar tickets reales.");
  }
  if (message.includes("does not exist")) {
    return new Error("Este ticket ya no existe.");
  }
  return new Error("No pudimos actualizar el ticket real. Inténtalo de nuevo.");
}

export async function getMySearchTicketByJobId(jobId: string): Promise<ApiSearchTicket | null> {
  if (!isSupabaseMode()) return null;

  const client = getBrowserSupabaseClient();
  const { data, error } = await client
    .from("search_tickets")
    .select("id, job_id, client_id, service_label, zone, radius_km, reason, status, created_at, updated_at")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SearchTicketRow>();

  if (error) throw error;
  if (!data) return null;

  const [clientNameById, jobTitleById] = await Promise.all([
    getProfileNameMap([data.client_id]),
    getJobTitleMap(data.job_id ? [data.job_id] : []),
  ]);

  return mapSearchTicketRow(data, clientNameById, jobTitleById);
}

export async function createSearchTicketFromJob(
  jobId: string,
  reason: ApiSearchTicketReason,
): Promise<ApiSearchTicket> {
  if (!isSupabaseMode()) {
    throw new Error("createSearchTicketFromJob() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const client = getBrowserSupabaseClient();
  const { data, error } = await client.rpc("create_search_ticket_from_job", {
    p_job_id: jobId,
    p_reason: reason,
  });

  if (error) throw normalizeCreateSearchTicketError(error);

  const row = Array.isArray(data)
    ? (data[0] as SearchTicketResultRow | undefined)
    : ((data as SearchTicketResultRow | null) ?? undefined);

  if (!row) {
    throw new Error("No pudimos crear el ticket de búsqueda real. Inténtalo de nuevo.");
  }

  const [clientNameById, jobTitleById] = await Promise.all([
    getProfileNameMap([row.result_client_id]),
    getJobTitleMap(row.result_job_id ? [row.result_job_id] : []),
  ]);

  return mapSearchTicketResultRow(row, clientNameById, jobTitleById);
}

export async function listAdminSearchTickets(): Promise<ApiSearchTicket[]> {
  if (!isSupabaseMode()) return [];

  const client = getBrowserSupabaseClient();
  const { data, error } = await client
    .from("search_tickets")
    .select("id, job_id, client_id, service_label, zone, radius_km, reason, status, created_at, updated_at")
    .order("created_at", { ascending: false })
    .returns<SearchTicketRow[]>();

  if (error) throw error;

  const rows = data ?? [];
  const [clientNameById, jobTitleById] = await Promise.all([
    getProfileNameMap(rows.map((row) => row.client_id)),
    getJobTitleMap(rows.map((row) => row.job_id ?? "")),
  ]);

  return rows.map((row) => mapSearchTicketRow(row, clientNameById, jobTitleById));
}

export async function updateSearchTicketStatus(
  ticketId: string,
  status: ApiSearchTicketStatus,
): Promise<ApiSearchTicket> {
  if (!isSupabaseMode()) {
    throw new Error("updateSearchTicketStatus() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const client = getBrowserSupabaseClient();
  const { data, error } = await client.rpc("update_search_ticket_status", {
    p_ticket_id: ticketId,
    p_status: status,
  });

  if (error) throw normalizeUpdateSearchTicketError(error);

  const row = Array.isArray(data)
    ? (data[0] as SearchTicketResultRow | undefined)
    : ((data as SearchTicketResultRow | null) ?? undefined);

  if (!row) {
    throw new Error("No pudimos actualizar el ticket real. Inténtalo de nuevo.");
  }

  const [clientNameById, jobTitleById] = await Promise.all([
    getProfileNameMap([row.result_client_id]),
    getJobTitleMap(row.result_job_id ? [row.result_job_id] : []),
  ]);

  return mapSearchTicketResultRow(row, clientNameById, jobTitleById);
}
