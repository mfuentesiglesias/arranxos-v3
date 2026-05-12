import type { ProStatus, UserRole } from "./types";

export const DEMO_SESSION_STORAGE_KEY = "arranxos-session";

type PersistedSessionState = {
  role?: UserRole;
  proStatus?: ProStatus;
};

export function clearPersistedDemoSession() {
  if (typeof window === "undefined") return;

  Object.keys(window.localStorage).forEach((key) => {
    if (key.startsWith("arranxos-")) {
      window.localStorage.removeItem(key);
    }
  });

  window.sessionStorage.clear();
}

export function getPersistedDemoRoute() {
  const session = getPersistedDemoState();
  if (!session?.role) return null;

  if (session.role === "admin") return "/admin";
  if (session.role === "professional") {
    return "/profesional/inicio";
  }

  return "/cliente/inicio";
}

function getPersistedDemoState(): PersistedSessionState | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { state?: PersistedSessionState };
    if (!parsed?.state) return null;
    return parsed.state;
  } catch {
    return null;
  }
}
