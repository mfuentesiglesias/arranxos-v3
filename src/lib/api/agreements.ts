import type { PostgrestError } from "@supabase/supabase-js";

import { getCurrentProfile } from "@/lib/api/profiles";
import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type { JobStatus } from "@/lib/types";

type ApiAgreementContextStatus = "ready" | "unavailable" | "unauthenticated";
type ApiNegotiationStatus = "active" | "accepted" | "cancelled";
type ApiNegotiationEventType = "proposal" | "counteroffer" | "accepted" | "cancelled";
type ApiNegotiationParticipantRole = "client" | "professional";
type ApiAgreementPaymentStatus = "pending" | "protected" | "released" | "cancelled" | "refunded";

export interface ApiAgreementContextJob {
  id: string;
  status: JobStatus;
  assignedProfessionalId: string | null;
  priceMin: number | null;
  priceMax: number | null;
}

export interface ApiJobNegotiation {
  id: string;
  jobId: string;
  professionalId: string;
  status: ApiNegotiationStatus;
  lastAmount: number | null;
  proposedByRole: ApiNegotiationParticipantRole | null;
  clientAccepted: boolean;
  professionalAccepted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiJobNegotiationEvent {
  id: string;
  negotiationId: string;
  jobId: string;
  byRole: ApiNegotiationParticipantRole;
  eventType: ApiNegotiationEventType;
  amount: number | null;
  note: string | null;
  createdAt: string;
}

export interface ApiAgreement {
  id: string;
  jobId: string;
  professionalId: string;
  finalPrice: number;
  commissionPct: number;
  paymentStatus: ApiAgreementPaymentStatus;
  priceGuaranteed: boolean;
  acceptedByClient: boolean;
  acceptedByProfessional: boolean;
  createdAt: string;
}

export interface ApiJobAgreementContext {
  status: ApiAgreementContextStatus;
  statusMessage: string;
  job: ApiAgreementContextJob | null;
  negotiation: ApiJobNegotiation | null;
  events: ApiJobNegotiationEvent[];
  agreement: ApiAgreement | null;
}

export interface ApiAcceptAgreementNegotiationResult {
  negotiationId: string;
  agreementId: string | null;
  jobId: string;
  negotiationStatus: ApiNegotiationStatus;
  jobStatus: JobStatus;
}

export interface ApiFundProtectedPaymentResult {
  jobId: string;
  agreementId: string;
  paymentStatus: ApiAgreementPaymentStatus;
  jobStatus: JobStatus;
  paidAt: string;
}

export interface ApiMarkJobCompletedResult {
  jobId: string;
  agreementId: string;
  paymentStatus: ApiAgreementPaymentStatus;
  jobStatus: JobStatus;
}

export interface ApiConfirmJobCompletionResult {
  jobId: string;
  agreementId: string;
  paymentStatus: ApiAgreementPaymentStatus;
  jobStatus: JobStatus;
  releasedAt: string;
}

interface JobAgreementRow {
  id: string;
  status: JobStatus;
  assigned_professional_id: string | null;
  price_min: number | null;
  price_max: number | null;
}

interface JobNegotiationRow {
  id: string;
  job_id: string;
  professional_id: string;
  status: ApiNegotiationStatus;
  last_amount: number | null;
  proposed_by_role: ApiNegotiationParticipantRole | null;
  client_accepted: boolean;
  professional_accepted: boolean;
  created_at: string;
  updated_at: string;
}

interface JobNegotiationEventRow {
  id: string;
  negotiation_id: string;
  job_id: string;
  by_role: ApiNegotiationParticipantRole;
  event_type: ApiNegotiationEventType;
  amount: number | null;
  note: string | null;
  created_at: string;
}

interface AgreementRow {
  id: string;
  job_id: string;
  professional_id: string;
  final_price: number;
  commission_pct: number;
  payment_status: ApiAgreementPaymentStatus;
  price_guaranteed: boolean;
  accepted_by_client: boolean;
  accepted_by_professional: boolean;
  created_at: string;
}

interface AcceptAgreementRow {
  result_negotiation_id: string;
  result_agreement_id: string | null;
  result_job_id: string;
  result_negotiation_status: ApiNegotiationStatus;
  result_job_status: JobStatus;
}

interface FundProtectedPaymentRow {
  result_job_id: string;
  result_agreement_id: string;
  result_payment_status: ApiAgreementPaymentStatus;
  result_job_status: JobStatus;
  result_paid_at: string;
}

interface MarkJobCompletedRow {
  result_job_id: string;
  result_agreement_id: string;
  result_payment_status: ApiAgreementPaymentStatus;
  result_job_status: JobStatus;
}

interface ConfirmJobCompletionRow {
  result_job_id: string;
  result_agreement_id: string;
  result_payment_status: ApiAgreementPaymentStatus;
  result_job_status: JobStatus;
  result_released_at: string;
}

function isNoRowsError(error: PostgrestError | null): boolean {
  return error?.code === "PGRST116";
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

function mapJobAgreementRow(row: JobAgreementRow): ApiAgreementContextJob {
  return {
    id: row.id,
    status: row.status,
    assignedProfessionalId: row.assigned_professional_id,
    priceMin: row.price_min,
    priceMax: row.price_max,
  };
}

function mapNegotiationRow(row: JobNegotiationRow): ApiJobNegotiation {
  return {
    id: row.id,
    jobId: row.job_id,
    professionalId: row.professional_id,
    status: row.status,
    lastAmount: row.last_amount,
    proposedByRole: row.proposed_by_role,
    clientAccepted: row.client_accepted,
    professionalAccepted: row.professional_accepted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNegotiationEventRow(row: JobNegotiationEventRow): ApiJobNegotiationEvent {
  return {
    id: row.id,
    negotiationId: row.negotiation_id,
    jobId: row.job_id,
    byRole: row.by_role,
    eventType: row.event_type,
    amount: row.amount,
    note: row.note,
    createdAt: row.created_at,
  };
}

function mapAgreementRow(row: AgreementRow): ApiAgreement {
  return {
    id: row.id,
    jobId: row.job_id,
    professionalId: row.professional_id,
    finalPrice: row.final_price,
    commissionPct: row.commission_pct,
    paymentStatus: row.payment_status,
    priceGuaranteed: row.price_guaranteed,
    acceptedByClient: row.accepted_by_client,
    acceptedByProfessional: row.accepted_by_professional,
    createdAt: row.created_at,
  };
}

function mapAcceptAgreementRow(row: AcceptAgreementRow): ApiAcceptAgreementNegotiationResult {
  return {
    negotiationId: row.result_negotiation_id,
    agreementId: row.result_agreement_id,
    jobId: row.result_job_id,
    negotiationStatus: row.result_negotiation_status,
    jobStatus: row.result_job_status,
  };
}

function mapFundProtectedPaymentRow(row: FundProtectedPaymentRow): ApiFundProtectedPaymentResult {
  return {
    jobId: row.result_job_id,
    agreementId: row.result_agreement_id,
    paymentStatus: row.result_payment_status,
    jobStatus: row.result_job_status,
    paidAt: row.result_paid_at,
  };
}

function mapMarkJobCompletedRow(row: MarkJobCompletedRow): ApiMarkJobCompletedResult {
  return {
    jobId: row.result_job_id,
    agreementId: row.result_agreement_id,
    paymentStatus: row.result_payment_status,
    jobStatus: row.result_job_status,
  };
}

function mapConfirmJobCompletionRow(row: ConfirmJobCompletionRow): ApiConfirmJobCompletionResult {
  return {
    jobId: row.result_job_id,
    agreementId: row.result_agreement_id,
    paymentStatus: row.result_payment_status,
    jobStatus: row.result_job_status,
    releasedAt: row.result_released_at,
  };
}

function normalizeCreateAgreementProposalError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile") ||
    message.includes("only the client owner or assigned professional") ||
    message.includes("only the client owner of job") ||
    message.includes("only the assigned professional") ||
    message.includes("permission denied")
  ) {
    return new Error("No puedes proponer un presupuesto para este trabajo.");
  }

  if (message.includes("must be greater than zero")) {
    return new Error("Introduce un importe válido mayor que cero.");
  }

  if (
    message.includes("is not in a state that allows agreement proposals") ||
    message.includes("does not have an assigned professional yet")
  ) {
    return new Error("Este trabajo no admite nuevas propuestas de presupuesto.");
  }

  if (message.includes("approved and active")) {
    return new Error("La cuenta profesional ya no puede negociar este trabajo.");
  }

  if (message.includes("active dispute")) {
    return new Error("Este trabajo tiene una disputa activa y no admite nuevas propuestas.");
  }

  if (message.includes("does not exist")) {
    return new Error("Este trabajo ya no existe o ya no está disponible para negociar.");
  }

  return new Error("No pudimos registrar la propuesta. Inténtalo de nuevo.");
}

function normalizeAcceptAgreementNegotiationError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile") ||
    message.includes("only the client owner or assigned professional") ||
    message.includes("only the client owner of job") ||
    message.includes("only the negotiation professional") ||
    message.includes("permission denied")
  ) {
    return new Error("No puedes aceptar este presupuesto.");
  }

