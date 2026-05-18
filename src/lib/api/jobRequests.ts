import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export interface ApiJobRequest {
  id: string;
  jobId: string;
  professionalId: string;
  status: string;
  message: string | null;
  createdAt: string;
}

export interface ApiClientJobRequest {
  id: string;
  jobId: string;
  professionalId: string;
  message: string | null;
  status: "pending" | "accepted" | "rejected" | "closed" | "cancelled";
  createdAt: string;
}

interface JobRequestRow {
  id: string;
  job_id: string;
  professional_id: string;
  status: string;
  message: string | null;
  created_at: string;
}

function normalizeCreateJobRequestError(error: unknown): Error {
  const rawMessage = error instanceof Error ? error.message : "";
  const message = rawMessage.toLowerCase();

  if (message.includes("already exists")) {
    return new Error("Ya has solicitado este trabajo.");
  }

  if (
    message.includes("approved and active") ||
    message.includes("only approved professionals")
  ) {
    return new Error("Solo profesionales aprobados pueden solicitar trabajos reales.");
  }

  if (
    message.includes("not published") ||
    message.includes("already has an assigned professional") ||
    message.includes("does not exist")
  ) {
    return new Error("Este trabajo ya no está disponible para nuevas solicitudes.");
  }

  if (message.includes("does not have a profile")) {
    return new Error("Tu sesión no tiene un perfil profesional válido.");
  }

  return new Error("No pudimos enviar la solicitud. Inténtalo de nuevo.");
}

function mapJobRequestRow(row: JobRequestRow): ApiJobRequest {
  return {
    id: row.id,
    jobId: row.job_id,
    professionalId: row.professional_id,
    status: row.status,
    message: row.message,
    createdAt: row.created_at,
  };
}

function mapClientJobRequestRow(row: JobRequestRow): ApiClientJobRequest {
  return {
    id: row.id,
    jobId: row.job_id,
    professionalId: row.professional_id,
    message: row.message,
    status: row.status as ApiClientJobRequest["status"],
    createdAt: row.created_at,
  };
}

export async function getJobRequestsForClientJob(
  jobId: string,
): Promise<ApiClientJobRequest[]> {
  if (!isSupabaseMode()) {
    return [];
  }

  const client = getBrowserSupabaseClient();

  const { data, error } = await client
    .from("job_requests")
    .select("id, job_id, professional_id, message, status, created_at")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .returns<JobRequestRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapClientJobRequestRow);
}

export async function createJobRequest(
  jobId: string,
  message?: string,
): Promise<ApiJobRequest> {
  if (!isSupabaseMode()) {
    throw new Error("createJobRequest() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const client = getBrowserSupabaseClient();

  const { data, error } = await client.rpc("create_job_request", {
    p_job_id: jobId,
    p_message: message?.trim() || null,
  });

  if (error) {
    throw normalizeCreateJobRequestError(error);
  }

  return mapJobRequestRow(data as JobRequestRow);
}
