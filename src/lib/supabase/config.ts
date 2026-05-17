export type DataMode = "mock" | "supabase";

export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

const DEFAULT_DATA_MODE: DataMode = "mock";

function normalizeDataMode(value: string | undefined): DataMode {
  return value === "supabase" ? "supabase" : DEFAULT_DATA_MODE;
}

export function getDataMode(): DataMode {
  return normalizeDataMode(process.env.NEXT_PUBLIC_DATA_MODE);
}

export function isSupabaseMode(): boolean {
  return getDataMode() === "supabase";
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function requireSupabasePublicConfig(feature: string): SupabasePublicConfig {
  if (!isSupabaseMode()) {
    throw new Error(`${feature} is unavailable while NEXT_PUBLIC_DATA_MODE=${getDataMode()}.`);
  }

  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error(
      `${feature} requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY when NEXT_PUBLIC_DATA_MODE=supabase.`,
    );
  }

  return config;
}