  if (
    message.includes("negotiation") &&
    message.includes("does not exist")
  ) {
    return new Error("Esta negociación ya no existe o ya no está disponible.");
  }

  if (
    message.includes("is not active") ||
    message.includes("does not have a valid amount")
  ) {
    return new Error("Esta negociación ya no está activa.");
  }

  if (
    message.includes("state that allows agreement acceptance") ||
    message.includes("currently assigned professional") ||
    message.includes("for negotiation")
  ) {
    return new Error("Este trabajo ya no admite aceptar este presupuesto.");
  }

  if (message.includes("already accepted negotiation")) {
    return new Error("Ya habías aceptado esta oferta.");
  }

  if (message.includes("approved and active")) {
    return new Error("La cuenta profesional ya no puede aceptar este presupuesto.");
  }

  if (message.includes("admin config row with id=global is required")) {
    return new Error("La configuración del acuerdo no está disponible ahora mismo.");
  }

  return new Error("No pudimos aceptar el presupuesto. Inténtalo de nuevo.");
}

function normalizeFundProtectedPaymentError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile") ||
    message.includes("only the client owner can fund protected payment") ||
    message.includes("permission denied")
  ) {
    return new Error("No puedes proteger el pago de este trabajo.");
  }

  if (message.includes("does not exist")) {
    return new Error("Este trabajo o su acuerdo ya no están disponibles.");
  }

  if (message.includes("is not in agreed status")) {
    return new Error("Este trabajo ya no está listo para proteger el pago.");
  }

  if (message.includes("is not fully accepted")) {
    return new Error("El acuerdo todavía no está completamente aceptado.");
  }

  if (message.includes("is already protected")) {
    return new Error("Este acuerdo ya tiene el pago protegido.");
  }

  if (message.includes("is not pending payment")) {
    return new Error("Este acuerdo ya no admite proteger el pago.");
  }

  return new Error("No pudimos proteger el pago. Inténtalo de nuevo.");
}

