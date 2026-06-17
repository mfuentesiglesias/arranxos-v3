const PUBLIC_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

const LOGIN_ENV_KEYS = [
  "E2E_SUPABASE_CLIENT_EMAIL",
  "E2E_SUPABASE_CLIENT_PASSWORD",
  "E2E_SUPABASE_PRO_EMAIL",
  "E2E_SUPABASE_PRO_PASSWORD",
] as const;

export interface SupabasePublicE2EEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export interface SupabaseE2EEnv extends SupabasePublicE2EEnv {
  clientEmail: string;
  clientPassword: string;
  professionalEmail: string;
  professionalPassword: string;
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required Supabase Playwright env: ${name}. ` +
        "Set the required public Supabase vars and test account credentials before running real e2e tests.",
    );
  }

  return value;
}

function assertRequiredEnvSet(names: readonly string[]): void {
  const missing = names.filter((name) => !process.env[name]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `Missing required Supabase Playwright env vars: ${missing.join(", ")}. ` +
        "Do not commit real values; provide them through your local shell or CI secrets.",
    );
  }
}

export function requireSupabasePublicE2EEnv(): SupabasePublicE2EEnv {
  assertRequiredEnvSet(PUBLIC_ENV_KEYS);

  return {
    supabaseUrl: readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: readRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function requireSupabaseE2EEnv(): SupabaseE2EEnv {
  assertRequiredEnvSet([...PUBLIC_ENV_KEYS, ...LOGIN_ENV_KEYS]);

  return {
    ...requireSupabasePublicE2EEnv(),
    clientEmail: readRequiredEnv("E2E_SUPABASE_CLIENT_EMAIL"),
    clientPassword: readRequiredEnv("E2E_SUPABASE_CLIENT_PASSWORD"),
    professionalEmail: readRequiredEnv("E2E_SUPABASE_PRO_EMAIL"),
    professionalPassword: readRequiredEnv("E2E_SUPABASE_PRO_PASSWORD"),
  };
}
