import type { ApiProfileRole, ApiProfessionalStatus } from "@/lib/api/profiles";
import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export interface ApiAdminUserListItem {
  id: string;
  role: ApiProfileRole;
  fullName: string;
  avatarInitials: string | null;
  createdAt: string;
  professionalStatus: ApiProfessionalStatus | null;
}

interface AdminUserProfileRow {
  id: string;
  role: ApiProfileRole;
  full_name: string;
  avatar_initials: string | null;
  created_at: string;
}

interface AdminUserProfessionalRow {
  profile_id: string;
  status: ApiProfessionalStatus;
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

function normalizeGetAdminUsersError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile")
  ) {
    return new Error("Necesitas iniciar sesión para consultar los perfiles reales.");
  }

  if (message.includes("permission denied") || message.includes("only admins")) {
    return new Error("Solo admins pueden consultar los perfiles reales.");
  }

  return new Error("No pudimos cargar los perfiles reales. Inténtalo de nuevo.");
}

export async function getAdminUsers(): Promise<ApiAdminUserListItem[] | null> {
  if (!isSupabaseMode()) {
    return null;
  }

  const client = getBrowserSupabaseClient();

  try {
    const { data: profileRows, error: profilesError } = await client
      .from("profiles")
      .select("id, role, full_name, avatar_initials, created_at")
      .order("created_at", { ascending: false })
      .returns<AdminUserProfileRow[]>();

    if (profilesError) {
      throw profilesError;
    }

    const profiles = profileRows ?? [];

    if (profiles.length === 0) {
      return [];
    }

    const professionalIds = profiles
      .filter((profile) => profile.role === "professional")
      .map((profile) => profile.id);

    const { data: professionalRows, error: professionalsError } = professionalIds.length > 0
      ? await client
          .from("professionals")
          .select("profile_id, status")
          .in("profile_id", professionalIds)
          .returns<AdminUserProfessionalRow[]>()
      : { data: [] as AdminUserProfessionalRow[], error: null };

    if (professionalsError) {
      throw professionalsError;
    }

    const professionalStatusById = new Map(
      (professionalRows ?? []).map((row) => [row.profile_id, row.status]),
    );

    return profiles.map((profile) => ({
      id: profile.id,
      role: profile.role,
      fullName: profile.full_name,
      avatarInitials: profile.avatar_initials,
      createdAt: profile.created_at,
      professionalStatus:
        profile.role === "professional"
          ? (professionalStatusById.get(profile.id) ?? null)
          : null,
    }));
  } catch (error) {
    throw normalizeGetAdminUsersError(error);
  }
}
