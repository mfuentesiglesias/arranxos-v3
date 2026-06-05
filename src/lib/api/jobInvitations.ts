import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export interface ApiJobInvitation {
  invitationId: string;
  jobId: string;
  professionalId: string;
  status: "pending" | "accepted" | "rejected" | "expired" | "cancelled";
  createdAt: string;
}

export interface ApiInvitableProfessionalCandidate {
  professionalId: string;
  displayName: string;
  avatarInitials: string | null;
  specialtyLabel: string | null;
  zone: string | null;
  matchedServiceId: string | null;
  matchedServiceName: string | null;
  isPrimaryService: boolean;
  matchKind: "service" | "category" | "fallback";
  reviewCount: number;
  averageRating: number | null;
  invitationId: string | null;
  invitationStatus: ApiJobInvitation["status"] | null;
  invitationCreatedAt: string | null;
}

export interface ApiProfessionalJobInvitation {
  invitationId: string;
  invitationStatus: ApiJobInvitation["status"];
  invitationCreatedAt: string;
  jobId: string;
  jobTitle: string;
  jobDescription: string;
  categoryId: string | null;
  categoryName: string | null;
  serviceId: string | null;
  serviceName: string | null;
  approxLocation: string | null;
  priceMin: number | null;
  priceMax: number | null;
  jobStatus: "published" | "in_progress" | "agreement_pending" | "agreed" | "escrow_funded" | "completed_pending_confirmation" | "completed" | "dispute" | "cancelled";
  requestId: string | null;
  requestStatus: "pending" | "accepted" | "rejected" | "closed" | "cancelled" | null;
  requestCreatedAt: string | null;
}

export interface ApiJobRequestFromInvitationResult {
  invitationId: string;
  invitationStatus: ApiJobInvitation["status"];
  requestId: string;
  requestStatus: "pending" | "accepted" | "rejected" | "closed" | "cancelled";
  jobId: string;
  professionalId: string;
  requestCreatedAt: string;
}

interface CreateJobInvitationRow {
  invitation_id: string;
  job_id: string;
  professional_id: string;
  status: ApiJobInvitation["status"];
  created_at: string;
}

interface InvitableProfessionalCandidateRow {
  professional_id: string;
  professional_display_name: string;
  professional_avatar_initials: string | null;
  professional_specialty_label: string | null;
  professional_zone: string | null;
  matched_service_id: string | null;
  matched_service_name: string | null;
  is_primary_service: boolean;
  match_kind: ApiInvitableProfessionalCandidate["matchKind"];
  review_count: number;
  average_rating: number | null;
  invitation_id: string | null;
  invitation_status: ApiInvitableProfessionalCandidate["invitationStatus"];
  invitation_created_at: string | null;
}

interface ProfessionalJobInvitationRow {
  invitation_id: string;
  invitation_status: ApiProfessionalJobInvitation["invitationStatus"];
  invitation_created_at: string;
  job_id: string;
  job_title: string;
  job_description: string;
  category_id: string | null;
  category_name: string | null;
  service_id: string | null;
  service_name: string | null;
  approx_location: string | null;
  price_min: number | null;
  price_max: number | null;
  job_status: ApiProfessionalJobInvitation["jobStatus"];
  request_id: string | null;
  request_status: ApiProfessionalJobInvitation["requestStatus"];
  request_created_at: string | null;
}

