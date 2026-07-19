// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: any[];
}

// User and Authentication Types
export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  tenant: {
    id: number;
    name: string;
    subdomain: string;
    planType: string;
    settings: string;
  };
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
  subscriptionTier?: string;
}

// Platform Admin Types
export interface Tenant {
  id: number;
  uuid: string;
  subdomain: string;
  name: string;
  email: string;
  planType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  storageUsed: number;
  storageLimit: number;
  apiEnabled: boolean;
  apiRateLimit: number;
  customDomain: string | null;
  settings: string;
  securitySettings: string;
}

export interface TenantWithCounts extends Tenant {
  _count: {
    adminUsers: number;
    festivals: number;
    films: number;
    payments: number;
  };
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// GDPR Types
export interface DataExportRequest {
  id: number;
  userId: number;
  requestType: 'export' | 'deletion';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  completedAt?: string;
  downloadUrl?: string;
  expiresAt?: string;
}

export interface GDPRConsent {
  id: number;
  userId: number;
  consentType: string;
  granted: boolean;
  grantedAt: string;
  revokedAt?: string;
  ipAddress: string;
  userAgent: string;
}

// Festival Management Types
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
  settings: string;
}

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
  status: string;
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