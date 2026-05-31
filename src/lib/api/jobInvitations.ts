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
