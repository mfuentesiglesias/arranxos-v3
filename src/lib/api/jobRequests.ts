import { getRealCatalogCategories, getRealCatalogServices } from "@/lib/api/catalog";
import { getCurrentProfile } from "@/lib/api/profiles";
import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type ProfessionalVisibleRequestStatus = "pending" | "accepted";

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

export interface ApiProfessionalJobRequest {
  id: string;
  jobId: string;
  status: ProfessionalVisibleRequestStatus;
  createdAt: string;
  jobTitle: string;
  jobStatus: string;
  categoryId: string | null;
  categoryName: string | null;
  serviceId: string | null;
  serviceName: string | null;
  approxLocation: string | null;
  priceMin: number | null;
  priceMax: number | null;
  jobCreatedAt: string;
  jobUpdatedAt: string;
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

interface JobSummaryRow {
  id: string;
  category_id: string | null;
  service_id: string | null;
  title: string;
  status: string;
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

function mapProfessionalJobRequest(
  row: JobRequestRow,
  job: JobSummaryRow,
  categoryNameById: Map<string, string>,
  serviceNameById: Map<string, string>,
): ApiProfessionalJobRequest {
  return {
    id: row.id,
    jobId: row.job_id,
    status: row.status as ProfessionalVisibleRequestStatus,
    createdAt: row.created_at,
    jobTitle: job.title,
    jobStatus: job.status,
    categoryId: job.category_id,
    categoryName: job.category_id ? categoryNameById.get(job.category_id) ?? null : null,
    serviceId: job.service_id,
    serviceName: job.service_id ? serviceNameById.get(job.service_id) ?? null : null,
    approxLocation: job.approx_location,
    priceMin: job.price_min,
    priceMax: job.price_max,
    jobCreatedAt: job.created_at,
    jobUpdatedAt: job.updated_at,
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

export async function listMyProfessionalJobRequests(): Promise<ApiProfessionalJobRequest[]> {
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
    .from("job_requests")
    .select("id, job_id, professional_id, message, status, created_at")
    .eq("professional_id", currentProfile.id)
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false })
    .returns<JobRequestRow[]>();

  if (error) {
    throw error;
  }

  const requestRows = data ?? [];

  if (requestRows.length === 0) {
    return [];
  }

  const jobIds = Array.from(new Set(requestRows.map((row) => row.job_id)));
  const { data: jobRows, error: jobsError } = await client
    .from("jobs")
    .select(
      "id, category_id, service_id, title, status, price_min, price_max, approx_location, created_at, updated_at",
    )
    .in("id", jobIds)
    .returns<JobSummaryRow[]>();

  if (jobsError) {
    throw jobsError;
  }

  const jobsById = new Map((jobRows ?? []).map((job) => [job.id, job]));

  return requestRows
    .map((row) => {
      const job = jobsById.get(row.job_id);
      if (!job) {
        return null;
      }

      return mapProfessionalJobRequest(row, job, categoryNameById, serviceNameById);
    })
    .filter((request): request is ApiProfessionalJobRequest => request !== null);
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

function normalizeRejectJobRequestError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("only the client owner") ||
    message.includes("only the client owner can reject") ||
    message.includes("authentication required") ||
    message.includes("current user does not have a profile") ||
    message.includes("permission denied")
  ) {
    return new Error("No puedes rechazar solicitudes de este trabajo.");
  }

  if (message.includes("does not exist")) {
    return new Error("Esta solicitud ya no existe o ya no está disponible.");
  }

  if (message.includes("is not pending")) {
    return new Error("Esta solicitud ya no está pendiente.");
  }

  if (
    message.includes("not in published status") ||
    message.includes("not in published")
  ) {
    return new Error("Este trabajo ya no admite gestionar solicitudes.");
  }

  return new Error("No pudimos rechazar la solicitud. Inténtalo de nuevo.");
}

export async function rejectJobRequest(
  requestId: string,
): Promise<void> {
  if (!isSupabaseMode()) {
    throw new Error("rejectJobRequest() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const client = getBrowserSupabaseClient();

  const { error } = await client.rpc("reject_job_request", {
    p_request_id: requestId,
  });

  if (error) {
    throw normalizeRejectJobRequestError(error);
  }
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