interface CreateJobRequestFromInvitationRow {
  invitation_id: string;
  invitation_status: ApiJobRequestFromInvitationResult["invitationStatus"];
  request_id: string;
  request_status: ApiJobRequestFromInvitationResult["requestStatus"];
  job_id: string;
  professional_id: string;
  request_created_at: string;
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

function mapCreateJobInvitationRow(row: CreateJobInvitationRow): ApiJobInvitation {
  return {
    invitationId: row.invitation_id,
    jobId: row.job_id,
    professionalId: row.professional_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapInvitableProfessionalCandidateRow(
  row: InvitableProfessionalCandidateRow,
): ApiInvitableProfessionalCandidate {
  return {
    professionalId: row.professional_id,
    displayName: row.professional_display_name,
    avatarInitials: row.professional_avatar_initials,
    specialtyLabel: row.professional_specialty_label,
    zone: row.professional_zone,
    matchedServiceId: row.matched_service_id,
    matchedServiceName: row.matched_service_name,
    isPrimaryService: row.is_primary_service,
    matchKind: row.match_kind,
    reviewCount: row.review_count,
    averageRating: row.average_rating,
    invitationId: row.invitation_id,
    invitationStatus: row.invitation_status,
    invitationCreatedAt: row.invitation_created_at,
  };
}

function mapProfessionalJobInvitationRow(
  row: ProfessionalJobInvitationRow,
): ApiProfessionalJobInvitation {
  return {
    invitationId: row.invitation_id,
    invitationStatus: row.invitation_status,
    invitationCreatedAt: row.invitation_created_at,
    jobId: row.job_id,
    jobTitle: row.job_title,
    jobDescription: row.job_description,
    categoryId: row.category_id,
    categoryName: row.category_name,
    serviceId: row.service_id,
    serviceName: row.service_name,
    approxLocation: row.approx_location,
    priceMin: row.price_min,
    priceMax: row.price_max,
    jobStatus: row.job_status,
    requestId: row.request_id,
    requestStatus: row.request_status,
    requestCreatedAt: row.request_created_at,
  };
}

function mapCreateJobRequestFromInvitationRow(
  row: CreateJobRequestFromInvitationRow,
): ApiJobRequestFromInvitationResult {
  return {
    invitationId: row.invitation_id,
    invitationStatus: row.invitation_status,
    requestId: row.request_id,
    requestStatus: row.request_status,
    jobId: row.job_id,
    professionalId: row.professional_id,
    requestCreatedAt: row.request_created_at,
  };
}

function normalizeCreateJobInvitationError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile") ||
    message.includes("jwt")
  ) {
    return new Error("Necesitas iniciar sesión para enviar invitaciones reales.");
  }

  if (
    message.includes("only clients can create job invitations") ||
    message.includes("only the client owner of job") ||
    message.includes("cannot invite their own client profile") ||
    message.includes("permission denied")
  ) {
    return new Error("No puedes invitar profesionales en este trabajo.");
  }

  if (
    message.includes("job") &&
    message.includes("does not exist")
  ) {
    return new Error("Este trabajo no existe o no te pertenece.");
  }

  if (
    message.includes("not in published status") ||
    message.includes("already has an assigned professional")
  ) {
    return new Error("Este trabajo ya no admite invitaciones reales.");
  }

  if (
    message.includes("is not approved") ||
    message.includes("is not a professional") ||
    message.includes("professional profile")
  ) {
    return new Error("Solo puedes invitar profesionales aprobados.");
  }

  if (message.includes("already exists")) {
    return new Error("Ya existe una invitación para este profesional en este trabajo.");
  }

  if (message.includes("reached the invitation limit")) {
    return new Error("Ya has alcanzado el límite de invitaciones para este trabajo.");
  }

  return new Error("No pudimos enviar la invitación real. Inténtalo de nuevo.");
}

function normalizeListInvitableProfessionalsError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile") ||
    message.includes("jwt")
  ) {
    return new Error("Necesitas iniciar sesión para ver candidatos reales.");
  }

  if (
    message.includes("only clients can list invitable professionals") ||
    message.includes("only the client owner of job") ||
    message.includes("permission denied")
  ) {
    return new Error("No puedes ver profesionales para este trabajo.");
  }

  if (
    message.includes("job") &&
    message.includes("does not exist")
  ) {
    return new Error("Este trabajo no existe o no te pertenece.");
  }

  if (
    message.includes("not in published status") ||
    message.includes("already has an assigned professional")
  ) {
    return new Error("Este trabajo ya no admite invitaciones reales.");
  }

  return new Error("No pudimos cargar los profesionales disponibles. Inténtalo de nuevo.");
}

function normalizeListMyProfessionalInvitationsError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile") ||
    message.includes("jwt")
  ) {
    return new Error("Necesitas iniciar sesión para ver tus invitaciones reales.");
  }

  if (
    message.includes("only professionals can list received invitations") ||
    message.includes("permission denied")
  ) {
    return new Error("No puedes ver invitaciones reales con esta cuenta.");
  }

  if (message.includes("only approved professionals can list received invitations")) {
    return new Error("Solo profesionales aprobados pueden ver invitaciones reales.");
  }

  return new Error("No pudimos cargar tus invitaciones reales. Inténtalo de nuevo.");
}

