// ─── User & Auth Types ───────────────────────────────────────────────
// These are the unified types shared across both the festival and streaming platforms.
// A single user can be a filmmaker, festival organizer, viewer, or all three.

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: UserRole;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'viewer' | 'creator' | 'organizer' | 'admin';

export interface AuthTokenPayload {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  // Festival-side: which tenant they belong to (null for streaming-only users)
  tenantId: string | null;
  tenantSubdomain: string | null;
  // Token metadata
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  // Optional: login to a specific tenant context
  tenantSubdomain?: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  // If registering as a festival organizer, create a tenant
  tenantName?: string;
  tenantSubdomain?: string;
}

// ─── Tenant Types ────────────────────────────────────────────────────

export type PlanTier = 'free' | 'creator' | 'organizer' | 'platform';

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  plan: PlanTier;
  isActive: boolean;
  createdAt: Date;
}

// ─── Film Types ──────────────────────────────────────────────────────
// Films exist in both contexts: as streaming content AND as festival submissions

export type FilmStatus =
  | 'draft'
  | 'uploading'
  | 'processing'
  | 'published'
  | 'submitted'
  | 'in_review'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export interface Film {
  id: string;
  title: string;
  description: string | null;
  duration: number | null;
  genre: string | null;
  language: string | null;
  thumbnailUrl: string | null;
  status: FilmStatus;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Subscription & Billing Types ────────────────────────────────────

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: PlanTier;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  limits: PlanLimits;
}

export interface PlanLimits {
  maxUploadsPerMonth: number;
  maxStorageGb: number;
  maxFestivalSubmissionsPerMonth: number;
  maxFestivals: number;          // For organizers
  maxJudgesPerFestival: number;  // For organizers
  videoQualityLevels: string[];  // e.g., ['360p', '720p', '1080p']
  cdnEnabled: boolean;
  analyticsEnabled: boolean;
  customBranding: boolean;
}

// ─── API Response Types ──────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Event Types (for cross-service communication) ───────────────────

export type PlatformEvent =
  | { type: 'film.published'; filmId: string; creatorId: string }
  | { type: 'film.submitted'; filmId: string; festivalId: string }
  | { type: 'film.accepted'; filmId: string; festivalId: string; awardId?: string }
  | { type: 'user.registered'; userId: string; role: UserRole }
  | { type: 'subscription.changed'; userId: string; plan: PlanTier }
  | { type: 'award.granted'; filmId: string; festivalId: string; awardName: string };
