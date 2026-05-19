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

export interface ApiClientJobRequestWithProfessionalInfo {
  requestId: string;
  jobId: string;
  professionalId: string;
  requestStatus: "pending" | "accepted" | "rejected" | "closed" | "cancelled";
  requestMessage: string | null;
  requestCreatedAt: string;
  professionalDisplayName: string;
  professionalAvatarInitials: string | null;
  professionalSpecialtyLabel: string | null;
  professionalZone: string | null;
  professionalStatus: "pending" | "approved" | "blocked";
  professionalVerificationStatus: "not_verified" | "pending" | "verified" | "rejected";
  professionalPublicProfileEnabled: boolean;
}

export interface ApiAcceptJobRequestResult {
  jobId: string;
  professionalId: string;
  chatId: string;
}

interface JobRequestRow {
  id: string;
  job_id: string;
  professional_id: string;
  status: string;
  message: string | null;
  created_at: string;
}

interface ClientJobRequestWithProfessionalInfoRow {
  request_id: string;
  job_id: string;
  professional_id: string;
  request_status: "pending" | "accepted" | "rejected" | "closed" | "cancelled";
  request_message: string | null;
  request_created_at: string;
  professional_display_name: string;
  professional_avatar_initials: string | null;
  professional_specialty_label: string | null;
  professional_zone: string | null;
  professional_status: "pending" | "approved" | "blocked";
  professional_verification_status: "not_verified" | "pending" | "verified" | "rejected";
  professional_public_profile_enabled: boolean;
}

interface AcceptJobRequestRow {
  result_job_id: string;
  result_professional_id: string;
  result_chat_id: string;
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

function normalizeGetClientJobRequestsWithProfessionalInfoError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("only the job owner or an admin") ||
    message.includes("authentication required") ||
    message.includes("permission denied")
  ) {
    return new Error("No puedes ver las solicitudes de este trabajo.");
  }

  if (message.includes("does not exist")) {
    return new Error("Este trabajo no existe o ya no está disponible.");
  }

  return new Error("No pudimos cargar las solicitudes de este trabajo. Inténtalo de nuevo.");
}

function normalizeAcceptJobRequestError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("only the client owner") ||
    message.includes("only the client owner can accept a job request") ||
    message.includes("authentication required") ||
    message.includes("current user does not have a profile") ||
    message.includes("permission denied")
  ) {
    return new Error("No puedes aceptar solicitudes de este trabajo.");
  }

  if (
    message.includes("could not be created or loaded") ||
    message.includes("existing chat")
  ) {
    return new Error(
      "Hay un problema con el chat existente de este trabajo. Revisa los datos de prueba.",
    );
  }

  if (
    message.includes("professional profile for request") ||
    message.includes("no longer approved")
  ) {
    return new Error("Este profesional ya no está disponible para ser aceptado.");
  }

  if (message.includes("is not pending")) {
    return new Error("Esta solicitud ya no está pendiente.");
  }

  if (
    message.includes("not in published status") ||
    message.includes("already has an assigned professional")
  ) {
    return new Error("Este trabajo ya no admite aceptar solicitudes.");
  }

  if (
    message.includes("job request") &&
    message.includes("does not exist")
  ) {
    return new Error("Esta solicitud ya no existe o ya no está disponible.");
  }

  return new Error("No pudimos aceptar la solicitud. Inténtalo de nuevo.");
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

function mapClientJobRequestWithProfessionalInfoRow(
  row: ClientJobRequestWithProfessionalInfoRow,
): ApiClientJobRequestWithProfessionalInfo {
  return {
    requestId: row.request_id,
    jobId: row.job_id,
    professionalId: row.professional_id,
    requestStatus: row.request_status,
    requestMessage: row.request_message,
    requestCreatedAt: row.request_created_at,
    professionalDisplayName: row.professional_display_name,
    professionalAvatarInitials: row.professional_avatar_initials,
    professionalSpecialtyLabel: row.professional_specialty_label,
    professionalZone: row.professional_zone,
    professionalStatus: row.professional_status,
    professionalVerificationStatus: row.professional_verification_status,
    professionalPublicProfileEnabled: row.professional_public_profile_enabled,
  };
}

function mapAcceptJobRequestRow(row: AcceptJobRequestRow): ApiAcceptJobRequestResult {
  return {
    jobId: row.result_job_id,
    professionalId: row.result_professional_id,
    chatId: row.result_chat_id,
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

export async function getClientJobRequestsWithProfessionalInfo(
  jobId: string,
): Promise<ApiClientJobRequestWithProfessionalInfo[]> {
  if (!isSupabaseMode()) {
    return [];
  }

  const client = getBrowserSupabaseClient();

  const { data, error } = await client.rpc(
    "get_client_job_requests_with_professional_public_info",
    {
      p_job_id: jobId,
    },
  );

  if (error) {
    throw normalizeGetClientJobRequestsWithProfessionalInfoError(error);
  }

  return ((data as ClientJobRequestWithProfessionalInfoRow[] | null) ?? []).map(
    mapClientJobRequestWithProfessionalInfoRow,
  );
}

export async function acceptJobRequest(
  requestId: string,
): Promise<ApiAcceptJobRequestResult> {
  if (!isSupabaseMode()) {
    throw new Error("acceptJobRequest() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const client = getBrowserSupabaseClient();

  const { data, error } = await client.rpc("accept_job_request", {
    p_request_id: requestId,
  });

  if (error) {
    throw normalizeAcceptJobRequestError(error);
  }

  const result = Array.isArray(data)
    ? (data[0] as AcceptJobRequestRow | undefined)
    : ((data as AcceptJobRequestRow | null) ?? undefined);

  if (!result) {
    throw new Error("No pudimos aceptar la solicitud. Inténtalo de nuevo.");
  }

  return mapAcceptJobRequestRow(result);
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