function normalizeCreateJobRequestFromInvitationError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile") ||
    message.includes("jwt")
  ) {
    return new Error("Necesitas iniciar sesión para responder invitaciones reales.");
  }

  if (
    message.includes("only approved professionals can respond to job invitations") ||
    message.includes("only professionals can respond to job invitations")
  ) {
    return new Error("Solo profesionales aprobados pueden responder invitaciones reales.");
  }

  if (
    message.includes("invitation id is required") ||
    (message.includes("job invitation") && message.includes("does not exist")) ||
    message.includes("does not belong to the current professional")
  ) {
    return new Error("Esta invitación no existe o no te pertenece.");
  }

  if (message.includes("is not pending")) {
    return new Error("Esta invitación ya no está pendiente.");
  }

  if (message.includes("is not published")) {
    return new Error("Este trabajo ya no está publicado.");
  }

  if (message.includes("already has an assigned professional")) {
    return new Error("Este trabajo ya tiene un profesional asignado.");
  }

  if (message.includes("already exists")) {
    return new Error("Ya existe una solicitud para este trabajo.");
  }

  return new Error("No pudimos enviar la solicitud desde la invitación. Inténtalo de nuevo.");
}

export async function listInvitableProfessionalsForJob(
  jobId: string,
): Promise<ApiInvitableProfessionalCandidate[]> {
  if (!isSupabaseMode()) {
    throw new Error("listInvitableProfessionalsForJob() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const client = getBrowserSupabaseClient();
  const { data, error } = await client.rpc(
    "get_client_job_invitable_professionals_with_public_info",
    {
      p_job_id: jobId,
    },
  );

  if (error) {
    throw normalizeListInvitableProfessionalsError(error);
  }

  return ((data as InvitableProfessionalCandidateRow[] | null) ?? []).map(
    mapInvitableProfessionalCandidateRow,
  );
}

export async function listMyProfessionalInvitations(): Promise<ApiProfessionalJobInvitation[]> {
  if (!isSupabaseMode()) {
    throw new Error("listMyProfessionalInvitations() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const client = getBrowserSupabaseClient();
  const { data, error } = await client.rpc(
    "get_professional_job_invitations_with_public_job_info",
  );

  if (error) {
    throw normalizeListMyProfessionalInvitationsError(error);
  }

  return ((data as ProfessionalJobInvitationRow[] | null) ?? []).map(
    mapProfessionalJobInvitationRow,
  );
}

export async function createJobInvitation(
  jobId: string,
  professionalId: string,
): Promise<ApiJobInvitation> {
  if (!isSupabaseMode()) {
    throw new Error("createJobInvitation() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const client = getBrowserSupabaseClient();
  const { data, error } = await client.rpc("create_job_invitation", {
    p_job_id: jobId,
    p_professional_id: professionalId,
  });

  if (error) {
    throw normalizeCreateJobInvitationError(error);
  }

  const row = Array.isArray(data)
    ? (data[0] as CreateJobInvitationRow | undefined)
    : ((data as CreateJobInvitationRow | null) ?? undefined);

  if (!row) {
    throw new Error("No pudimos enviar la invitación real. Inténtalo de nuevo.");
  }

  return mapCreateJobInvitationRow(row);
}

export async function createJobRequestFromInvitation(
  invitationId: string,
  message?: string,
): Promise<ApiJobRequestFromInvitationResult> {
  if (!isSupabaseMode()) {
    throw new Error("createJobRequestFromInvitation() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const client = getBrowserSupabaseClient();
  const { data, error } = await client.rpc("create_job_request_from_invitation", {
    p_invitation_id: invitationId,
    p_message: message?.trim() || null,
  });

  if (error) {
    throw normalizeCreateJobRequestFromInvitationError(error);
  }

  const row = Array.isArray(data)
    ? (data[0] as CreateJobRequestFromInvitationRow | undefined)
    : ((data as CreateJobRequestFromInvitationRow | null) ?? undefined);

  if (!row) {
    throw new Error("No pudimos enviar la solicitud desde la invitación. Inténtalo de nuevo.");
  }

  return mapCreateJobRequestFromInvitationRow(row);
}
