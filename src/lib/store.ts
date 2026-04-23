"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultAdminConfig, jobs } from "./data";
import type { AdminConfig, Job, ProStatus, UserRole } from "./types";

// DEMO ONLY: persisted to localStorage. This is UI/demo state, not a source
// of truth. Real state must live in Supabase (or chosen backend).
type JobOverride = Partial<
  Pick<
    Job,
    | "status"
    | "assignedProId"
    | "finalPrice"
    | "invitations"
    | "commissionPct"
    | "completionDeadline"
  >
>;

export type NegotiationActor = "client" | "pro";
export type NegotiationEventType = "proposal" | "counteroffer" | "accept";
export type NegotiationStatus =
  | "idle"
  | "proposed"
  | "countered"
  | "accepted"
  | "agreement_created";
export type AgreementPaymentStatus = "pending" | "protected";

export interface NegotiationEvent {
  by: NegotiationActor;
  amount: number;
  type: NegotiationEventType;
  at: string;
}

export interface NegotiationState {
  jobId: string;
  status: NegotiationStatus;
  lastAmount?: number;
  proposedBy?: NegotiationActor;
  clientAccepted: boolean;
  proAccepted: boolean;
  history: NegotiationEvent[];
  updatedAt: string;
}

export interface AgreementState {
  jobId: string;
  finalPrice: number;
  commissionPct: number;
  createdAt: string;
  acceptedByClient: true;
  acceptedByPro: true;
  paymentStatus: AgreementPaymentStatus;
  paidAt?: string;
}

export interface SessionState {
  role: UserRole;
  proStatus: ProStatus;
  currentClientId: string;
  currentProfessionalId: string;
  currentAdminId: string;
  setRole: (r: UserRole) => void;
  setProStatus: (s: ProStatus) => void;
  setCurrentClientId: (id: string) => void;
  setCurrentProfessionalId: (id: string) => void;
  setCurrentAdminId: (id: string) => void;
  enterDemoAccess: (
    preset: "client" | "professional_pending" | "professional_approved" | "admin",
  ) => void;
  reset: () => void;
  draft: Record<string, unknown>;
  setDraft: (patch: Record<string, unknown>) => void;
  resetDraft: () => void;
  adminConfig: AdminConfig;
  setAdminConfig: (config: AdminConfig) => void;
  updateAdminConfig: (patch: Partial<AdminConfig>) => void;
  resetAdminConfig: () => void;
  jobOverrides: Record<string, JobOverride>;
  patchJobOverride: (jobId: string, patch: JobOverride) => void;
  resetJobOverride: (jobId: string) => void;
  resetJobOverrides: () => void;
  negotiations: Record<string, NegotiationState>;
  agreements: Record<string, AgreementState>;
  acceptProfessional: (jobId: string, proId: string) => void;
  submitNegotiationProposal: (
    jobId: string,
    by: NegotiationActor,
    amount: number,
  ) => void;
  acceptNegotiation: (jobId: string, by: NegotiationActor) => void;
  markAgreementProtected: (jobId: string) => void;
  markJobInProgress: (jobId: string) => void;
  markJobCompletedPendingConfirmation: (jobId: string) => void;
  confirmCompletedJob: (jobId: string) => void;
}

function cloneAdminConfig(config: AdminConfig = defaultAdminConfig): AdminConfig {
  return {
    ...config,
    antiLeakRules: { ...config.antiLeakRules },
  };
}

function applyJobOverride(job: Job, override?: JobOverride): Job {
  return override ? { ...job, ...override } : job;
}

function applyAgreementSnapshot(job: Job, agreement?: AgreementState): Job {
  if (!agreement) return job;

  const status =
    agreement.paymentStatus === "protected"
      ? job.status === "in_progress" ||
        job.status === "completed_pending_confirmation" ||
        job.status === "completed" ||
        job.status === "dispute" ||
        job.status === "cancelled"
        ? job.status
        : "escrow_funded"
      : job.status === "agreement_pending"
        ? "agreed"
        : job.status;

  return {
    ...job,
    status,
    finalPrice: agreement.finalPrice,
    commissionPct: agreement.commissionPct,
  };
}

function createEmptyNegotiation(jobId: string): NegotiationState {
  return {
    jobId,
    status: "idle",
    clientAccepted: false,
    proAccepted: false,
    history: [],
    updatedAt: new Date().toISOString(),
  };
}

export function getEffectiveAdminConfig(state: SessionState) {
  return state.adminConfig;
}

export function getCurrentProfessionalId(state: SessionState) {
  return state.currentProfessionalId;
}

