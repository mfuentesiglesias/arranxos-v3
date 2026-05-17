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

  const fullName = input.fullName.trim();
  if (!fullName) {
    throw new Error("createOwnProfile() requires a non-empty fullName.");
  }

  const { error: rpcError } = await getBrowserSupabaseClient().rpc(
    "bootstrap_own_profile",
    {
      p_role: input.role,
      p_full_name: fullName,
      p_avatar_initials: input.avatarInitials ?? null,
      p_location_label: input.locationLabel ?? null,
      p_phone: input.phone ?? null,
      p_professional_slug: null,
      p_specialty_label: input.professionalProfile?.specialtyLabel ?? null,
      p_zone: input.professionalProfile?.zone ?? null,
      p_radius_km: null,
      p_bio: null,
      p_service_ids: input.professionalProfile?.serviceIds ?? [],
    },
  );

  if (rpcError) {
    throw rpcError;
  }

  const profile = await getCurrentProfile(options);
  if (!profile) {
    throw new Error("Profile bootstrap succeeded but subsequent read failed.");
  }

  return profile;
}

export async function getCurrentProfessionalStatus(
  options: ProfileRequestOptions = {},
): Promise<ApiProfessionalStatus | null> {
  const profile = await getCurrentProfile(options);
  return profile?.role === "professional" ? profile.professionalStatus : null;
}
