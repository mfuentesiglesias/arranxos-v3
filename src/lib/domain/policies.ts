import type {
  AgreementPaymentStatus,
  AgreementState,
  JobOutreachMeta,
  NegotiationState,
} from "@/lib/store";
import type { Job, JobStatus, Professional, ProStatus, SearchTicket, UserRole } from "@/lib/types";
import { daysBetween } from "@/lib/utils";

export type ClientJobAction =
  | "view_requests"
  | "invite_pros"
  | "open_chat"
  | "pay"
  | "confirm_completion"
  | "open_dispute"
  | "rate_pro";

export type SearchTicketClientState =
  | "ticket_created"
  | "no_pros_cta"
  | "waiting_info"
  | "no_response_cta"
  | "hidden";

export type ProJobAction =
  | "request_job"
  | "open_chat"
  | "view_tracking"
  | "start_job"
  | "mark_completed"
  | "awaiting_client_confirmation";

const POST_ACCEPTANCE_STATUSES: JobStatus[] = [
  "agreement_pending",
  "agreed",
  "escrow_funded",
  "in_progress",
  "completed_pending_confirmation",
  "completed",
];

interface ChatAccessParams {
  role: UserRole;
  proStatus: ProStatus;
  jobStatus: JobStatus;
  assignedProId?: string;
  currentProfessionalId?: string;
}

interface ExactLocationParams {
  viewerRole: UserRole;
  proStatus: ProStatus;
  jobStatus: JobStatus;
  assignedProId?: string;
  currentProfessionalId?: string;
}

interface ClientActionParams {
  status: JobStatus;
  hasAssignedPro: boolean;
  invitationCount?: number;
  invitationLimit?: number;
  hasAgreement?: boolean;
  paymentStatus?: AgreementPaymentStatus;
}

interface ProActionParams {
  status: JobStatus;
  isAssignedToCurrentPro: boolean;
  hasAgreement?: boolean;
  paymentStatus?: AgreementPaymentStatus;
}

export function isProfessionalOperative(role: UserRole, proStatus: ProStatus) {
  return role !== "professional" || proStatus === "approved";
}

export function canAccessChat({
  role,
  proStatus,
  jobStatus,
  assignedProId,
  currentProfessionalId,
}: ChatAccessParams) {
  if (role === "admin") return true;
  if (!assignedProId || !POST_ACCEPTANCE_STATUSES.includes(jobStatus)) return false;
  if (role === "client") return true;

  return (
    isProfessionalOperative(role, proStatus) &&
    assignedProId === currentProfessionalId
  );
}

export function canSeeExactLocation({
  viewerRole,
  proStatus,
  jobStatus,
  assignedProId,
  currentProfessionalId,
}: ExactLocationParams) {
  if (viewerRole === "admin" || viewerRole === "client") return true;
  if (!assignedProId) return false;

  return (
    isProfessionalOperative(viewerRole, proStatus) &&
    POST_ACCEPTANCE_STATUSES.includes(jobStatus) &&
    assignedProId === currentProfessionalId
  );
}

export function canInviteMorePros({
  currentInvitations,
  invitationLimit,
}: {
  currentInvitations: number;
  invitationLimit: number;
}) {
  return currentInvitations < invitationLimit;
}

export function getCommissionAmount({
  amount,
  commissionPct,
}: {
  amount: number;
  commissionPct: number;
}) {
  return Math.round((amount * commissionPct) / 100);
}

export function getActiveNegotiation(
  negotiation?: NegotiationState,
) {
  if (!negotiation || negotiation.status === "agreement_created") return undefined;
  return negotiation;
}

export function getAgreement(agreement?: AgreementState) {
  return agreement;
}

export function hasAgreement(agreement?: AgreementState | null) {
  return Boolean(agreement);
}

export function getEffectiveFinalPrice(job: Job, agreement?: AgreementState) {
  return agreement?.finalPrice ?? job.finalPrice;
}

export function canCreateAgreement(negotiation?: NegotiationState) {
  return Boolean(
    negotiation?.lastAmount && negotiation.clientAccepted && negotiation.proAccepted,
  );
}

export function canPayProtected({
  hasAgreement,
  paymentStatus,
}: {
  hasAgreement: boolean;
  paymentStatus?: AgreementPaymentStatus;
}) {
  return hasAgreement && paymentStatus !== "protected";
}

export function hasProtectedPayment(agreement?: AgreementState | null) {
  return agreement?.paymentStatus === "protected";
}

