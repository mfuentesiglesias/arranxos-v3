import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  getSupabasePublicConfig,
  isSupabaseMode,
  requireSupabasePublicConfig,
} from "./config";

let browserClient: SupabaseClient | null = null;

function createBrowserClient(): SupabaseClient {
  const config = requireSupabasePublicConfig("Supabase browser client");

  return createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
}

export function getBrowserSupabaseClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("Supabase browser client cannot be used on the server.");
  }

  browserClient ??= createBrowserClient();
  return browserClient;
}

export function maybeGetBrowserSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!isSupabaseMode() || !getSupabasePublicConfig()) {
    return null;
  }

  browserClient ??= createBrowserClient();
  return browserClient;
}
