"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  applyApprovedCatalogCategoryGroup,
  DEFAULT_APPROVED_CATALOG_GROUP,
  buildApprovedCatalogCategoryFromName,
  buildApprovedCatalogServiceFromRequest,
  formatCatalogServiceName,
  getEffectiveCatalogCategories,
  getSeedCatalogCategories,
  normalizeApprovedCatalogCategory,
  getEffectiveCatalogServices,
  getSeedCatalogServices,
  normalizeCatalogText,
  slugifyCatalogText,
} from "./catalog";
import {
  currentClient,
  defaultAdminConfig,
  disputes as seedDisputes,
  jobs,
  notifications as seedNotifications,
  searchTickets as seedSearchTickets,
} from "./data";
import {
  canAutoReleaseCompletedJob,
  canOpenDispute,
} from "./domain/policies";
import type {
  AdminConfig,
  CatalogCategory,
  CatalogRequest,
  CatalogService,
  Dispute,
  Job,
  Notification,
  ProStatus,
  SearchTicket,
  UserRole,
} from "./types";

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
      | "disputeOpenedAt"
      | "disputeReason"
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

export interface JobOutreachMeta {
  invitationsSentAt?: string;
  invitedCount?: number;
  searchTicketId?: string;
}

export type CreateCatalogRequestInput = Pick<
  CatalogRequest,
  | "requestedName"
  | "suggestedCategoryId"
  | "suggestedCategoryName"
  | "description"
  | "requestedByUserId"
  | "requestedByName"
  | "requestedByRole"
>;

export type CreateCatalogRequestResult =
  | { ok: true; request: CatalogRequest }
  | { ok: false; reason: "empty" | "duplicate_request" | "duplicate_service" };

export interface ApproveCatalogRequestOptions {
  categoryId: string;
  categoryName: string;
  reviewedByAdminId?: string;
  serviceName?: string;
}

export interface MergeCatalogRequestOptions {
  mergedIntoServiceId: string;
  reviewedByAdminId?: string;
}

export interface CreateApprovedCatalogCategoryInput {
  name: string;
  group?: string;
  createdFromRequestId?: string;
}

export type CreateApprovedCatalogCategoryResult =
  | { ok: true; category: CatalogCategory; created: boolean }
  | { ok: false; reason: "empty" };

export interface ProfessionalCatalogWorkBase {
  postalCode: string;
  municipality: string;
  locality: string;
  privateAddress: string;
}

export interface ProfessionalCatalogProfile {
  selectedServiceIds: string[];
  primaryServiceId?: string;
  specialtyNames?: string[];
  workBase: ProfessionalCatalogWorkBase;
  radiusKm: number;
  updatedAt: string;
}

export interface UpdateProfessionalCatalogProfileInput
  extends Partial<Omit<ProfessionalCatalogProfile, "workBase">> {
  workBase?: Partial<ProfessionalCatalogWorkBase>;
}

export interface CreateClientJobInput {
  categoryId: string;
  categoryName: string;
  serviceId?: string;
  serviceName: string;
  title: string;
  description: string;
  location: string;
  priceRange: string;
  urgent: boolean;
  questionnaire?: Record<string, string>;
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
  autoReleaseCompletedJob: (jobId: string) => void;
  openJobDispute: (
    jobId: string,
    reason: string,
    description: string,
    evidence: string[],
  ) => void;
  notifications: Notification[];
  disputes: Dispute[];
  resolveDispute: (disputeId: string, status: Dispute["status"]) => void;
  searchTickets: SearchTicket[];
  jobOutreachMeta: Record<string, JobOutreachMeta>;
  recordInvitationsSent: (jobId: string, invitedCount: number) => void;
  createSearchTicket: (
    jobId: string,
    reason: SearchTicket["reason"],
  ) => void;
  setSearchTicketStatus: (
    ticketId: string,
    status: SearchTicket["status"],
  ) => void;
  createdJobs: Job[];
  createClientJob: (input: CreateClientJobInput) => Job;
  professionalProfileOverrides: Record<string, ProfessionalCatalogProfile>;
  updateProfessionalCatalogProfile: (
    professionalId: string,
    patch: UpdateProfessionalCatalogProfileInput,
  ) => ProfessionalCatalogProfile;
  catalogRequests: CatalogRequest[];
  approvedCatalogServices: CatalogService[];
  approvedCatalogCategories: CatalogCategory[];
  createCatalogRequest: (
    input: CreateCatalogRequestInput,
  ) => CreateCatalogRequestResult;
  createApprovedCatalogCategory: (
    input: CreateApprovedCatalogCategoryInput,
  ) => CreateApprovedCatalogCategoryResult;
  approveCatalogRequest: (
    requestId: string,
    options: ApproveCatalogRequestOptions,
  ) => CatalogRequest | undefined;
  rejectCatalogRequest: (
    requestId: string,
    reason?: string,
  ) => CatalogRequest | undefined;
  mergeCatalogRequest: (
    requestId: string,
    options: MergeCatalogRequestOptions,
  ) => CatalogRequest | undefined;
}

