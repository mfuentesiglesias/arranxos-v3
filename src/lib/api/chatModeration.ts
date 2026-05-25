import type { PostgrestError } from "@supabase/supabase-js";

import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type ModerationSenderRole = "client" | "professional";
type ModerationLeakType = "phone" | "email" | "url" | "whatsapp" | "telegram";

export interface ApiModerationFlag {
  id: string;
  chatMessageId: string;
  senderProfileId: string | null;
  senderRole: ModerationSenderRole;
  leakTypes: ModerationLeakType[];
  blockedReason: string | null;
  strikeApplied: boolean;
  createdAt: string;
  resolvedAt: string | null;
  jobId: string | null;
  jobTitle: string | null;
  messageContent: string | null;
  messageRedactedContent: string | null;
}

export interface ApiModerationStrikeResult {
  flagId: string;
  messageId: string;
  actorProfileId: string;
  actorRole: string;
  professionalId: string | null;
  strikeApplied: boolean;
  alreadyApplied: boolean;
  strikeCount: number | null;
  reliabilitySnapshot: Record<string, unknown> | null;
}

interface ModerationFlagRow {
  id: string;
  chat_message_id: string;
  sender_profile_id: string | null;
  sender_role: ModerationSenderRole;
  leak_types: ModerationLeakType[] | null;
  blocked_reason: string | null;
  strike_applied: boolean | null;
  created_at: string;
  resolved_at: string | null;
}

interface ModerationStrikeResultRow {
  result_flag_id: string;
  result_message_id: string;
  result_actor_profile_id: string;
  result_actor_role: string;
  result_professional_id: string | null;
  result_strike_applied: boolean;
  result_already_applied: boolean;
  result_strike_count: number | null;
  result_reliability_snapshot: Record<string, unknown> | null;
}

function isNoRowsError(error: PostgrestError | null): boolean {
  return error?.code === "PGRST116";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

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

function getFirstRow<T>(data: unknown): T | undefined {
  if (Array.isArray(data)) return data[0] as T | undefined;
  return (data as T | null) ?? undefined;
}

function mapModerationFlagRow(
  row: ModerationFlagRow,
  messageMap: Map<string, { content: string; redacted_content: string | null; job_id: string | null }>,
  jobMap: Map<string, { title: string }>,
): ApiModerationFlag {
  const msg = messageMap.get(row.chat_message_id);
  const jobId = msg?.job_id ?? null;
  const jobTitle = jobId ? (jobMap.get(jobId)?.title ?? null) : null;

  return {
    id: row.id,
    chatMessageId: row.chat_message_id,
    senderProfileId: row.sender_profile_id,
    senderRole: row.sender_role,
    leakTypes: row.leak_types ?? [],
    blockedReason: row.blocked_reason,
    strikeApplied: row.strike_applied ?? false,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    jobId,
    jobTitle,
    messageContent: msg?.content ?? null,
    messageRedactedContent: msg?.redacted_content ?? null,
  };
}

function mapModerationStrikeResultRow(row: ModerationStrikeResultRow): ApiModerationStrikeResult {
  return {
    flagId: row.result_flag_id,
    messageId: row.result_message_id,
    actorProfileId: row.result_actor_profile_id,
    actorRole: row.result_actor_role,
    professionalId: row.result_professional_id,
    strikeApplied: row.result_strike_applied,
    alreadyApplied: row.result_already_applied,
    strikeCount: row.result_strike_count,
    reliabilitySnapshot: row.result_reliability_snapshot,
  };
}

function normalizeListModerationFlagsError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile")
  ) {
    return new Error("Necesitas iniciar sesión para revisar los flags de moderación.");
  }

  if (message.includes("permission denied")) {
    return new Error("Solo admins pueden revisar los flags de moderación.");
  }

  return new Error("No pudimos cargar los flags de moderación. Inténtalo de nuevo.");
}

function normalizeApplyModerationStrikeError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile")
  ) {
    return new Error("Necesitas iniciar sesión para aplicar un strike.");
  }

  if (message.includes("only admins can apply moderation strikes") || message.includes("permission denied")) {
    return new Error("Solo admins pueden aplicar strikes de moderación.");
  }

  if (message.includes("does not exist")) {
    return new Error("El flag de moderación ya no existe.");
  }

  if (
    message.includes("does not have a sender_profile_id") ||
    message.includes("professional")
  ) {
    return new Error("El flag no tiene un profesional válido asociado.");
  }

  return new Error("No pudimos aplicar el strike. Inténtalo de nuevo.");
}

export async function listModerationFlags(): Promise<ApiModerationFlag[]> {
  if (!isSupabaseMode()) return [];

  const client = getBrowserSupabaseClient();

  const { data, error } = await client
    .from("moderation_flags")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<ModerationFlagRow[]>();

  if (error) {
    if (isNoRowsError(error)) return [];
    throw normalizeListModerationFlagsError(error);
  }

  const flags = data ?? [];
  if (flags.length === 0) return [];

  const messageIds = [...new Set(flags.map((f) => f.chat_message_id).filter(Boolean))];
  const messageMap = new Map<string, { content: string; redacted_content: string | null; job_id: string | null }>();
  const jobMap = new Map<string, { title: string }>();

  if (messageIds.length > 0) {
    try {
      const { data: msgs, error: msgErr } = await client
        .from("chat_messages")
        .select("id, content, redacted_content, job_id")
        .in("id", messageIds);

      if (!msgErr && msgs) {
        for (const msg of msgs as Array<{ id: string; content: string; redacted_content: string | null; job_id: string | null }>) {
          messageMap.set(msg.id, msg);
        }
      }
    } catch {
      // graceful degradation: show flags without message content
    }

    const jobIds = [...new Set(
      Array.from(messageMap.values())
        .map((m) => m.job_id)
        .filter(Boolean) as string[],
    )];

    if (jobIds.length > 0) {
      try {
        const { data: jobRows, error: jobErr } = await client
          .from("jobs")
          .select("id, title")
          .in("id", jobIds);

        if (!jobErr && jobRows) {
          for (const j of jobRows as Array<{ id: string; title: string }>) {
            jobMap.set(j.id, j);
          }
        }
      } catch {
        // graceful degradation
      }
    }
  }

  return flags.map((row) => mapModerationFlagRow(row, messageMap, jobMap));
}

export async function applyModerationStrike(
  flagId: string,
): Promise<ApiModerationStrikeResult> {
  if (!isSupabaseMode()) {
    throw new Error("applyModerationStrike() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const client = getBrowserSupabaseClient();
  const { data, error } = await client.rpc("apply_moderation_strike", {
    p_flag_id: flagId,
  });

  if (error) {
    throw normalizeApplyModerationStrikeError(error);
  }

  const row = getFirstRow<ModerationStrikeResultRow>(data);

  if (!row) {
    throw new Error("No pudimos aplicar el strike. Inténtalo de nuevo.");
  }

  return mapModerationStrikeResultRow(row);
}
