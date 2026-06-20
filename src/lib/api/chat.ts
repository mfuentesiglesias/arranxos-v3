import type { PostgrestError } from "@supabase/supabase-js";

import { getCurrentProfile, type ApiProfileRole } from "@/lib/api/profiles";
import { getRealCatalogCategories, getRealCatalogServices } from "@/lib/api/catalog";
import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type { ChatMessage, JobStatus } from "@/lib/types";

type ChatSenderRole = "client" | "professional" | "admin" | "system";

type ChatLeakType = "phone" | "email" | "url" | "whatsapp" | "telegram" | "contact_app";

type ApiChatThreadStatus = "ready" | "unavailable" | "unauthenticated";

export interface ApiChatThreadJob {
  id: string;
  title: string;
  status: JobStatus;
  priceMin: number | null;
  priceMax: number | null;
  assignedProfessionalId: string | null;
}

export interface ApiChatThreadSummary {
  id: string;
  jobId: string;
  createdAt: string;
  lastMessageAt: string | null;
}

export interface ApiChatThreadMessage extends ChatMessage {
  rawSenderRole: ChatSenderRole;
  leakDetected: boolean;
  leakTypes: ChatLeakType[];
  redactedContent: string | null;
}

export interface ApiChatThread {
  status: ApiChatThreadStatus;
  currentRole: ApiProfileRole | null;
  headerTitle: string;
  headerSubtitle: string;
  statusMessage: string;
  job: ApiChatThreadJob | null;
  chat: ApiChatThreadSummary | null;
  messages: ApiChatThreadMessage[];
}

export interface ApiProfessionalChatThread {
  chatId: string;
  jobId: string;
  createdAt: string;
  lastMessageAt: string | null;
  jobTitle: string;
  jobStatus: JobStatus;
  categoryId: string | null;
  categoryName: string | null;
  serviceId: string | null;
  serviceName: string | null;
  approxLocation: string | null;
  priceMin: number | null;
  priceMax: number | null;
  jobUpdatedAt: string;
}

interface ChatRow {
  id: string;
  job_id: string;
  client_id: string;
  professional_id: string;
  created_at: string;
  last_message_at: string | null;
}

interface ChatListJobRow {
  id: string;
  title: string;
  status: JobStatus;
  category_id: string | null;
  service_id: string | null;
  approx_location: string | null;
  price_min: number | null;
  price_max: number | null;
  updated_at: string;
}

async function getCatalogNameMaps() {
  const [categories, services] = await Promise.all([
    getRealCatalogCategories(),
    getRealCatalogServices(),
  ]);

  return {
    categoryNameById: new Map(categories.map((category) => [category.id, category.name])),
    serviceNameById: new Map(services.map((service) => [service.id, service.name])),
  };
}

interface ChatMessageRow {
  id: string;
  chat_id: string;
  job_id: string;
  sender_profile_id: string | null;
  sender_role: ChatSenderRole;
  content: string;
  message_type: string;
  proposal_amount: number | null;
  leak_checked: boolean;
  leak_detected: boolean;
  leak_types: ChatLeakType[] | null;
  redacted_content: string | null;
  blocked_reason: string | null;
  created_at: string;
}

interface JobChatRow {
  id: string;
  title: string;
  status: JobStatus;
  price_min: number | null;
  price_max: number | null;
  assigned_professional_id: string | null;
}

function isNoRowsError(error: PostgrestError | null): boolean {
  return error?.code === "PGRST116";
}