const ACTIVE_CATALOG_REQUEST_STATUSES = new Set<CatalogRequest["status"]>([
  "pending",
  "reviewing",
  "approved",
]);

function cloneAdminConfig(config: AdminConfig = defaultAdminConfig): AdminConfig {
  return {
    ...config,
    antiLeakRules: { ...config.antiLeakRules },
  };
}

function applyJobOverride(job: Job, override?: JobOverride): Job {
  return override ? { ...job, ...override } : job;
}

function cloneNotifications(notifications: Notification[] = seedNotifications) {
  return notifications.map((notification) => ({ ...notification }));
}

function cloneDisputes(disputes: Dispute[] = seedDisputes) {
  return disputes.map((dispute) => ({
    ...dispute,
    evidence: dispute.evidence ? [...dispute.evidence] : undefined,
  }));
}

function cloneSearchTickets(searchTickets: SearchTicket[] = seedSearchTickets) {
  return searchTickets.map((ticket) => ({ ...ticket }));
}

function cloneJob(job: Job): Job {
  return {
    ...job,
    photos: job.photos ? [...job.photos] : undefined,
    questionnaire: job.questionnaire ? { ...job.questionnaire } : undefined,
  };
}

function cloneCreatedJobs(createdJobs: Job[] = []) {
  return createdJobs.map((job) => cloneJob(job));
}

function resolveClientSnapshot(currentClientId: string) {
  if (currentClientId === currentClient.id) {
    return {
      id: currentClient.id,
      name: currentClient.name,
      avatar: currentClient.avatar,
      rating: currentClient.rating ?? 0,
    };
  }

  const matchingSeedJob = jobs.find((job) => job.clientId === currentClientId);
  if (matchingSeedJob) {
    return {
      id: matchingSeedJob.clientId,
      name: matchingSeedJob.clientName,
      avatar: matchingSeedJob.clientAvatar,
      rating: matchingSeedJob.clientRating,
    };
  }

  return {
    id: currentClientId,
    name: currentClient.name,
    avatar: currentClient.avatar,
    rating: currentClient.rating ?? 0,
  };
}

function getApproximateLocationLabel(location: string) {
  const trimmedLocation = location.trim();
  return trimmedLocation ? `${trimmedLocation} (aprox.)` : "Zona pendiente (aprox.)";
}

const LOCATION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Vigo: { lat: 42.2406, lng: -8.7207 },
  "A Coruña": { lat: 43.3623, lng: -8.4115 },
  "Santiago de Compostela": { lat: 42.8782, lng: -8.5448 },
  Pontevedra: { lat: 42.4338, lng: -8.648 },
  Ourense: { lat: 42.3358, lng: -7.8639 },
  Lugo: { lat: 43.0121, lng: -7.5559 },
  Ferrol: { lat: 43.4846, lng: -8.2353 },
  Sanxenxo: { lat: 42.3995, lng: -8.8069 },
  Cangas: { lat: 42.2648, lng: -8.7828 },
  "Otra ciudad": { lat: 42.2406, lng: -8.7207 },
};

function getCoordinatesForLocation(location: string) {
  return LOCATION_COORDINATES[location] ?? LOCATION_COORDINATES[currentClient.location] ?? {
    lat: 42.2406,
    lng: -8.7207,
  };
}

