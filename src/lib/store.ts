"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProStatus, UserRole } from "./types";

// DEMO ONLY: persisted to localStorage. This is UI/demo state, not a source
// of truth. Real state must live in Supabase (or chosen backend).
interface SessionState {
  role: UserRole;
  proStatus: ProStatus;
  setRole: (r: UserRole) => void;
  setProStatus: (s: ProStatus) => void;
  reset: () => void;
  draft: Record<string, unknown>;
  setDraft: (patch: Record<string, unknown>) => void;
  resetDraft: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      role: "client",
      proStatus: "approved",
      setRole: (role) => set({ role }),
      setProStatus: (proStatus) => set({ proStatus }),
      reset: () => set({ role: "client", proStatus: "approved", draft: {} }),
      draft: {},
      setDraft: (patch) =>
        set((s) => ({ draft: { ...s.draft, ...patch } })),
      resetDraft: () => set({ draft: {} }),
    }),
    { name: "arranxos-session" },
  ),
);
