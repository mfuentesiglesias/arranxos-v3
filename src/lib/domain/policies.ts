import type {
  AgreementPaymentStatus,
  AgreementState,
  NegotiationState,
} from "@/lib/store";
import type { Job, JobStatus, ProStatus, UserRole } from "@/lib/types";

export type ClientJobAction =
  | "view_requests"
  | "invite_pros"
  | "open_chat"
  | "pay"
  | "confirm_completion"
  | "open_dispute"
  | "rate_pro";

export type ProJobAction =
  | "request_job"
  | "open_chat"
  | "view_tracking"
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
  if (status === "completed_pending_confirmation") {
    actions.push("confirm_completion", "open_dispute");
  }
  if (status === "completed") actions.push("rate_pro");

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

  if (status === "in_progress" && isAssignedToCurrentPro) {
    return ["mark_completed"];
  }

  if (status === "completed_pending_confirmation" && isAssignedToCurrentPro) {
    return ["awaiting_client_confirmation"];
  }

  return [];
}
