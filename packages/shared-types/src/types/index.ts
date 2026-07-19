// Shared TypeScript types for Festival Pro
// Used by both frontend and backend

// Authentication & Users
export interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  role: 'tenant_admin' | 'admin' | 'judge' | 'submitter';
  tenant: Tenant;
  lastLogin?: string;
  createdAt: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  tenantSubdomain: string;
}

export interface RegisterData {
  tenantName: string;
  subdomain: string;
  email: string;
  adminName: string;
  adminUsername: string;
  adminPassword: string;
  subscriptionTier?: 'starter' | 'professional' | 'enterprise';
}

// Tenants & Multi-tenancy
export interface Tenant {
  id: number;
  uuid: string;
  name: string;
  subdomain: string;
  email: string;
  planType: 'starter' | 'professional' | 'enterprise';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  settings: Record<string, any>;
  storageUsed: number;
  storageLimit: number;
  apiEnabled: boolean;
  customDomain?: string;
}

// Festivals
export interface Festival {
  id: number;
  tenantId: number;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  logoUrl?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  submissionDeadline?: string;
  earlyBirdDeadline?: string;
  notificationDate?: string;
  entryFee?: number;
  earlyBirdFee?: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  settings: Record<string, any>;
  _count?: {
    films: number;
    awards: number;
  };
}

export interface CreateFestivalData {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  logoUrl?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  submissionDeadline?: string;
  earlyBirdDeadline?: string;
  notificationDate?: string;
  entryFee?: number;
  earlyBirdFee?: number;
  currency?: string;
  settings?: Record<string, any>;
}

// Films & Submissions
export interface Film {
  id: number;
  tenantId: number;
  festivalId: number;
  title: string;
  director?: string;
  producer?: string;
  writer?: string;
  duration?: number;
  year?: number;
  country?: string;
  language?: string;
  subtitles?: string;
  genre?: string;
  synopsis?: string;
  submissionDate: string;
  status: FilmStatus;
  screeningFormat?: string;
  aspectRatio?: string;
  soundFormat?: string;
  premiereStatus?: string;
  studentFilm: boolean;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  entryFeePaid: boolean;
  paymentDate?: string;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type FilmStatus =
  | 'draft'
  | 'pending'
  | 'submitted'
  | 'in_review'
  | 'accepted'
  | 'rejected'
  | 'waitlisted'
  | 'withdrawn'
  | 'disqualified';

export interface FilmFile {
  id: number;
  filmId: number;
  fileType: 'video' | 'trailer' | 'poster' | 'still' | 'press_kit' | 'other';
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  isPrimary: boolean;
}

// Categories & Awards
export interface FilmCategory {
  id: number;
  tenantId: number;
  festivalId: number;
  name: string;
  description?: string;
  entryFee?: number;
  createdAt: string;
}

export interface Award {
  id: number;
  festivalId: number;
  filmId?: number;
  category?: string;
  awardName: string;
  recipientName?: string;
  year?: number;
  createdAt: string;
}

// Video Conferencing
export interface VideoRoom {
  id: number;
  tenantId: number;
  roomId: string;
  name?: string;
  createdBy?: number;
  maxParticipants: number;
  isActive: boolean;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  settings: Record<string, any>;
}

export interface RoomParticipant {
  id: number;
  roomId: number;
  userId: number;
  peerId?: string;
  joinedAt: string;
  leftAt?: string;
  role: 'host' | 'moderator' | 'participant';
  isActive: boolean;
}

// API Responses
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  message?: string;
  timestamp: string;
}

// Error Types
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  stack?: string;
  details?: any;
}

// Statistics & Analytics
export interface TenantStats {
  festivals: number;
  films: number;
  storage: {
    used: number;
    limit: number;
    percentage: number;
  };
  trends: {
    month: string;
    count: number;
  }[];
}

export interface FestivalStats {
  filmsByStatus: {
    status: string;
    _count: { id: number };
  }[];
  submissionsOverTime: {
    date: string;
    count: number;
  }[];
  topGenres: {
    genre: string;
    _count: { id: number };
  }[];
  countries: {
    country: string;
    _count: { id: number };
  }[];
}

// Form Types
export interface LoginForm {
  username: string;
  password: string;
  tenantSubdomain: string;
  rememberMe?: boolean;
}

export interface RegisterForm {
  tenantName: string;
  subdomain: string;
  email: string;
  adminName: string;
  adminUsername: string;
  adminPassword: string;
  confirmPassword: string;
  subscriptionTier: 'starter' | 'professional' | 'enterprise';
  acceptTerms: boolean;
}

// Subscription & Billing
export interface Subscription {
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string;
  cancelledAt?: string;
}

export interface PlanLimits {
  festivals: number; // -1 for unlimited
  submissions: number; // -1 for unlimited
  storage: string;
  users: number; // -1 for unlimited
  apiCalls: number;
}

// WebSocket Events
export interface WebSocketEvent {
  type: string;
  payload: any;
  timestamp: string;
}

// File Upload
export interface FileUploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

// Search & Filtering
export interface SearchFilters {
  search?: string;
  status?: string;
  genre?: string;
  country?: string;
  year?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}