function parsePriceRange(priceRange: string) {
  const normalizedPriceRange = priceRange.trim();

  if (normalizedPriceRange === "Menos de 100€") {
    return { priceMin: 0, priceMax: 100 };
  }

  if (normalizedPriceRange === "100–300€") {
    return { priceMin: 100, priceMax: 300 };
  }

  if (normalizedPriceRange === "300–700€") {
    return { priceMin: 300, priceMax: 700 };
  }

  if (normalizedPriceRange === "700–1.500€") {
    return { priceMin: 700, priceMax: 1500 };
  }

  if (normalizedPriceRange === "1.500–3.000€") {
    return { priceMin: 1500, priceMax: 3000 };
  }

  if (normalizedPriceRange === "Más de 3.000€") {
    return { priceMin: 3000, priceMax: 6000 };
  }

  if (normalizedPriceRange === "No tengo idea, quiero que me propongan") {
    return { priceMin: 0, priceMax: 3000 };
  }

  return { priceMin: 0, priceMax: 0 };
}

function buildClientCreatedJob(
  input: CreateClientJobInput,
  currentClientId: string,
  existingJobs: Job[],
) {
  const clientSnapshot = resolveClientSnapshot(currentClientId);
  const postedAt = new Date().toISOString();
  const { priceMin, priceMax } = parsePriceRange(input.priceRange);
  const coordinates = getCoordinatesForLocation(input.location);
  let jobId = `demo-job-${Date.now()}`;

  while (existingJobs.some((job) => job.id === jobId)) {
    jobId = `demo-job-${Date.now()}-${Math.round(Math.random() * 1000)}`;
  }

  return {
    id: jobId,
    title: input.title.trim() || "Trabajo sin título",
    categoryId: input.categoryId,
    category: input.categoryName,
    service: input.serviceName,
    location: input.location,
    locationApprox: getApproximateLocationLabel(input.location),
    lat: coordinates.lat,
    lng: coordinates.lng,
    status: "published" as const,
    priceMin,
    priceMax,
    requests: 0,
    posted: "ahora",
    postedAt,
    clientId: clientSnapshot.id,
    clientName: clientSnapshot.name,
    clientAvatar: clientSnapshot.avatar,
    clientRating: clientSnapshot.rating,
    description: input.description.trim(),
    questionnaire: {
      ...(input.questionnaire ?? {}),
      budgetLabel: input.priceRange,
      urgent: input.urgent ? "Sí" : "No",
      ...(input.serviceId ? { serviceId: input.serviceId } : {}),
    },
  } satisfies Job;
}

function cloneProfessionalWorkBase(
  workBase?: Partial<ProfessionalCatalogWorkBase>,
): ProfessionalCatalogWorkBase {
  return {
    postalCode: workBase?.postalCode ?? "",
    municipality: workBase?.municipality ?? "",
    locality: workBase?.locality ?? "",
    privateAddress: workBase?.privateAddress ?? "",
  };
}

function normalizeProfessionalCatalogProfile(
  profile?: Partial<ProfessionalCatalogProfile>,
): ProfessionalCatalogProfile | undefined {
  if (!profile) return undefined;

  return {
    selectedServiceIds: [...(profile.selectedServiceIds ?? [])],
    primaryServiceId: profile.primaryServiceId || undefined,
    specialtyNames: profile.specialtyNames ? [...profile.specialtyNames] : undefined,
    workBase: cloneProfessionalWorkBase(profile.workBase),
    radiusKm: typeof profile.radiusKm === "number" ? profile.radiusKm : 25,
    updatedAt: profile.updatedAt ?? "",
  };
}

function mergeProfessionalCatalogProfile(
  currentProfile: Partial<ProfessionalCatalogProfile> | undefined,
  patch: UpdateProfessionalCatalogProfileInput,
): ProfessionalCatalogProfile {
  const current = normalizeProfessionalCatalogProfile(currentProfile);

  return {
    selectedServiceIds: [...(patch.selectedServiceIds ?? current?.selectedServiceIds ?? [])],
    primaryServiceId:
      patch.primaryServiceId !== undefined
        ? patch.primaryServiceId || undefined
        : current?.primaryServiceId,
    specialtyNames:
      patch.specialtyNames !== undefined
        ? [...patch.specialtyNames]
        : current?.specialtyNames,
    workBase: cloneProfessionalWorkBase({
      ...current?.workBase,
      ...patch.workBase,
    }),
    radiusKm: patch.radiusKm ?? current?.radiusKm ?? 25,
    updatedAt: new Date().toISOString(),
  };
}

