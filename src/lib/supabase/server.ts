import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  getSupabasePublicConfig,
  isSupabaseMode,
  requireSupabasePublicConfig,
} from "./config";

export interface ServerSupabaseClientOptions {
  accessToken?: string;
}

function buildServerClient(options: ServerSupabaseClientOptions = {}): SupabaseClient {
  const config = requireSupabasePublicConfig("Supabase server client");
  const headers = options.accessToken
    ? { Authorization: `Bearer ${options.accessToken}` }
    : undefined;

  return createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: headers ? { headers } : undefined,
  });
}

export function createServerSupabaseClient(
  options: ServerSupabaseClientOptions = {},
): SupabaseClient {
  return buildServerClient(options);
}

export function maybeCreateServerSupabaseClient(
  options: ServerSupabaseClientOptions = {},
): SupabaseClient | null {
  if (!isSupabaseMode() || !getSupabasePublicConfig()) {
    return null;
  }

  return buildServerClient(options);
}
