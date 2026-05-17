import type { PostgrestError } from "@supabase/supabase-js";

import { getDataMode, isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  createServerSupabaseClient,
  type ServerSupabaseClientOptions,
} from "@/lib/supabase/server";

export type ApiProfileRole = "client" | "professional" | "admin";
export type ApiProfessionalStatus = "pending" | "approved" | "blocked";

export interface ApiProfile {
  id: string;
  role: ApiProfileRole;
  professionalStatus: ApiProfessionalStatus | null;
  fullName: string;
  avatarInitials: string | null;
  locationLabel: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOwnProfileInput {
  role: Exclude<ApiProfileRole, "admin">;
  fullName: string;
  avatarInitials?: string | null;
  locationLabel?: string | null;
  phone?: string | null;
  professionalProfile?: {
    specialtyLabel?: string | null;
    zone?: string | null;
    serviceIds?: string[];
    primaryServiceId?: string | null;
  };
}

export interface ProfileRequestOptions extends ServerSupabaseClientOptions {}

interface ProfileRow {
  id: string;
  role: ApiProfileRole;
  full_name: string;
  avatar_initials: string | null;
  location_label: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfessionalRow {
  status: ApiProfessionalStatus;
}

function getProfilesDisabledMessage(feature: string): string {
  return `${feature} is unavailable while NEXT_PUBLIC_DATA_MODE=${getDataMode()}.`;
}

function mapProfileRow(row: ProfileRow): ApiProfile {
  return {
    id: row.id,
    role: row.role,
    professionalStatus: null,
    fullName: row.full_name,
    avatarInitials: row.avatar_initials,
    locationLabel: row.location_label,
    phone: row.phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getProfessionalStatus(
  profileId: string,
  options: ProfileRequestOptions = {},
): Promise<ApiProfessionalStatus | null> {
  if (!isSupabaseMode()) {
    return null;
  }

  const client =
    typeof window !== "undefined" && !options.accessToken
      ? getBrowserSupabaseClient()
      : createServerSupabaseClient(options);

  const { data, error } = await client
    .from("professionals")
    .select("status")
    .eq("profile_id", profileId)
    .maybeSingle<ProfessionalRow>();

  if (error && !isNoRowsError(error)) {
    throw error;
  }

  return data?.status ?? null;
}

function isNoRowsError(error: PostgrestError | null): boolean {
  return error?.code === "PGRST116";
}

async function resolveProfileContext(options: ProfileRequestOptions = {}) {
  if (!isSupabaseMode()) {
    return null;
  }

  const client =
    typeof window !== "undefined" && !options.accessToken
      ? getBrowserSupabaseClient()
      : createServerSupabaseClient(options);

  const { data, error } = options.accessToken
    ? await client.auth.getUser(options.accessToken)
    : await client.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    return null;
  }

  return { client, user: data.user };
}

export async function getCurrentProfile(
  options: ProfileRequestOptions = {},
): Promise<ApiProfile | null> {
  const context = await resolveProfileContext(options);
  if (!context) {
    return null;
  }

  const { data, error } = await context.client
    .from("profiles")
    .select("id, role, full_name, avatar_initials, location_label, phone, created_at, updated_at")
    .eq("id", context.user.id)
    .maybeSingle<ProfileRow>();

  if (error && !isNoRowsError(error)) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const profile = mapProfileRow(data);
  if (profile.role !== "professional") {
    return profile;
  }

  return {
    ...profile,
    professionalStatus: await getProfessionalStatus(context.user.id, options),
  };
}

export async function createOwnProfile(
  input: CreateOwnProfileInput,
  options: ProfileRequestOptions = {},
): Promise<ApiProfile> {
  if (!isSupabaseMode()) {
    throw new Error(getProfilesDisabledMessage("createOwnProfile()"));
  }

  void input;
  void options;

  // Registration bootstrap is intentionally blocked for now. Enabling it safely
  // requires versioned SQL grants and/or a dedicated RPC so profile creation,
  // professional creation, and service mapping happen consistently.
  throw new Error(
    "createOwnProfile() is not enabled yet. It requires future SQL grants/RPC bootstrap before real registration can be opened.",
  );
}

export async function getCurrentProfessionalStatus(
  options: ProfileRequestOptions = {},
): Promise<ApiProfessionalStatus | null> {
  const profile = await getCurrentProfile(options);
  return profile?.role === "professional" ? profile.professionalStatus : null;
}