function normalizeMarkJobCompletedError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile") ||
    message.includes("only the assigned professional can mark") ||
    message.includes("permission denied")
  ) {
    return new Error("No puedes marcar este trabajo como terminado.");
  }

  if (message.includes("approved and active")) {
    return new Error("La cuenta profesional ya no puede cerrar este trabajo.");
  }

  if (message.includes("does not exist")) {
    return new Error("Este trabajo o su acuerdo ya no están disponibles.");
  }

  if (message.includes("is not in escrow_funded status")) {
    return new Error("Este trabajo todavía no puede marcarse como terminado.");
  }

  if (message.includes("does not belong to the assigned professional")) {
    return new Error("Este acuerdo ya no corresponde al profesional asignado.");
  }

  if (message.includes("is not protected")) {
    return new Error("El pago protegido ya no está disponible para este trabajo.");
  }

  if (message.includes("does not have a funded paid_at timestamp")) {
    return new Error("Este acuerdo no tiene un pago protegido válido.");
  }

  if (message.includes("has already been released")) {
    return new Error("Este acuerdo ya fue liberado.");
  }

  return new Error("No pudimos marcar el trabajo como terminado. Inténtalo de nuevo.");
}

function normalizeConfirmJobCompletionError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile") ||
    message.includes("only the client owner can confirm completion") ||
    message.includes("permission denied")
  ) {
    return new Error("No puedes confirmar la finalización de este trabajo.");
  }

  if (message.includes("does not exist")) {
    return new Error("Este trabajo o su acuerdo ya no están disponibles.");
  }

  if (message.includes("is not in completed_pending_confirmation status")) {
    return new Error("Este trabajo ya no está pendiente de tu confirmación.");
  }

  if (message.includes("is not protected")) {
    return new Error("El pago protegido ya no está disponible para este trabajo.");
  }

  if (message.includes("does not have a funded paid_at timestamp")) {
    return new Error("Este acuerdo no tiene un pago protegido válido.");
  }

  if (message.includes("has already been released")) {
    return new Error("Este acuerdo ya fue liberado.");
  }

  return new Error("No pudimos confirmar la finalización. Inténtalo de nuevo.");
}