function formatMessageTime(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

function getChatHeaderTitle(role: ApiProfileRole | null): string {
  if (role === "professional") {
    return "Cliente";
  }

  if (role === "client") {
    return "Profesional asignado";
  }

  return "Chat del trabajo";
}

function getChatHeaderSubtitle(job: JobChatRow | null): string {
  if (!job) {
    return "Chat protegido por permisos del trabajo";
  }

  return `Trabajo: ${job.title}`;
}

function mapSenderRoleToMessageFrom(role: ChatSenderRole): ChatMessage["from"] {
  if (role === "professional") {
    return "pro";
  }

  if (role === "client") {
    return "client";
  }

  return "system";
}

function mapChatMessageRow(row: ChatMessageRow): ApiChatThreadMessage {
  return {
    id: row.id,
    chatId: row.chat_id,
    jobId: row.job_id,
    from: mapSenderRoleToMessageFrom(row.sender_role),
    senderId: row.sender_profile_id ?? undefined,
    text: row.content,
    time: formatMessageTime(row.created_at),
    timestamp: row.created_at,
    type: row.sender_role === "system" ? "system" : "text",
    proposalAmount: row.proposal_amount ?? undefined,
    flagged: row.leak_detected,
    flagReason: row.blocked_reason ?? undefined,
    blockedReason: row.blocked_reason ?? undefined,
    redacted: row.redacted_content ?? undefined,
    rawSenderRole: row.sender_role,
    leakDetected: row.leak_detected,
    leakTypes: row.leak_types ?? [],
    redactedContent: row.redacted_content,
  };
}

function mapChatRow(row: ChatRow): ApiChatThreadSummary {
  return {
    id: row.id,
    jobId: row.job_id,
    createdAt: row.created_at,
    lastMessageAt: row.last_message_at,
  };
}

function mapJobChatRow(row: JobChatRow): ApiChatThreadJob {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priceMin: row.price_min,
    priceMax: row.price_max,
    assignedProfessionalId: row.assigned_professional_id,
  };
}

function mapProfessionalChatThread(
  chat: ChatRow,
  job: ChatListJobRow,
  categoryNameById: Map<string, string>,
  serviceNameById: Map<string, string>,
): ApiProfessionalChatThread {
  return {
    chatId: chat.id,
    jobId: chat.job_id,
    createdAt: chat.created_at,
    lastMessageAt: chat.last_message_at,
    jobTitle: job.title,
    jobStatus: job.status,
    categoryId: job.category_id,
    categoryName: job.category_id ? categoryNameById.get(job.category_id) ?? null : null,
    serviceId: job.service_id,
    serviceName: job.service_id ? serviceNameById.get(job.service_id) ?? null : null,
    approxLocation: job.approx_location,
    priceMin: job.price_min,
    priceMax: job.price_max,
    jobUpdatedAt: job.updated_at,
  };
}

function buildUnavailableThread(
  currentRole: ApiProfileRole | null,
  job: JobChatRow | null,
  message: string,
): ApiChatThread {
  return {
    status: "unavailable",
    currentRole,
    headerTitle: getChatHeaderTitle(currentRole),
    headerSubtitle: getChatHeaderSubtitle(job),
    statusMessage: message,
    job: job ? mapJobChatRow(job) : null,
    chat: null,
    messages: [],
  };
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

function normalizeSendChatMessageError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile") ||
    message.includes("only chat participants") ||
    message.includes("not the client participant") ||
    message.includes("not the professional participant") ||
    message.includes("permission denied")
  ) {
    return new Error("No puedes enviar mensajes en este chat.");
  }

  if (message.includes("cannot be empty")) {
    return new Error("Escribe un mensaje antes de enviarlo.");
  }

  if (
    (message.includes("chat") && message.includes("does not exist")) ||
    message.includes("for chat")
  ) {
    return new Error("Este chat ya no está disponible.");
  }

  if (message.includes("approved and active")) {
    return new Error("Tu cuenta profesional ya no puede enviar mensajes en este chat.");
  }

  if (message.includes("chat is closed")) {
    return new Error("Este chat ya está cerrado para nuevos mensajes.");
  }

  if (message.includes("admin config row with id=global is required")) {
    return new Error("La configuración de seguridad del chat no está disponible.");
  }

  return new Error("No pudimos enviar el mensaje. Inténtalo de nuevo.");
}

