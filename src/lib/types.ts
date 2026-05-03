// ── Core domain types for Arranxos ──────────────────────────────────────────

export type UserRole = "client" | "professional" | "admin";

export type ProStatus = "pending" | "approved" | "blocked";

export type JobStatus =
  | "published"
  | "in_progress"
  | "agreement_pending"
  | "agreed"
  | "escrow_funded"
  | "completed_pending_confirmation"
  | "completed"
  | "dispute"
  | "cancelled";

export interface User {
  id: string;
  name: string;
  avatar: string; // initials, 2 chars
  role: UserRole;
  location: string;
  email?: string;
  phone?: string;
  memberSince?: string;
  rating?: number;
  reviews?: number;
  jobsPublished?: number;
  strikes?: number;
  verified?: boolean;
}

export interface Professional {
  id: string;
  name: string;
  avatar: string;
  specialty: string;
  specialties?: string[];
  location: string;
  rating: number;
  reviews: number;
  verified: boolean;
  status: ProStatus;
  badge?: string;
  jobs: number;
  since: string;
  responseTime: string;
  distance?: string;
  bio?: string;
  phone?: string;
  email?: string;
  dni?: string;
  zone?: string;
  radiusKm?: number;
  reliability?: number; // 0–100
  strikes?: number;
  completedOnTime?: number; // %
  avgPrice?: string;
  portfolio?: string[]; // urls
  lat?: number;
  lng?: number;
}

export interface Job {
  id: string;
  title: string;
  categoryId: string;
  category: string;
  service: string;
  location: string;
  locationApprox: string;
  lat: number;
  lng: number;
  status: JobStatus;
  priceMin: number;
  priceMax: number;
  finalPrice?: number;
  requests: number;
  invitations?: number;
  posted: string;
  postedAt: string; // ISO
  clientId: string;
  clientName: string;
  clientAvatar: string;
  clientRating: number;
  description: string;
  photos?: string[];
  hasPhotos?: boolean;
  questionnaire?: Record<string, string>;
  assignedProId?: string;
  completionDeadline?: string; // ISO — auto-release countdown
  disputeOpenedAt?: string;
  disputeReason?: string;
  commissionPct?: number; // snapshot at agreement time
}

export interface JobRequest {
  id: string;
  jobId: string;
  proId: string;
  proName: string;
  message?: string;
  status: "pending" | "accepted" | "rejected" | "closed";
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  jobId: string;
  from: "pro" | "client" | "system";
  text: string;
  time: string;
  timestamp: string;
  type?: "text" | "proposal" | "agreement" | "system" | "warning";
  proposalAmount?: number;
  flagged?: boolean;
  flagReason?: string;
  redacted?: string;
}

export interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  text: string;
  date: string;
  targetId: string; // pro or client id
  targetType: "professional" | "client";
  jobId?: string;
}

export interface Notification {
  id: string;
  text: string;
  sub?: string;
  time: string;
  unread: boolean;
  type: "request" | "agreement" | "review" | "payment" | "dispute" | "system";
  jobId?: string;
}

export interface Dispute {
  id: string;
  jobId: string;
  openedBy: "client" | "professional";
  reason: string;
  description: string;
  status: "open" | "reviewing" | "resolved_client" | "resolved_pro" | "split";
  openedAt: string;
  evidence?: string[];
}

export interface AdminConfig {
  commissionPct: number; // default 9
  autoReleaseDays: number; // default 5
  invitationLimitPerJob: number; // default 10
  searchTicketNoResponseDays: number; // default 5
  strikeAutoBlockThreshold: number; // default 3 (configurable)
  antiLeakEnabled: boolean;
  antiLeakRules: {
    phones: boolean;
    emails: boolean;
    urls: boolean;
    whatsapp: boolean;
  };
}

export interface SearchTicket {
  id: string;
  jobId?: string;
  clientId: string;
  clientName: string;
  service: string;
  zone: string;
  radiusKm: number;
  createdAt: string;
  reason: "no_pros_in_zone" | "no_useful_response";
  status: "open" | "matched" | "closed";
}

export type CatalogRequestStatus =
  | "pending"
  | "reviewing"
  | "approved"
  | "rejected"
  | "merged";

export interface CatalogService {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description?: string;
  aliases?: string[];
  active: boolean;
  source: "seed" | "admin_approved";
  createdFromRequestId?: string;
}

export interface CatalogCategory {
  id: string;
  name: string;
  icon?: string;
  group?: string;
  color?: string;
  active: boolean;
  source: "seed" | "admin_approved";
  createdFromRequestId?: string;
}

export interface CatalogRequest {
  id: string;
  requestedName: string;
  suggestedCategoryId?: string;
  suggestedCategoryName?: string;
  description?: string;
  requestedByUserId: string;
  requestedByName: string;
  requestedByRole: "professional" | "client" | "admin";
  status: CatalogRequestStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedByAdminId?: string;
  rejectionReason?: string;
  mergedIntoServiceId?: string;
  approvedServiceId?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  services: string[];
  group: string;
  color: string;
}

export interface CategoryGroup {
  group: string;
  icon: string;
  color: string;
  categories: {
    id: string;
    name: string;
    icon: string;
    services: string[];
  }[];
}