export async function getJobAgreementContext(jobId: string): Promise<ApiJobAgreementContext> {
  if (!isSupabaseMode()) {
    return {
      status: "unavailable",
      statusMessage: "El contexto real de presupuesto no está disponible en modo mock.",
      job: null,
      negotiation: null,
      events: [],
      agreement: null,
    };
  }

  const currentProfile = await getCurrentProfile();

  if (!currentProfile) {
    return {
      status: "unauthenticated",
      statusMessage: "Necesitas iniciar sesión para acceder al presupuesto real.",
      job: null,
      negotiation: null,
      events: [],
      agreement: null,
    };
  }

  const client = getBrowserSupabaseClient();

  const [jobResponse, negotiationResponse, agreementResponse] = await Promise.all([
    client
      .from("jobs")
      .select("id, status, assigned_professional_id, price_min, price_max")
      .eq("id", jobId)
      .maybeSingle<JobAgreementRow>(),
    client
      .from("job_negotiations")
      .select(
        "id, job_id, professional_id, status, last_amount, proposed_by_role, client_accepted, professional_accepted, created_at, updated_at",
      )
      .eq("job_id", jobId)
      .neq("status", "cancelled")
      .order("updated_at", { ascending: false })
      .limit(1)
      .returns<JobNegotiationRow[]>(),
    client
      .from("agreements")
      .select(
        "id, job_id, professional_id, final_price, commission_pct, payment_status, price_guaranteed, accepted_by_client, accepted_by_professional, created_at",
      )
      .eq("job_id", jobId)
      .maybeSingle<AgreementRow>(),
  ]);

  if (jobResponse.error && !isNoRowsError(jobResponse.error)) {
    throw jobResponse.error;
  }

  if (negotiationResponse.error) {
    throw negotiationResponse.error;
  }

  if (agreementResponse.error && !isNoRowsError(agreementResponse.error)) {
    throw agreementResponse.error;
  }

  const job = jobResponse.data ?? null;
  const negotiation = (negotiationResponse.data ?? [])[0] ?? null;
  const agreement = agreementResponse.data ?? null;

  if (!job) {
    return {
      status: "unavailable",
      statusMessage: "No tienes acceso al contexto de presupuesto de este trabajo.",
      job: null,
      negotiation: null,
      events: [],
      agreement: null,
    };
  }

  let events: ApiJobNegotiationEvent[] = [];

  if (negotiation) {
    const { data: eventRows, error: eventError } = await client
      .from("job_negotiation_events")
      .select("id, negotiation_id, job_id, by_role, event_type, amount, note, created_at")
      .eq("negotiation_id", negotiation.id)
      .order("created_at", { ascending: true })
      .returns<JobNegotiationEventRow[]>();

    if (eventError) {
      throw eventError;
    }

    events = (eventRows ?? []).map(mapNegotiationEventRow);
  }

  return {
    status: "ready",
    statusMessage:
      agreement !== null
        ? "Acuerdo alcanzado."
        : negotiation !== null
          ? "Hay una negociación activa para este trabajo."
          : "Todavia no hay presupuesto propuesto para este trabajo.",
    job: mapJobAgreementRow(job),
    negotiation: negotiation ? mapNegotiationRow(negotiation) : null,
    events,
    agreement: agreement ? mapAgreementRow(agreement) : null,
  };
}

