import { getCommissionAmount } from "@/lib/domain/policies";
import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export interface ApiAdminEconomySummary {
  agreementsPending: number;
  agreementsProtected: number;
  agreementsReleased: number;
  agreementsRefunded: number;
  agreementsCancelled: number;
  jobsAgreed: number;
  jobsEscrowFunded: number;
  jobsCompletedPendingConfirmation: number;
  jobsCompleted: number;
  jobsDispute: number;
  jobsCancelled: number;
  protectedGrossAmount: number;
  releasedGrossAmount: number;
  refundedGrossAmount: number;
  protectedEstimatedCommission: number;
  releasedEstimatedCommission: number;
  agreementsPaidCount: number;
  agreementsReleasedCount: number;
}

type EconomyJobTable = "jobs";
type EconomyJobColumn = "id";

type AgreementPaymentStatus = "pending" | "protected" | "released" | "cancelled" | "refunded";

interface AgreementEconomyRow {
  payment_status: AgreementPaymentStatus;
  final_price: number | string | null;
  commission_pct: number | string | null;
  paid_at: string | null;
  released_at: string | null;
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

function normalizeGetAdminEconomySummaryError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile")
  ) {
    return new Error("Necesitas iniciar sesión para consultar el resumen económico real.");
  }

  if (message.includes("permission denied") || message.includes("only admins")) {
    return new Error("Solo admins pueden consultar el resumen económico real.");
  }

  return new Error("No pudimos cargar el resumen económico real. Inténtalo de nuevo.");
}

async function countJobs(
  mutate: (query: any) => any,
): Promise<number> {
  const client = getBrowserSupabaseClient();
  let query = client.from("jobs" satisfies EconomyJobTable).select("id" satisfies EconomyJobColumn, {
    count: "exact",
    head: true,
  });

  query = mutate(query);

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getAdminEconomySummary(): Promise<ApiAdminEconomySummary | null> {
  if (!isSupabaseMode()) {
    return null;
  }

  const client = getBrowserSupabaseClient();

  try {
    const [agreementsResponse, jobsAgreed, jobsEscrowFunded, jobsCompletedPendingConfirmation, jobsCompleted, jobsDispute, jobsCancelled] = await Promise.all([
      client
        .from("agreements")
        .select("payment_status, final_price, commission_pct, paid_at, released_at")
        .returns<AgreementEconomyRow[]>(),
      countJobs((query) => query.eq("status", "agreed")),
      countJobs((query) => query.eq("status", "escrow_funded")),
      countJobs((query) => query.eq("status", "completed_pending_confirmation")),
      countJobs((query) => query.eq("status", "completed")),
      countJobs((query) => query.eq("status", "dispute")),
      countJobs((query) => query.eq("status", "cancelled")),
    ]);

    if (agreementsResponse.error) {
      throw agreementsResponse.error;
    }

    const agreements = agreementsResponse.data ?? [];

    let agreementsPending = 0;
    let agreementsProtected = 0;
    let agreementsReleased = 0;
    let agreementsRefunded = 0;
    let agreementsCancelled = 0;
    let protectedGrossAmount = 0;
    let releasedGrossAmount = 0;
    let refundedGrossAmount = 0;
    let protectedEstimatedCommission = 0;
    let releasedEstimatedCommission = 0;
    let agreementsPaidCount = 0;
    let agreementsReleasedCount = 0;

    for (const agreement of agreements) {
      const finalPrice = Number(agreement.final_price ?? 0);
      const commissionPct = Number(agreement.commission_pct ?? 0);
      const estimatedCommission = getCommissionAmount({
        amount: Number.isFinite(finalPrice) ? finalPrice : 0,
        commissionPct: Number.isFinite(commissionPct) ? commissionPct : 0,
      });

      if (agreement.paid_at) {
        agreementsPaidCount += 1;
      }

      if (agreement.released_at) {
        agreementsReleasedCount += 1;
      }

      switch (agreement.payment_status) {
        case "pending":
          agreementsPending += 1;
          break;
        case "protected":
          agreementsProtected += 1;
          protectedGrossAmount += Number.isFinite(finalPrice) ? finalPrice : 0;
          protectedEstimatedCommission += estimatedCommission;
          break;
        case "released":
          agreementsReleased += 1;
          releasedGrossAmount += Number.isFinite(finalPrice) ? finalPrice : 0;
          releasedEstimatedCommission += estimatedCommission;
          break;
        case "refunded":
          agreementsRefunded += 1;
          refundedGrossAmount += Number.isFinite(finalPrice) ? finalPrice : 0;
          break;
        case "cancelled":
          agreementsCancelled += 1;
          break;
        default:
          break;
      }
    }

    return {
      agreementsPending,
      agreementsProtected,
      agreementsReleased,
      agreementsRefunded,
      agreementsCancelled,
      jobsAgreed,
      jobsEscrowFunded,
      jobsCompletedPendingConfirmation,
      jobsCompleted,
      jobsDispute,
      jobsCancelled,
      protectedGrossAmount,
      releasedGrossAmount,
      refundedGrossAmount,
      protectedEstimatedCommission,
      releasedEstimatedCommission,
      agreementsPaidCount,
      agreementsReleasedCount,
    };
  } catch (error) {
    throw normalizeGetAdminEconomySummaryError(error);
  }
}
