import { isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export interface ApiAdminDashboardKpis {
  profilesCount: number;
  clientsCount: number;
  professionalsPending: number;
  professionalsApproved: number;
  professionalsBlocked: number;
  jobsTotal: number;
  jobsPublished: number;
  jobsAgreementPending: number;
  jobsAgreed: number;
  jobsEscrowFunded: number;
  jobsInProgress: number;
  jobsCompletedPendingConfirmation: number;
  jobsCompleted: number;
  jobsDispute: number;
  jobsCancelled: number;
  jobsActive: number;
  moderationFlagsPending: number;
  moderationFlagsReviewed: number;
  moderationFlagsStrikes: number;
  reviewsCount: number;
  reviewsAverageRating: number;
  disputesOpen: number;
  disputesResolved: number;
  jobRequestsCount: number;
  chatsCount: number;
}

type CountableTable =
  | "profiles"
  | "professionals"
  | "jobs"
  | "job_requests"
  | "chats"
  | "moderation_flags"
  | "reviews"
  | "disputes";

type CountableColumn = "id" | "profile_id";

interface RatingRow {
  rating: number;
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

function normalizeGetAdminDashboardKpisError(error: unknown): Error {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("current user does not have a profile")
  ) {
    return new Error("Necesitas iniciar sesión para consultar los KPIs reales.");
  }

  if (message.includes("permission denied") || message.includes("only admins")) {
    return new Error("Solo admins pueden consultar los KPIs reales.");
  }

  return new Error("No pudimos cargar los KPIs reales del dashboard. Inténtalo de nuevo.");
}

async function countRows(
  table: CountableTable,
  column: CountableColumn = "id",
  mutate?: (query: any) => any,
): Promise<number> {
  const client = getBrowserSupabaseClient();
  let query = client.from(table).select(column, { count: "exact", head: true });

  if (mutate) {
    query = mutate(query) as typeof query;
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getAdminDashboardKpis(): Promise<ApiAdminDashboardKpis | null> {
  if (!isSupabaseMode()) {
    return null;
  }

  try {
    const [
      profilesCount,
      clientsCount,
      professionalsPending,
      professionalsApproved,
      professionalsBlocked,
      jobsTotal,
      jobsPublished,
      jobsAgreementPending,
      jobsAgreed,
      jobsEscrowFunded,
      jobsInProgress,
      jobsCompletedPendingConfirmation,
      jobsCompleted,
      jobsDispute,
      jobsCancelled,
      moderationFlagsPending,
      moderationFlagsReviewed,
      moderationFlagsStrikes,
      reviewsCount,
      disputesOpen,
      disputesResolved,
      jobRequestsCount,
      chatsCount,
      ratingsResponse,
    ] = await Promise.all([
      countRows("profiles"),
      countRows("profiles", "id", (query) => query.eq("role", "client")),
      countRows("professionals", "profile_id", (query) => query.eq("status", "pending")),
      countRows("professionals", "profile_id", (query) => query.eq("status", "approved")),
      countRows("professionals", "profile_id", (query) => query.eq("status", "blocked")),
      countRows("jobs"),
      countRows("jobs", "id", (query) => query.eq("status", "published")),
      countRows("jobs", "id", (query) => query.eq("status", "agreement_pending")),
      countRows("jobs", "id", (query) => query.eq("status", "agreed")),
      countRows("jobs", "id", (query) => query.eq("status", "escrow_funded")),
      countRows("jobs", "id", (query) => query.eq("status", "in_progress")),
      countRows("jobs", "id", (query) => query.eq("status", "completed_pending_confirmation")),
      countRows("jobs", "id", (query) => query.eq("status", "completed")),
      countRows("jobs", "id", (query) => query.eq("status", "dispute")),
      countRows("jobs", "id", (query) => query.eq("status", "cancelled")),
      countRows("moderation_flags", "id", (query) => query.eq("strike_applied", false).is("resolved_at", null)),
      countRows("moderation_flags", "id", (query) => query.eq("strike_applied", false).not("resolved_at", "is", null)),
      countRows("moderation_flags", "id", (query) => query.eq("strike_applied", true)),
      countRows("reviews"),
      countRows("disputes", "id", (query) => query.in("status", ["open", "under_review"])),
      countRows("disputes", "id", (query) => query.in("status", ["resolved_client", "resolved_professional", "split", "cancelled"])),
      countRows("job_requests"),
      countRows("chats"),
      getBrowserSupabaseClient().from("reviews").select("rating").returns<RatingRow[]>(),
    ]);

    if (ratingsResponse.error) {
      throw ratingsResponse.error;
    }

    const ratings = ratingsResponse.data ?? [];
    const reviewsAverageRating = ratings.length > 0
      ? Number((ratings.reduce((sum, row) => sum + row.rating, 0) / ratings.length).toFixed(2))
      : 0;

    return {
      profilesCount,
      clientsCount,
      professionalsPending,
      professionalsApproved,
      professionalsBlocked,
      jobsTotal,
      jobsPublished,
      jobsAgreementPending,
      jobsAgreed,
      jobsEscrowFunded,
      jobsInProgress,
      jobsCompletedPendingConfirmation,
      jobsCompleted,
      jobsDispute,
      jobsCancelled,
      jobsActive:
        jobsPublished +
        jobsInProgress +
        jobsAgreementPending +
        jobsAgreed +
        jobsEscrowFunded +
        jobsCompletedPendingConfirmation,
      moderationFlagsPending,
      moderationFlagsReviewed,
      moderationFlagsStrikes,
      reviewsCount,
      reviewsAverageRating,
      disputesOpen,
      disputesResolved,
      jobRequestsCount,
      chatsCount,
    };
  } catch (error) {
    throw normalizeGetAdminDashboardKpisError(error);
  }
}