export function canStartJob({
  status,
  agreement,
  role,
  isAssignedToCurrentPro,
}: {
  status: JobStatus;
  agreement?: AgreementState | null;
  role: UserRole;
  isAssignedToCurrentPro: boolean;
}) {
  return (
    role === "professional" &&
    isAssignedToCurrentPro &&
    status === "escrow_funded" &&
    hasProtectedPayment(agreement)
  );
}

export function canMarkJobCompleted({
  status,
  agreement,
  role,
  isAssignedToCurrentPro,
}: {
  status: JobStatus;
  agreement?: AgreementState | null;
  role: UserRole;
  isAssignedToCurrentPro: boolean;
}) {
  return (
    role === "professional" &&
    isAssignedToCurrentPro &&
    status === "in_progress" &&
    hasProtectedPayment(agreement)
  );
}

export function canConfirmCompletedJob({
  status,
  agreement,
  role,
}: {
  status: JobStatus;
  agreement?: AgreementState | null;
  role: UserRole;
}) {
  return (
    role === "client" &&
    status === "completed_pending_confirmation" &&
    hasProtectedPayment(agreement)
  );
}

export function getPostPaymentJobActionsForClient({
  status,
  agreement,
}: {
  status: JobStatus;
  agreement?: AgreementState | null;
}) {
  return {
    canConfirmCompletion: canConfirmCompletedJob({
      status,
      agreement,
      role: "client",
    }),
    canRatePro: status === "completed",
    showsProtectedPayment: hasProtectedPayment(agreement),
  };
}

export function getPostPaymentJobActionsForPro({
  status,
  agreement,
  isAssignedToCurrentPro,
}: {
  status: JobStatus;
  agreement?: AgreementState | null;
  isAssignedToCurrentPro: boolean;
}) {
  return {
    canStartJob: canStartJob({
      status,
      agreement,
      role: "professional",
      isAssignedToCurrentPro,
    }),
    canMarkCompleted: canMarkJobCompleted({
      status,
      agreement,
      role: "professional",
      isAssignedToCurrentPro,
    }),
    awaitingClientConfirmation:
      status === "completed_pending_confirmation" &&
      isAssignedToCurrentPro &&
      hasProtectedPayment(agreement),
    showsProtectedPayment: hasProtectedPayment(agreement),
  };
}

