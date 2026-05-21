import type { AdminConfig } from "@/lib/types";
import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export interface ApiAdminConfig extends AdminConfig {
  id: string;
  updatedAt: string;
}

export interface ApiUpdateAdminConfigInput {
  commissionPct?: number;
  autoReleaseDays?: number;
  invitationLimitPerJob?: number;
  searchTicketNoResponseDays?: number;
  strikeAutoBlockThreshold?: number;
  antiLeakEnabled?: boolean;
  antiLeakRules?: Partial<AdminConfig["antiLeakRules"]>;
}

interface AdminConfigRow {
  result_id: string;
  result_commission_pct: number;
  result_auto_release_days: number;
  result_invitation_limit_per_job: number;
  result_search_ticket_no_response_days: number;
  result_strike_auto_block_threshold: number;
  result_anti_leak_enabled: boolean;
  result_anti_leak_rules: {
    phones?: boolean;
    emails?: boolean;
    urls?: boolean;
    whatsapp?: boolean;
  } | null;
  result_updated_at: string;
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

function mapAdminConfigRow(row: AdminConfigRow): ApiAdminConfig {
  return {
    id: row.result_id,
    commissionPct: row.result_commission_pct,
    autoReleaseDays: row.result_auto_release_days,
    invitationLimitPerJob: row.result_invitation_limit_per_job,
    searchTicketNoResponseDays: row.result_search_ticket_no_response_days,
    strikeAutoBlockThreshold: row.result_strike_auto_block_threshold,
    antiLeakEnabled: row.result_anti_leak_enabled,
    antiLeakRules: {
      phones: row.result_anti_leak_rules?.phones ?? true,
      emails: row.result_anti_leak_rules?.emails ?? true,
      urls: row.result_anti_leak_rules?.urls ?? true,
      whatsapp: row.result_anti_leak_rules?.whatsapp ?? true,
    },
    updatedAt: row.result_updated_at,
  };
}

function normalizeGetAdminConfigError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile")
  ) {
    return new Error("Necesitas iniciar sesión para leer la configuración real.");
  }

  if (message.includes("only admins can read admin config") || message.includes("permission denied")) {
    return new Error("Solo admins pueden leer la configuración real.");
  }

  return new Error("No pudimos cargar la configuración real. Inténtalo de nuevo.");
}

function normalizeUpdateAdminConfigError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile")
  ) {
    return new Error("Necesitas iniciar sesión para actualizar la configuración real.");
  }

  if (message.includes("only admins can update admin config") || message.includes("permission denied")) {
    return new Error("Solo admins pueden actualizar la configuración real.");
  }

  if (
    message.includes("must be between 0 and 100") ||
    message.includes("must be greater than zero") ||
    message.includes("must be a json object") ||
    message.includes("must be boolean")
  ) {
    return new Error("La configuración contiene valores no válidos.");
  }

  return new Error("No pudimos actualizar la configuración real. Inténtalo de nuevo.");
}

function getFirstRow(data: unknown): AdminConfigRow | undefined {
  if (Array.isArray(data)) {
    return data[0] as AdminConfigRow | undefined;
  }

  return (data as AdminConfigRow | null) ?? undefined;
}

export async function getAdminConfig(): Promise<ApiAdminConfig> {
  if (!isSupabaseMode()) {
    throw new Error("getAdminConfig() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const client = getBrowserSupabaseClient();
  const { data, error } = await client.rpc("get_admin_config");

  if (error) {
    throw normalizeGetAdminConfigError(error);
  }

  const row = getFirstRow(data);

  if (!row) {
    throw new Error("No pudimos cargar la configuración real. Inténtalo de nuevo.");
  }

  return mapAdminConfigRow(row);
}

export async function updateAdminConfig(
  input: ApiUpdateAdminConfigInput,
): Promise<ApiAdminConfig> {
  if (!isSupabaseMode()) {
    throw new Error("updateAdminConfig() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const client = getBrowserSupabaseClient();
  const { data, error } = await client.rpc("update_admin_config", {
    p_commission_pct: input.commissionPct ?? null,
    p_auto_release_days: input.autoReleaseDays ?? null,
    p_invitation_limit_per_job: input.invitationLimitPerJob ?? null,
    p_search_ticket_no_response_days: input.searchTicketNoResponseDays ?? null,
    p_strike_auto_block_threshold: input.strikeAutoBlockThreshold ?? null,
    p_anti_leak_enabled: input.antiLeakEnabled ?? null,
    p_anti_leak_rules: input.antiLeakRules ?? null,
  });

  if (error) {
    throw normalizeUpdateAdminConfigError(error);
  }

  const row = getFirstRow(data);

  if (!row) {
    throw new Error("No pudimos actualizar la configuración real. Inténtalo de nuevo.");
  }

  return mapAdminConfigRow(row);
}