export async function listMyProfessionalChats(): Promise<ApiProfessionalChatThread[]> {
  if (!isSupabaseMode()) {
    return [];
  }

  const currentProfile = await getCurrentProfile();

  if (
    !currentProfile ||
    currentProfile.role !== "professional" ||
    currentProfile.professionalStatus !== "approved"
  ) {
    return [];
  }

  const client = getBrowserSupabaseClient();
  const { categoryNameById, serviceNameById } = await getCatalogNameMaps();

  const { data: chatRows, error: chatError } = await client
    .from("chats")
    .select("id, job_id, client_id, professional_id, created_at, last_message_at")
    .eq("professional_id", currentProfile.id)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .returns<ChatRow[]>();

  if (chatError) {
    throw chatError;
  }

  const chats = chatRows ?? [];

  if (chats.length === 0) {
    return [];
  }

  const jobIds = Array.from(new Set(chats.map((chat) => chat.job_id)));
  const { data: jobRows, error: jobError } = await client
    .from("jobs")
    .select(
      "id, title, status, category_id, service_id, approx_location, price_min, price_max, updated_at",
    )
    .in("id", jobIds)
    .returns<ChatListJobRow[]>();

  if (jobError) {
    throw jobError;
  }

  const jobsById = new Map((jobRows ?? []).map((job) => [job.id, job]));

  return chats
    .map((chat) => {
      const job = jobsById.get(chat.job_id);
      if (!job) {
        return null;
      }

      return mapProfessionalChatThread(chat, job, categoryNameById, serviceNameById);
    })
    .filter((thread): thread is ApiProfessionalChatThread => thread !== null);
}

export async function getChatThread(jobId: string): Promise<ApiChatThread> {
  if (!isSupabaseMode()) {
    return buildUnavailableThread(null, null, "El chat real no está disponible en modo mock.");
  }

  const currentProfile = await getCurrentProfile();

  if (!currentProfile) {
    return {
      status: "unauthenticated",
      currentRole: null,
      headerTitle: "Chat no disponible",
      headerSubtitle: "Inicia sesión para acceder al chat.",
      statusMessage: "Necesitas iniciar sesión para acceder al chat real.",
      job: null,
      chat: null,
      messages: [],
    };
  }

  const client = getBrowserSupabaseClient();

  const [jobResponse, chatResponse] = await Promise.all([
    client
      .from("jobs")
      .select("id, title, status, price_min, price_max, assigned_professional_id")
      .eq("id", jobId)
      .maybeSingle<JobChatRow>(),
    client
      .from("chats")
      .select("id, job_id, client_id, professional_id, created_at, last_message_at")
      .eq("job_id", jobId)
      .maybeSingle<ChatRow>(),
  ]);

  if (jobResponse.error && !isNoRowsError(jobResponse.error)) {
    throw jobResponse.error;
  }

  if (chatResponse.error && !isNoRowsError(chatResponse.error)) {
    throw chatResponse.error;
  }

  const job = jobResponse.data ?? null;
  const chat = chatResponse.data ?? null;

  if (!chat) {
    return buildUnavailableThread(
      currentProfile.role,
      job,
      "No tienes acceso a este chat o todavía no está disponible para este trabajo.",
    );
  }

  const { data: messageRows, error: messageError } = await client
    .from("chat_messages")
    .select(
      "id, chat_id, job_id, sender_profile_id, sender_role, content, message_type, proposal_amount, leak_checked, leak_detected, leak_types, redacted_content, blocked_reason, created_at",
    )
    .eq("chat_id", chat.id)
    .order("created_at", { ascending: true })
    .returns<ChatMessageRow[]>();

  if (messageError) {
    throw messageError;
  }

  return {
    status: "ready",
    currentRole: currentProfile.role,
    headerTitle: getChatHeaderTitle(currentProfile.role),
    headerSubtitle: getChatHeaderSubtitle(job),
    statusMessage: (messageRows ?? []).length > 0 ? "" : "Todavía no hay mensajes en este chat.",
    job: job ? mapJobChatRow(job) : null,
    chat: mapChatRow(chat),
    messages: (messageRows ?? []).map(mapChatMessageRow),
  };
}

export async function sendChatMessage(
  chatId: string,
  content: string,
): Promise<ApiChatThreadMessage> {
  if (!isSupabaseMode()) {
    throw new Error("sendChatMessage() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const trimmedContent = content.trim();

  if (!trimmedContent) {
    throw new Error("Escribe un mensaje antes de enviarlo.");
  }

  const client = getBrowserSupabaseClient();

  const { data, error } = await client.rpc("send_chat_message", {
    p_chat_id: chatId,
    p_content: trimmedContent,
  });

  if (error) {
    throw normalizeSendChatMessageError(error);
  }

  return mapChatMessageRow(data as ChatMessageRow);
}
