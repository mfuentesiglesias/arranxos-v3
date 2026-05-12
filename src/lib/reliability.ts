import type { Dispute, Job, Professional, Review } from "./types";

type ReliabilityLabel = "alta" | "media" | "baja";

type ReliabilityProfessionalInput = Pick<
  Professional,
  "id" | "rating" | "reviews" | "jobs" | "reliability" | "strikes"
>;

type ReliabilityReviewInput = Pick<Review, "rating">;
type ReliabilityJobInput = Pick<Job, "id" | "assignedProId" | "status">;
type ReliabilityDisputeInput = Pick<Dispute, "jobId" | "status">;

export interface ProfessionalReliabilitySummary {
  score: number;
  label: ReliabilityLabel;
  reviewCount: number;
  averageRating: number;
  completedJobs: number;
  cancelledJobs: number;
  openDisputes: number;
  resolvedAgainstPro: number;
  splitDisputes: number;
  strikes: number;
  usesFallback: boolean;
}

interface GetProfessionalReliabilitySummaryInput {
  professional: ReliabilityProfessionalInput;
  reviews?: ReliabilityReviewInput[];
  jobs?: ReliabilityJobInput[];
  disputes?: ReliabilityDisputeInput[];
}

const MAX_RATING_POINTS = 40;
const MAX_REVIEW_POINTS = 15;
const MAX_COMPLETED_JOB_POINTS = 20;
const REVIEW_POINT_THRESHOLD = 30;
const COMPLETED_JOB_POINT_THRESHOLD = 20;

export function classifyReliabilityScore(score: number): ReliabilityLabel {
  if (score >= 80) return "alta";
  if (score >= 60) return "media";
  return "baja";
}

export function getProfessionalReliabilitySummary({
  professional,
  reviews = [],
  jobs = [],
  disputes = [],
}: GetProfessionalReliabilitySummaryInput): ProfessionalReliabilitySummary {
  const professionalJobs = jobs.filter((job) => job.assignedProId === professional.id);
  const professionalJobIds = new Set(professionalJobs.map((job) => job.id));
  const professionalDisputes = disputes.filter((dispute) =>
    professionalJobIds.has(dispute.jobId),
  );
  const liveCompletedJobs = professionalJobs.filter((job) => job.status === "completed").length;
  const liveCancelledJobs = professionalJobs.filter((job) => job.status === "cancelled").length;
  const reviewCount = reviews.length > 0 ? reviews.length : professional.reviews ?? 0;
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
      : professional.rating ?? 0;
  const completedJobs = Math.max(liveCompletedJobs, professional.jobs ?? 0);
  const cancelledJobs = liveCancelledJobs;
  const openDisputes = professionalDisputes.filter((dispute) => dispute.status === "open").length;
  const resolvedAgainstPro = professionalDisputes.filter(
    (dispute) => dispute.status === "resolved_client",
  ).length;
  const splitDisputes = professionalDisputes.filter(
    (dispute) => dispute.status === "split",
  ).length;
  const strikes = professional.strikes ?? 0;

  const ratingPoints = clamp((averageRating / 5) * MAX_RATING_POINTS, 0, MAX_RATING_POINTS);
  const reviewPoints = clamp(
    (reviewCount / REVIEW_POINT_THRESHOLD) * MAX_REVIEW_POINTS,
    0,
    MAX_REVIEW_POINTS,
  );
  const completedJobPoints = clamp(
    (completedJobs / COMPLETED_JOB_POINT_THRESHOLD) * MAX_COMPLETED_JOB_POINTS,
    0,
    MAX_COMPLETED_JOB_POINTS,
  );

  const derivedScore = clamp(
    Math.round(
      ratingPoints +
        reviewPoints +
        completedJobPoints -
        cancelledJobs * 10 -
        openDisputes * 5 -
        resolvedAgainstPro * 12 -
        splitDisputes * 4 -
        strikes * 12,
    ),
    0,
    100,
  );

  const liveSignals = reviews.length + liveCompletedJobs + liveCancelledJobs + professionalDisputes.length;
  const usesFallback =
    liveSignals < 5 && typeof professional.reliability === "number" && professional.reliability >= 0;
  const score = usesFallback ? clamp(Math.round(professional.reliability ?? 0), 0, 100) : derivedScore;

  return {
    score,
    label: classifyReliabilityScore(score),
    reviewCount,
    averageRating: roundToSingleDecimal(averageRating),
    completedJobs,
    cancelledJobs,
    openDisputes,
    resolvedAgainstPro,
    splitDisputes,
    strikes,
    usesFallback,
  };
}

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
