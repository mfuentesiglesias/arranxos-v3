"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { chatMessages } from "@/lib/data";
import { scanLeaks, LEAK_LABELS } from "@/lib/anti-leak";
import {
  getEffectiveJobs,
  getEffectiveModerationFlags,
  getEffectiveProfessionals,
  useSession,
} from "@/lib/store";
import { isSupabaseMode } from "@/lib/supabase/config";
import {
  listModerationFlags,
  applyModerationStrike as applySupabaseModerationStrike,
  type ApiModerationFlag,
} from "@/lib/api/chatModeration";
import type { ModerationFlag } from "@/lib/types";

type ModerationRow = {
  id: string;
  source: "live" | "seed" | "supabase";
  jobId: string;
  chatId?: string;
  senderRole: "client" | "professional";
  senderId?: string;
  text: string;
  redactedText?: string;
  leakTypes: ModerationFlag["leakTypes"];
  createdAtLabel: string;
  strikeApplied: boolean;
};

export default function AdminChatsPage() {
  const session = useSession();
  const effectiveJobs = useMemo(() => getEffectiveJobs(session), [session]);
  const effectiveProfessionals = useMemo(() => getEffectiveProfessionals(session), [session]);
  const moderationFlags = useMemo(() => getEffectiveModerationFlags(session), [session]);
  const applyModerationStrike = useSession((s) => s.applyModerationStrike);

  const [realFlags, setRealFlags] = useState<ApiModerationFlag[]>([]);
  const [realFlagsLoading, setRealFlagsLoading] = useState(false);
  const [realFlagsError, setRealFlagsError] = useState<string | null>(null);
  const [applyingStrikeId, setApplyingStrikeId] = useState<string | null>(null);
  const [strikeError, setStrikeError] = useState<string | null>(null);

  const fetchRealFlags = useCallback(async () => {
    if (!isSupabaseMode()) return;
    setRealFlagsLoading(true);
    setRealFlagsError(null);
    try {
      const flags = await listModerationFlags();
      setRealFlags(flags);
    } catch (err) {
      setRealFlagsError(err instanceof Error ? err.message : "Error al cargar flags de moderación.");
    } finally {
      setRealFlagsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRealFlags();
  }, [fetchRealFlags]);

  const handleSupabaseStrike = useCallback(async (flagId: string) => {
    setApplyingStrikeId(flagId);
    setStrikeError(null);
    try {
      await applySupabaseModerationStrike(flagId);
      await fetchRealFlags();
    } catch (err) {
      setStrikeError(err instanceof Error ? err.message : "Error al aplicar el strike.");
    } finally {
      setApplyingStrikeId(null);
    }
  }, [fetchRealFlags]);

  const flagged = useMemo<ModerationRow[]>(() => {
    const supabaseFlags: ModerationRow[] = realFlags.map((flag) => ({
      id: flag.id,
      source: "supabase" as const,
      jobId: flag.jobId ?? "",
      chatId: undefined,
      senderRole: flag.senderRole,
      senderId: flag.senderProfileId ?? undefined,
      text: flag.messageContent ?? flag.blockedReason ?? "",
      redactedText: flag.messageRedactedContent ?? undefined,
      leakTypes: flag.leakTypes,
      createdAtLabel: new Date(flag.createdAt).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      strikeApplied: flag.strikeApplied,
    }));
    const liveFlags = moderationFlags.map((flag) => ({
      id: flag.id,
      source: "live" as const,
      jobId: flag.jobId,
      chatId: flag.chatId,
      senderRole: flag.senderRole,
      senderId: flag.senderId,
      text: flag.text,
      redactedText: flag.redactedText,
      leakTypes: flag.leakTypes,
      createdAtLabel: new Date(flag.createdAt).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      strikeApplied: Boolean(flag.strikeApplied),
    }));

    const seedFlags = chatMessages
      .filter((message) => message.flagged)
      .map((message) => ({
        id: message.id,
        source: "seed" as const,
        jobId: message.jobId,
        chatId: message.chatId,
        senderRole: message.from === "pro" ? ("professional" as const) : ("client" as const),
        senderId: message.senderId,
        text: message.text,
        redactedText: message.redacted,
        leakTypes: scanLeaks(message.text).map((leak) => leak.type),
        createdAtLabel: message.time,
        strikeApplied: false,
      }));

    return [...supabaseFlags, ...liveFlags, ...seedFlags];
  }, [moderationFlags, realFlags]);

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Moderación de chats" subtitle={`${flagged.length} mensajes para revisar`} />
      <ScreenBody className="px-4 pt-3 pb-6">
        <div data-testid="admin-chats-page" className="flex flex-col gap-3">
          {realFlagsError && (
            <Card className="bg-red-50 border-red-200">
              <div className="flex items-center gap-2 text-[12px] text-red-700">
                <Icon name="alert" size={14} />
                <span>{realFlagsError}</span>
              </div>
            </Card>
          )}
          {strikeError && (
            <Card className="bg-red-50 border-red-200">
              <div className="flex items-center gap-2 text-[12px] text-red-700">
                <Icon name="alert" size={14} />
                <span>{strikeError}</span>
              </div>
            </Card>
          )}
          {realFlagsLoading && (
            <div className="flex items-center gap-2 text-[12px] text-ink-400 px-1">
              <div className="w-3 h-3 border-2 border-sand-300 border-t-ink-400 rounded-full animate-spin" />
              <span>Cargando flags de moderación...</span>
            </div>
          )}
          <Card className="bg-amber-50 border-amber-100 mb-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center">
                <Icon name="alert" size={16} />
              </div>
              <div className="text-[12px] text-amber-700 leading-snug">
                Mensajes detectados por el filtro anti-fuga. Revisa cada caso,
                aplica strikes si procede y cierra el aviso.
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-2">
            {flagged.map((m) => {
              const job = effectiveJobs.find((entry) => entry.id === m.jobId);
              const pro = m.senderRole === "professional"
                ? effectiveProfessionals.find((entry) => entry.id === m.senderId)
                : job?.assignedProId
                  ? effectiveProfessionals.find((entry) => entry.id === job.assignedProId)
                  : null;
              const types = Array.from(new Set(m.leakTypes));
              const strikeDisabled = m.source === "seed" || m.senderRole === "client" || m.strikeApplied;
              return (
                <Card key={m.id} testId={`admin-chat-flag-${m.id}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      data-testid={`admin-chat-flag-leak-types-${m.id}`}
                    >
                      {types.map((t) => LEAK_LABELS[t]).join(" · ") || "Sospechoso"}
                    </span>
                    <span className="text-[10.5px] text-ink-400 ml-auto">
                      {m.createdAtLabel}
                    </span>
                  </div>
                  <div className="text-[13px] text-ink-700 bg-sand-50 rounded-xl p-3 border border-sand-200/70 mb-3 leading-relaxed">
                    “{m.redactedText ?? m.text}”
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar
                      initials={
                        m.senderRole === "professional" && pro ? pro.avatar : job?.clientAvatar ?? "??"
                      }
                      size={32}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[12.5px] text-ink-800 truncate">
                        {m.senderRole === "professional" && pro ? pro.name : job?.clientName ?? "Usuario"}
                      </div>
                      <div className="text-[11px] text-ink-400 truncate">
                        {m.senderRole === "professional" ? "Profesional" : "Cliente"}
                        {m.senderId ? ` · ${m.senderId}` : ""}
                        {job?.title ? ` · ${job.title}` : ` · trabajo ${m.jobId}`}
                      </div>
                      <div
                        className="mt-1 text-[10.5px] font-bold text-ink-500"
                        data-testid={`admin-chat-flag-status-${m.id}`}
                      >
                        {m.source === "seed"
                          ? "Seed demo"
                          : m.strikeApplied
                            ? "Strike aplicado"
                            : "Pendiente"}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/chat/${m.jobId}`}
                      className="text-center text-[12px] font-bold py-2 rounded-xl bg-sand-100 text-ink-700"
                    >
                      Ver chat
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        if (strikeDisabled) return;
                        if (m.source === "supabase") {
                          handleSupabaseStrike(m.id);
                        } else if (m.source === "live") {
                          applyModerationStrike(m.id);
                        }
                      }}
                      disabled={strikeDisabled || applyingStrikeId === m.id}
                      data-testid={`admin-chat-apply-strike-${m.id}`}
                      className="text-center text-[12px] font-bold py-2 rounded-xl bg-rose-500 text-white disabled:bg-sand-200 disabled:text-ink-400"
                    >
                      {applyingStrikeId === m.id
                        ? "Aplicando..."
                        : m.senderRole === "client"
                          ? m.source === "supabase"
                            ? "Flag de cliente"
                            : "Strike cliente pendiente"
                          : m.strikeApplied
                            ? "Strike aplicado"
                            : m.source === "seed"
                              ? "Seed demo"
                              : "Aplicar strike"}
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </ScreenBody>
    </div>
  );
}
