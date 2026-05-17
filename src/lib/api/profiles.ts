import type { PostgrestError } from "@supabase/supabase-js";

import { getDataMode, isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  createServerSupabaseClient,
  type ServerSupabaseClientOptions,
} from "@/lib/supabase/server";

export type ApiProfileRole = "client" | "professional" | "admin";

export interface ApiProfile {
  id: string;
  role: ApiProfileRole;
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

function getProfilesDisabledMessage(feature: string): string {
  return `${feature} is unavailable while NEXT_PUBLIC_DATA_MODE=${getDataMode()}.`;
}

function mapProfileRow(row: ProfileRow): ApiProfile {
  return {
    id: row.id,
    role: row.role,
    fullName: row.full_name,
    avatarInitials: row.avatar_initials,
    locationLabel: row.location_label,
    phone: row.phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

  return data ? mapProfileRow(data) : null;
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

  const context = await resolveProfileContext(options);
  if (!context) {
    throw new Error("Authentication required to create a profile.");
  }

  const { data, error } = await context.client
    .from("profiles")
    .insert({
      id: context.user.id,
      role: input.role,
      full_name: fullName,
      avatar_initials: input.avatarInitials ?? null,
      location_label: input.locationLabel ?? null,
      phone: input.phone ?? null,
    })
    .select("id, role, full_name, avatar_initials, location_label, phone, created_at, updated_at")
    .single<ProfileRow>();

  if (error) {
    throw error;
  }

  return mapProfileRow(data);
}