export async function createAgreementProposal(
  jobId: string,
  amount: number,
): Promise<ApiJobNegotiation> {
  if (!isSupabaseMode()) {
    throw new Error("createAgreementProposal() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Introduce un importe entero positivo en euros.");
  }

  const client = getBrowserSupabaseClient();

  const { data, error } = await client.rpc("create_agreement", {
    p_job_id: jobId,
    p_amount: amount,
    p_price_guaranteed: false,
  });

  if (error) {
    throw normalizeCreateAgreementProposalError(error);
  }

  const result = Array.isArray(data)
    ? (data[0] as JobNegotiationRow | undefined)
    : ((data as JobNegotiationRow | null) ?? undefined);

  if (!result) {
    throw new Error("No pudimos registrar la propuesta. Inténtalo de nuevo.");
  }

  return mapNegotiationRow(result);
}

export async function acceptAgreementNegotiation(
  negotiationId: string,
): Promise<ApiAcceptAgreementNegotiationResult> {
  if (!isSupabaseMode()) {
    throw new Error("acceptAgreementNegotiation() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const client = getBrowserSupabaseClient();

  const { data, error } = await client.rpc("accept_agreement", {
    p_negotiation_id: negotiationId,
  });

  if (error) {
    throw normalizeAcceptAgreementNegotiationError(error);
  }

  const result = Array.isArray(data)
    ? (data[0] as AcceptAgreementRow | undefined)
    : ((data as AcceptAgreementRow | null) ?? undefined);

  if (!result) {
    throw new Error("No pudimos aceptar el presupuesto. Inténtalo de nuevo.");
  }

  return mapAcceptAgreementRow(result);
}

export async function fundProtectedPayment(
  jobId: string,
): Promise<ApiFundProtectedPaymentResult> {
  if (!isSupabaseMode()) {
    throw new Error("fundProtectedPayment() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const client = getBrowserSupabaseClient();

  const { data, error } = await client.rpc("fund_protected_payment", {
    p_job_id: jobId,
  });

  if (error) {
    throw normalizeFundProtectedPaymentError(error);
  }

  const result = Array.isArray(data)
    ? (data[0] as FundProtectedPaymentRow | undefined)
    : ((data as FundProtectedPaymentRow | null) ?? undefined);

  if (!result) {
    throw new Error("No pudimos proteger el pago. Inténtalo de nuevo.");
  }

  return mapFundProtectedPaymentRow(result);
}

export async function markJobCompleted(
  jobId: string,
): Promise<ApiMarkJobCompletedResult> {
  if (!isSupabaseMode()) {
    throw new Error("markJobCompleted() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const client = getBrowserSupabaseClient();

  const { data, error } = await client.rpc("mark_job_completed", {
    p_job_id: jobId,
  });

  if (error) {
    throw normalizeMarkJobCompletedError(error);
  }

  const result = Array.isArray(data)
    ? (data[0] as MarkJobCompletedRow | undefined)
    : ((data as MarkJobCompletedRow | null) ?? undefined);

  if (!result) {
    throw new Error("No pudimos marcar el trabajo como terminado. Inténtalo de nuevo.");
  }

  return mapMarkJobCompletedRow(result);
}

export async function confirmJobCompletion(
  jobId: string,
): Promise<ApiConfirmJobCompletionResult> {
  if (!isSupabaseMode()) {
    throw new Error("confirmJobCompletion() is unavailable while NEXT_PUBLIC_DATA_MODE=mock.");
  }

  const client = getBrowserSupabaseClient();

  const { data, error } = await client.rpc("confirm_job_completion", {
    p_job_id: jobId,
  });

  if (error) {
    throw normalizeConfirmJobCompletionError(error);
  }

  const result = Array.isArray(data)
    ? (data[0] as ConfirmJobCompletionRow | undefined)
    : ((data as ConfirmJobCompletionRow | null) ?? undefined);

  if (!result) {
    throw new Error("No pudimos confirmar la finalización. Inténtalo de nuevo.");
  }

  return mapConfirmJobCompletionRow(result);
}