function hasCatalogServiceNamed(services: CatalogService[] = [], requestedName: string) {
  const normalizedRequestedName = normalizeCatalogText(requestedName);
  return services.some(
    (service) =>
      service.active && normalizeCatalogText(service.name) === normalizedRequestedName,
  );
}

function hasActiveCatalogRequestNamed(
  requests: CatalogRequest[] = [],
  requestedName: string,
) {
  const normalizedRequestedName = normalizeCatalogText(requestedName);
  return requests.some(
    (request) =>
      ACTIVE_CATALOG_REQUEST_STATUSES.has(request.status) &&
      normalizeCatalogText(request.requestedName) === normalizedRequestedName,
  );
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

export function getCurrentClientId(state: SessionState) {
  return state.currentClientId;
}

export function getEffectiveJobs(state: SessionState) {
  const effectiveJobs = [...(state.createdJobs ?? []).map(cloneJob), ...jobs];

  return effectiveJobs.map((job) => {
    const withOverrides = applyJobOverride(job, state.jobOverrides[job.id]);
    return applyAgreementSnapshot(withOverrides, state.agreements[job.id]);
  });
}

export function getEffectiveJobById(state: SessionState, jobId: string) {
  const job = [...(state.createdJobs ?? []), ...jobs].find((entry) => entry.id === jobId);
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

export function getEffectiveNotifications(state: SessionState) {
  return state.notifications;
}

export function getEffectiveDisputes(state: SessionState) {
  return state.disputes;
}

export function getEffectiveSearchTickets(state: SessionState) {
  return state.searchTickets;
}

export function getProfessionalCatalogProfile(
  state: SessionState,
  professionalId: string,
) {
  return normalizeProfessionalCatalogProfile(
    state.professionalProfileOverrides?.[professionalId],
  );
}

export function getEffectiveCatalogRequests(state: SessionState) {
  return state.catalogRequests ?? [];
}

export function getEffectiveApprovedCatalogServices(state: SessionState) {
  return state.approvedCatalogServices ?? [];
}

export function getEffectiveApprovedCatalogCategories(state: SessionState) {
  return state.approvedCatalogCategories ?? [];
}

export function getJobOutreachMeta(state: SessionState, jobId: string) {
  return state.jobOutreachMeta[jobId];
}

export function getSearchTicketByJobId(state: SessionState, jobId: string) {
  return state.searchTickets.find((ticket) => ticket.jobId === jobId);
}

export function hasOpenSearchTicket(state: SessionState, jobId: string) {
  return state.searchTickets.some(
    (ticket) => ticket.jobId === jobId && ticket.status === "open",
  );
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
          notifications: cloneNotifications(),
          disputes: cloneDisputes(),
          searchTickets: cloneSearchTickets(),
          createdJobs: [],
          jobOutreachMeta: {},
          professionalProfileOverrides: {},
          catalogRequests: [],
          approvedCatalogServices: [],
          approvedCatalogCategories: [],
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
      notifications: cloneNotifications(),
      disputes: cloneDisputes(),
      searchTickets: cloneSearchTickets(),
      createdJobs: [],
      jobOutreachMeta: {},
      professionalProfileOverrides: {},
      catalogRequests: [],
      approvedCatalogServices: [],
      approvedCatalogCategories: [],
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
                completionDeadline: undefined,
                disputeOpenedAt: undefined,
                disputeReason: undefined,
                finalPrice: agreement.finalPrice,
                commissionPct: agreement.commissionPct,
              },
            },
          };
        }),
      autoReleaseCompletedJob: (jobId) =>
        set((s) => {
          const job = getEffectiveJobById(s, jobId);
          const agreement = s.agreements[jobId];
          if (
            !job ||
            !canAutoReleaseCompletedJob({
              status: job.status,
              agreement,
              completionDeadline: job.completionDeadline,
            })
          ) {
            return {};
          }

          const notification: Notification = {
            id: `n-payment-auto-${jobId}-${Date.now()}`,
            text: "Pago liberado automáticamente al profesional",
            sub: job.title,
            time: "ahora",
            unread: true,
            type: "payment",
            jobId,
          };

          return {
            jobOverrides: {
              ...s.jobOverrides,
              [jobId]: {
                ...s.jobOverrides[jobId],
                status: "completed",
                completionDeadline: undefined,
                disputeOpenedAt: undefined,
                disputeReason: undefined,
                finalPrice: agreement?.finalPrice ?? job.finalPrice,
                commissionPct: agreement?.commissionPct ?? job.commissionPct,
              },
            },
            notifications: [notification, ...s.notifications],
          };
        }),
      openJobDispute: (jobId, reason, description, evidence) =>
        set((s) => {
          const job = getEffectiveJobById(s, jobId);
          const agreement = s.agreements[jobId];
          if (
            !job ||
            !canOpenDispute({
              status: job.status,
              agreement,
              role: "client",
              completionDeadline: job.completionDeadline,
            })
          ) {
            return {};
          }

          const openedAt = new Date().toISOString();
          const dispute: Dispute = {
            id: `d-${jobId}-${Date.now()}`,
            jobId,
            openedBy: "client",
            reason,
            description,
            status: "open",
            openedAt,
            evidence: evidence.length > 0 ? evidence : undefined,
          };
          const notification: Notification = {
            id: `n-dispute-${jobId}-${Date.now()}`,
            text: "Se ha abierto una disputa",
            sub: job.title,
            time: "ahora",
            unread: true,
            type: "dispute",
            jobId,
          };

          return {
            jobOverrides: {
              ...s.jobOverrides,
              [jobId]: {
                ...s.jobOverrides[jobId],
                status: "dispute",
                completionDeadline: undefined,
                disputeOpenedAt: openedAt,
                disputeReason: reason,
                finalPrice: agreement?.finalPrice ?? job.finalPrice,
                commissionPct: agreement?.commissionPct ?? job.commissionPct,
              },
            },
            disputes: [dispute, ...s.disputes],
            notifications: [notification, ...s.notifications],
          };
        }),
      resolveDispute: (disputeId, status) =>
        set((s) => ({
          disputes: s.disputes.map((dispute) =>
            dispute.id === disputeId ? { ...dispute, status } : dispute,
          ),
        })),
      recordInvitationsSent: (jobId, invitedCount) =>
        set((s) => ({
          jobOutreachMeta: {
            ...s.jobOutreachMeta,
            [jobId]: {
              ...s.jobOutreachMeta[jobId],
              invitedCount,
              invitationsSentAt: new Date().toISOString(),
            },
          },
        })),
      createSearchTicket: (jobId, reason) =>
        set((s) => {
          const existing = s.searchTickets.find((ticket) => ticket.jobId === jobId);
          if (existing) return {};

          const job = getEffectiveJobById(s, jobId);
          if (!job) return {};

          const createdAt = new Date().toISOString();
          const ticketId = `t-${jobId}`;
          const ticket: SearchTicket = {
            id: ticketId,
            jobId,
            clientId: job.clientId,
            clientName: job.clientName,
            service: job.service,
            zone: reason === "no_pros_in_zone" ? job.locationApprox : job.location,
            radiusKm: 25,
            createdAt,
            reason,
            status: "open",
          };
          const notification: Notification = {
            id: `n-ticket-${jobId}`,
            text:
              reason === "no_pros_in_zone"
                ? "Hemos creado un ticket de búsqueda porque no hay profesionales en tu zona"
                : "Hemos creado un ticket de búsqueda porque sigues sin respuesta útil",
            sub: job.title,
            time: "ahora",
            unread: true,
            type: "system",
            jobId,
          };

          return {
            searchTickets: [ticket, ...s.searchTickets],
            notifications: [notification, ...s.notifications],
            jobOutreachMeta: {
              ...s.jobOutreachMeta,
              [jobId]: {
                ...s.jobOutreachMeta[jobId],
                searchTicketId: ticketId,
              },
            },
          };
        }),
      setSearchTicketStatus: (ticketId, status) =>
        set((s) => ({
          searchTickets: s.searchTickets.map((ticket) =>
            ticket.id === ticketId ? { ...ticket, status } : ticket,
          ),
        })),
      createClientJob: (input) => {
        let createdJob = buildClientCreatedJob(input, currentClient.id, jobs);

        set((s) => {
          createdJob = buildClientCreatedJob(
            input,
            s.currentClientId,
            [...(s.createdJobs ?? []), ...jobs],
          );

          return {
            createdJobs: [createdJob, ...cloneCreatedJobs(s.createdJobs ?? [])],
          };
        });

        return createdJob;
      },
      updateProfessionalCatalogProfile: (professionalId, patch) => {
        let nextProfile = mergeProfessionalCatalogProfile(undefined, patch);

        set((s) => {
          nextProfile = mergeProfessionalCatalogProfile(
            s.professionalProfileOverrides?.[professionalId],
            patch,
          );

          return {
            professionalProfileOverrides: {
              ...(s.professionalProfileOverrides ?? {}),
              [professionalId]: nextProfile,
            },
          };
        });

        return nextProfile;
      },
      createCatalogRequest: (input) => {
        let result: CreateCatalogRequestResult = { ok: false, reason: "empty" };

        set((s) => {
          const requestedName = input.requestedName.trim();
          if (!requestedName) {
            result = { ok: false, reason: "empty" };
            return {};
          }

          const currentRequests = s.catalogRequests ?? [];
          const approvedServices = s.approvedCatalogServices ?? [];
          if (hasActiveCatalogRequestNamed(currentRequests, requestedName)) {
            result = { ok: false, reason: "duplicate_request" };
            return {};
          }

          if (
            hasCatalogServiceNamed(approvedServices, requestedName) ||
            hasCatalogServiceNamed(getSeedCatalogServices(), requestedName)
          ) {
            result = { ok: false, reason: "duplicate_service" };
            return {};
          }

          const createdAt = new Date().toISOString();
          const request: CatalogRequest = {
            id: `catalog-request-${slugifyCatalogText(requestedName)}-${Date.now()}`,
            requestedName,
            suggestedCategoryId: input.suggestedCategoryId,
            suggestedCategoryName: input.suggestedCategoryName,
            description: input.description,
            requestedByUserId: input.requestedByUserId,
            requestedByName: input.requestedByName,
            requestedByRole: input.requestedByRole,
            status: "pending",
            createdAt,
          };

          result = { ok: true, request };
          return { catalogRequests: [request, ...currentRequests] };
        });

        return result;
      },
      createApprovedCatalogCategory: (input) => {
        let result: CreateApprovedCatalogCategoryResult = { ok: false, reason: "empty" };

        set((s) => {
          const categoryName = formatCatalogServiceName(input.name);
          const categoryGroup = input.group?.trim() || DEFAULT_APPROVED_CATALOG_GROUP;
          if (!categoryName) {
            result = { ok: false, reason: "empty" };
            return {};
          }

          const approvedCategories = s.approvedCatalogCategories ?? [];
          const normalizedCategoryName = normalizeCatalogText(categoryName);
          const existingSeedCategory = getSeedCatalogCategories().find(
            (category) =>
              normalizeCatalogText(category.name) === normalizedCategoryName,
          );

          if (existingSeedCategory) {
            result = { ok: true, category: existingSeedCategory, created: false };
            return {};
          }

          const existingApprovedCategoryIndex = approvedCategories.findIndex(
            (category) =>
              normalizeCatalogText(category.name) === normalizedCategoryName,
          );

          if (existingApprovedCategoryIndex >= 0) {
            const existingApprovedCategory = approvedCategories[existingApprovedCategoryIndex];
            const normalizedExistingApprovedCategory = normalizeApprovedCatalogCategory(
              existingApprovedCategory,
            );
            const shouldUpdateGroup =
              Boolean(input.group?.trim()) ||
              normalizedExistingApprovedCategory.group !== existingApprovedCategory.group;

            const nextCategory = shouldUpdateGroup
              ? applyApprovedCatalogCategoryGroup(
                  normalizedExistingApprovedCategory,
                  categoryGroup,
                )
              : normalizedExistingApprovedCategory;

            result = { ok: true, category: nextCategory, created: false };

            if (
              nextCategory.group === existingApprovedCategory.group &&
              nextCategory.icon === existingApprovedCategory.icon &&
              nextCategory.color === existingApprovedCategory.color
            ) {
              return {};
            }

            return {
              approvedCatalogCategories: approvedCategories.map((category, index) =>
                index === existingApprovedCategoryIndex ? nextCategory : category,
              ),
            };
          }

          const category = buildApprovedCatalogCategoryFromName(
            categoryName,
            input.createdFromRequestId,
            categoryGroup,
          );
          result = { ok: true, category, created: true };
          return {
            approvedCatalogCategories: [category, ...approvedCategories],
          };
        });

        return result;
      },
      approveCatalogRequest: (requestId, options) => {
        let approvedRequest: CatalogRequest | undefined;

        set((s) => {
          const currentRequests = s.catalogRequests ?? [];
          const request = currentRequests.find((entry) => entry.id === requestId);
          if (!request) return {};
          if (!options.categoryId.trim() || !options.categoryName.trim()) return {};

          const serviceName = formatCatalogServiceName(
            options.serviceName ?? request.requestedName,
          );
          if (!serviceName) return {};

          const category = getEffectiveCatalogCategories(
            s.approvedCatalogCategories ?? [],
          ).find(
            (entry) =>
              entry.id === options.categoryId &&
              normalizeCatalogText(entry.name) === normalizeCatalogText(options.categoryName),
          );
          if (!category) return {};

          const reviewedAt = new Date().toISOString();
          const service = buildApprovedCatalogServiceFromRequest(
            request,
            { id: category.id, name: category.name },
            serviceName,
          );
          const currentApprovedServices = s.approvedCatalogServices ?? [];
          const existingApprovedService = currentApprovedServices.find(
            (entry) =>
              entry.active &&
              normalizeCatalogText(entry.name) === normalizeCatalogText(service.name),
          );
          const existingSeedService = getSeedCatalogServices().find(
            (entry) =>
              entry.active &&
              normalizeCatalogText(entry.name) === normalizeCatalogText(service.name),
          );
          if (existingApprovedService || existingSeedService) {
            return {};
          }

          approvedRequest = {
            ...request,
            suggestedCategoryId: category.id,
            suggestedCategoryName: category.name,
            status: "approved",
            reviewedAt,
            reviewedByAdminId: options.reviewedByAdminId,
            rejectionReason: undefined,
            mergedIntoServiceId: undefined,
            approvedServiceId: service.id,
          };

          return {
            catalogRequests: currentRequests.map((entry) =>
              entry.id === requestId ? approvedRequest! : entry,
            ),
            approvedCatalogServices: [service, ...currentApprovedServices],
          };
        });

        return approvedRequest;
      },
      rejectCatalogRequest: (requestId, reason) => {
        let rejectedRequest: CatalogRequest | undefined;

        set((s) => {
          const currentRequests = s.catalogRequests ?? [];
          const request = currentRequests.find((entry) => entry.id === requestId);
          if (!request) return {};

          rejectedRequest = {
            ...request,
            status: "rejected",
            reviewedAt: new Date().toISOString(),
            rejectionReason: reason?.trim() || "Rechazada en demo por admin",
            mergedIntoServiceId: undefined,
            approvedServiceId: undefined,
          };

          return {
            catalogRequests: currentRequests.map((entry) =>
              entry.id === requestId ? rejectedRequest! : entry,
            ),
          };
        });

        return rejectedRequest;
      },
      mergeCatalogRequest: (requestId, options) => {
        let mergedRequest: CatalogRequest | undefined;

        set((s) => {
          const currentRequests = s.catalogRequests ?? [];
          const request = currentRequests.find((entry) => entry.id === requestId);
          if (!request) return {};

          const effectiveServices = getEffectiveCatalogServices(
            s.approvedCatalogServices ?? [],
          );
          const mergedService = effectiveServices.find(
            (service) => service.id === options.mergedIntoServiceId,
          );
          if (!mergedService) return {};

          mergedRequest = {
            ...request,
            status: "merged",
            reviewedAt: new Date().toISOString(),
            reviewedByAdminId: options.reviewedByAdminId,
            rejectionReason: undefined,
            approvedServiceId: undefined,
            suggestedCategoryId: mergedService.categoryId,
            suggestedCategoryName: mergedService.categoryName,
            mergedIntoServiceId: mergedService.id,
          };

          return {
            catalogRequests: currentRequests.map((entry) =>
              entry.id === requestId ? mergedRequest! : entry,
            ),
          };
        });

        return mergedRequest;
      },
    }),
    { name: "arranxos-session" },
  ),
);