export function getEffectiveJobs(state: SessionState) {
  return jobs.map((job) => {
    const withOverrides = applyJobOverride(job, state.jobOverrides[job.id]);
    return applyAgreementSnapshot(withOverrides, state.agreements[job.id]);
  });
}

export function getEffectiveJobById(state: SessionState, jobId: string) {
  const job = jobs.find((entry) => entry.id === jobId);
  if (!job) return undefined;

  const withOverrides = applyJobOverride(job, state.jobOverrides[job.id]);
  return applyAgreementSnapshot(withOverrides, state.agreements[job.id]);
}

export function getNegotiationByJobId(state: SessionState, jobId: string) {
  return state.negotiations[jobId];
}

export function getAgreementByJobId(state: SessionState, jobId: string) {
  return state.agreements[jobId];
}

export function getEffectivePostPaymentStatus(
  state: SessionState,
  jobId: string,
) {
  return getEffectiveJobById(state, jobId)?.status;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      role: "client",
      proStatus: "approved",
      currentClientId: "u1",
      currentProfessionalId: "p1",
      currentAdminId: "a1",
      setRole: (role) => set({ role }),
      setProStatus: (proStatus) => set({ proStatus }),
      setCurrentClientId: (currentClientId) => set({ currentClientId }),
      setCurrentProfessionalId: (currentProfessionalId) => set({ currentProfessionalId }),
      setCurrentAdminId: (currentAdminId) => set({ currentAdminId }),
      enterDemoAccess: (preset) =>
        set(() => {
          if (preset === "client") {
            return {
              role: "client" as const,
              proStatus: "approved" as const,
              currentClientId: "u1",
              currentProfessionalId: "p1",
              currentAdminId: "a1",
            };
          }

          if (preset === "professional_pending") {
            return {
              role: "professional" as const,
              proStatus: "pending" as const,
              currentClientId: "u1",
              currentProfessionalId: "p4",
              currentAdminId: "a1",
            };
          }

          if (preset === "professional_approved") {
            return {
              role: "professional" as const,
              proStatus: "approved" as const,
              currentClientId: "u1",
              currentProfessionalId: "p1",
              currentAdminId: "a1",
            };
          }

          return {
            role: "admin" as const,
            proStatus: "approved" as const,
            currentClientId: "u1",
            currentProfessionalId: "p1",
            currentAdminId: "a1",
          };
        }),
      reset: () =>
        set({
          role: "client",
          proStatus: "approved",
          currentClientId: "u1",
          currentProfessionalId: "p1",
          currentAdminId: "a1",
          draft: {},
          adminConfig: cloneAdminConfig(),
          jobOverrides: {},
          negotiations: {},
          agreements: {},
        }),
      draft: {},
      setDraft: (patch) =>
        set((s) => ({ draft: { ...s.draft, ...patch } })),
      resetDraft: () => set({ draft: {} }),
      adminConfig: cloneAdminConfig(),
      setAdminConfig: (adminConfig) => set({ adminConfig: cloneAdminConfig(adminConfig) }),
      updateAdminConfig: (patch) =>
        set((s) => ({
          adminConfig: {
            ...s.adminConfig,
            ...patch,
            antiLeakRules: patch.antiLeakRules
              ? { ...s.adminConfig.antiLeakRules, ...patch.antiLeakRules }
              : s.adminConfig.antiLeakRules,
          },
        })),
      resetAdminConfig: () => set({ adminConfig: cloneAdminConfig() }),
      jobOverrides: {},
      patchJobOverride: (jobId, patch) =>
        set((s) => ({
          jobOverrides: {
            ...s.jobOverrides,
            [jobId]: { ...s.jobOverrides[jobId], ...patch },
          },
        })),
      resetJobOverride: (jobId) =>
        set((s) => {
          const next = { ...s.jobOverrides };
          delete next[jobId];
          return { jobOverrides: next };
        }),
      resetJobOverrides: () => set({ jobOverrides: {} }),
      negotiations: {},
      agreements: {},
      acceptProfessional: (jobId, proId) =>
        set((s) => {
          const nextNegotiations = { ...s.negotiations };
          const nextAgreements = { ...s.agreements };
          delete nextNegotiations[jobId];
          delete nextAgreements[jobId];

          return {
            negotiations: nextNegotiations,
            agreements: nextAgreements,
            jobOverrides: {
              ...s.jobOverrides,
              [jobId]: {
                ...s.jobOverrides[jobId],
                assignedProId: proId,
                status: "agreement_pending",
                finalPrice: undefined,
                commissionPct: undefined,
              },
            },
          };
        }),
      submitNegotiationProposal: (jobId, by, amount) =>
        set((s) => {
          const timestamp = new Date().toISOString();
          const current = s.negotiations[jobId] ?? createEmptyNegotiation(jobId);
          const eventType: NegotiationEventType =
            current.history.length > 0 ? "counteroffer" : "proposal";

          return {
            negotiations: {
              ...s.negotiations,
              [jobId]: {
                ...current,
                status: eventType === "proposal" ? "proposed" : "countered",
                lastAmount: amount,
                proposedBy: by,
                clientAccepted: by === "client",
                proAccepted: by === "pro",
                history: [
                  ...current.history,
                  {
                    by,
                    amount,
                    type: eventType,
                    at: timestamp,
                  },
                ],
                updatedAt: timestamp,
              },
            },
          };
        }),
      acceptNegotiation: (jobId, by) =>
        set((s) => {
          const current = s.negotiations[jobId];
          if (!current?.lastAmount) return {};

          const timestamp = new Date().toISOString();
          const nextClientAccepted = by === "client" ? true : current.clientAccepted;
          const nextProAccepted = by === "pro" ? true : current.proAccepted;
          const nextHistory = [
            ...current.history,
            {
              by,
              amount: current.lastAmount,
              type: "accept" as const,
              at: timestamp,
            },
          ];

          if (nextClientAccepted && nextProAccepted) {
            const commissionPct = s.adminConfig.commissionPct;
            const agreement: AgreementState = {
              jobId,
              finalPrice: current.lastAmount,
              commissionPct,
              createdAt: timestamp,
              acceptedByClient: true,
              acceptedByPro: true,
              paymentStatus: "pending",
            };

            return {
              negotiations: {
                ...s.negotiations,
                [jobId]: {
                  ...current,
                  status: "agreement_created",
                  clientAccepted: true,
                  proAccepted: true,
                  history: nextHistory,
                  updatedAt: timestamp,
                },
              },
              agreements: {
                ...s.agreements,
                [jobId]: agreement,
              },
              jobOverrides: {
                ...s.jobOverrides,
                [jobId]: {
                  ...s.jobOverrides[jobId],
                  status: "agreed",
                  finalPrice: agreement.finalPrice,
                  commissionPct: agreement.commissionPct,
                },
              },
            };
          }

          return {
            negotiations: {
              ...s.negotiations,
              [jobId]: {
                ...current,
                status: "accepted",
                clientAccepted: nextClientAccepted,
                proAccepted: nextProAccepted,
                history: nextHistory,
                updatedAt: timestamp,
              },
            },
          };
        }),
      markAgreementProtected: (jobId) =>
        set((s) => {
          const current = s.agreements[jobId];
          if (!current || current.paymentStatus === "protected") return {};

          const paidAt = new Date().toISOString();

          return {
            agreements: {
              ...s.agreements,
              [jobId]: {
                ...current,
                paymentStatus: "protected",
                paidAt,
              },
            },
            jobOverrides: {
              ...s.jobOverrides,
              [jobId]: {
                ...s.jobOverrides[jobId],
                status: "escrow_funded",
                finalPrice: current.finalPrice,
                commissionPct: current.commissionPct,
              },
            },
          };
        }),
      markJobInProgress: (jobId) =>
        set((s) => {
          const agreement = s.agreements[jobId];
          if (!agreement || agreement.paymentStatus !== "protected") return {};

          return {
            jobOverrides: {
              ...s.jobOverrides,
              [jobId]: {
                ...s.jobOverrides[jobId],
                status: "in_progress",
                finalPrice: agreement.finalPrice,
                commissionPct: agreement.commissionPct,
              },
            },
          };
        }),
      markJobCompletedPendingConfirmation: (jobId) =>
        set((s) => {
          const agreement = s.agreements[jobId];
          if (!agreement || agreement.paymentStatus !== "protected") return {};

          const completionDeadline = new Date(
            Date.now() + s.adminConfig.autoReleaseDays * 24 * 60 * 60 * 1000,
          ).toISOString();

          return {
            jobOverrides: {
              ...s.jobOverrides,
              [jobId]: {
                ...s.jobOverrides[jobId],
                status: "completed_pending_confirmation",
                completionDeadline,
                finalPrice: agreement.finalPrice,
                commissionPct: agreement.commissionPct,
              },
            },
          };
        }),
      confirmCompletedJob: (jobId) =>
        set((s) => {
          const agreement = s.agreements[jobId];
          if (!agreement || agreement.paymentStatus !== "protected") return {};

          return {
            jobOverrides: {
              ...s.jobOverrides,
              [jobId]: {
                ...s.jobOverrides[jobId],
                status: "completed",
                finalPrice: agreement.finalPrice,
                commissionPct: agreement.commissionPct,
              },
            },
          };
        }),
    }),
    { name: "arranxos-session" },
  ),
);