export function canProposePrice({
  role,
  jobStatus,
  hasAgreement,
  chatEnabled,
}: {
  role: UserRole;
  jobStatus: JobStatus;
  hasAgreement: boolean;
  chatEnabled: boolean;
}) {
  return (
    chatEnabled &&
    !hasAgreement &&
    (role === "client" || role === "professional") &&
    jobStatus === "agreement_pending"
  );
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getProfessionalsInZoneForJob(job: Job, pros: Professional[]) {
  const jobAreas = [job.location, job.locationApprox]
    .filter(Boolean)
    .map(normalize);

  return pros.filter((pro) => {
    if (pro.status !== "approved") return false;

    const proAreas = [pro.location, pro.zone ?? ""].filter(Boolean).map(normalize);
    return proAreas.some(
      (area) =>
        jobAreas.some((jobArea) => jobArea.includes(area)) ||
        jobAreas.some((jobArea) => area.includes(jobArea)),
    );
  });
}

function hasUsefulResponse(job: Job) {
  return (
    job.requests > 0 ||
    Boolean(job.assignedProId) ||
    job.status !== "published"
  );
}

export function canCreateSearchTicketNoProsInZone({
  prosInZoneCount,
  existingTicket,
}: {
  prosInZoneCount: number;
  existingTicket?: SearchTicket;
}) {
  return prosInZoneCount === 0 && !existingTicket;
}

export function canCreateSearchTicketNoResponse({
  job,
  outreachMeta,
  prosInZoneCount,
  daysThreshold,
  existingTicket,
  now = new Date().toISOString(),
}: {
  job: Job;
  outreachMeta?: JobOutreachMeta;
  prosInZoneCount: number;
  daysThreshold: number;
  existingTicket?: SearchTicket;
  now?: string;
}) {
  const referenceDate =
    outreachMeta?.invitationsSentAt ??
    ((job.invitations ?? 0) > 0 ? job.postedAt : undefined);

  if (!referenceDate || prosInZoneCount === 0 || existingTicket) return false;
  if (hasUsefulResponse(job)) return false;

  return daysBetween(referenceDate, now) >= daysThreshold;
}

export function getSearchTicketReason({
  job,
  professionals,
  outreachMeta,
  existingTicket,
  daysThreshold,
  now,
}: {
  job: Job;
  professionals: Professional[];
  outreachMeta?: JobOutreachMeta;
  existingTicket?: SearchTicket;
  daysThreshold: number;
  now?: string;
}) {
  const prosInZone = getProfessionalsInZoneForJob(job, professionals);

  if (
    canCreateSearchTicketNoProsInZone({
      prosInZoneCount: prosInZone.length,
      existingTicket,
    })
  ) {
    return "no_pros_in_zone" as const;
  }

  if (
    canCreateSearchTicketNoResponse({
      job,
      outreachMeta,
      prosInZoneCount: prosInZone.length,
      daysThreshold,
      existingTicket,
      now,
    })
  ) {
    return "no_useful_response" as const;
  }

  return null;
}

export function canCreateSearchTicket(params: Parameters<typeof getSearchTicketReason>[0]) {
  return Boolean(getSearchTicketReason(params));
}

export function getSearchTicketClientState({
  job,
  professionals,
  outreachMeta,
  existingTicket,
  daysThreshold,
  now,
}: Parameters<typeof getSearchTicketReason>[0]): SearchTicketClientState {
  if (existingTicket) return "ticket_created";

  const prosInZone = getProfessionalsInZoneForJob(job, professionals);

  if (
    canCreateSearchTicketNoProsInZone({
      prosInZoneCount: prosInZone.length,
      existingTicket,
    })
  ) {
    return "no_pros_cta";
  }

  if (
    canCreateSearchTicketNoResponse({
      job,
      outreachMeta,
      prosInZoneCount: prosInZone.length,
      daysThreshold,
      existingTicket,
      now,
    })
  ) {
    return "no_response_cta";
  }

  const hasInvitationWindow = Boolean(
    prosInZone.length > 0 &&
      !existingTicket &&
      (outreachMeta?.invitationsSentAt || (job.invitations ?? 0) > 0),
  );

  if (hasInvitationWindow) {
    return "waiting_info";
  }

  return "hidden";
}

export function getJobActionsForClient({
  status,
  hasAssignedPro,
  invitationCount = 0,
  invitationLimit,
  hasAgreement = false,
  paymentStatus,
}: ClientActionParams): ClientJobAction[] {
  const actions: ClientJobAction[] = [];

  if (status === "published") {
    actions.push("view_requests");

    if (
      invitationLimit === undefined ||
      canInviteMorePros({
        currentInvitations: invitationCount,
        invitationLimit,
      })
    ) {
      actions.push("invite_pros");
    }
  }

  if (
    hasAssignedPro &&
    canAccessChat({
      role: "client",
      proStatus: "approved",
      jobStatus: status,
      assignedProId: "assigned",
    })
  ) {
    actions.push("open_chat");
  }

  if (canPayProtected({ hasAgreement, paymentStatus }) && status === "agreed") {
    actions.push("pay");
  }
  if (
    getPostPaymentJobActionsForClient({
      status,
      agreement: hasAgreement
        ? ({ paymentStatus } as AgreementState)
        : undefined,
    }).canConfirmCompletion
  ) {
    actions.push("confirm_completion", "open_dispute");
  }
  if (
    getPostPaymentJobActionsForClient({
      status,
      agreement: hasAgreement
        ? ({ paymentStatus } as AgreementState)
        : undefined,
    }).canRatePro
  ) {
    actions.push("rate_pro");
  }

  return actions;
}

export function getJobActionsForPro({
  status,
  isAssignedToCurrentPro,
  hasAgreement = false,
  paymentStatus,
}: ProActionParams): ProJobAction[] {
  if (status === "published" && !isAssignedToCurrentPro) {
    return ["request_job"];
  }

  if (status === "agreement_pending" && isAssignedToCurrentPro) {
    return ["open_chat"];
  }

  if (
    isAssignedToCurrentPro &&
    (status === "agreed" || status === "escrow_funded")
  ) {
    if (hasAgreement && paymentStatus === "pending") {
      return ["open_chat", "view_tracking"];
    }

    return ["open_chat", "view_tracking"];
  }

  if (
    getPostPaymentJobActionsForPro({
      status,
      agreement: hasAgreement
        ? ({ paymentStatus } as AgreementState)
        : undefined,
      isAssignedToCurrentPro,
    }).canStartJob
  ) {
    return ["start_job", "open_chat", "view_tracking"];
  }

  if (
    getPostPaymentJobActionsForPro({
      status,
      agreement: hasAgreement
        ? ({ paymentStatus } as AgreementState)
        : undefined,
      isAssignedToCurrentPro,
    }).canMarkCompleted
  ) {
    return ["mark_completed"];
  }

  if (
    getPostPaymentJobActionsForPro({
      status,
      agreement: hasAgreement
        ? ({ paymentStatus } as AgreementState)
        : undefined,
      isAssignedToCurrentPro,
    }).awaitingClientConfirmation
  ) {
    return ["awaiting_client_confirmation"];
  }

  return [];
}
