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

export function getEffectiveAdminConfig(state: SessionState) {
  return state.adminConfig;
}

export function getCurrentProfessionalId(state: SessionState) {
  return state.currentProfessionalId;
}

export function getEffectiveJobs(state: SessionState) {
  return jobs.map((job) => applyJobOverride(job, state.jobOverrides[job.id]));
}

export function getEffectiveJobById(state: SessionState, jobId: string) {
  const job = jobs.find((entry) => entry.id === jobId);
  return job ? applyJobOverride(job, state.jobOverrides[job.id]) : undefined;
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
    }),
    { name: "arranxos-session" },
  ),
);
