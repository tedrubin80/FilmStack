export interface AuthTokenPayload {
  userId: string;
  username: string;
  email: string;
  role: string;
  tenantId: string | null;
  tenantSubdomain: string | null;
  type: 'access' | 'refresh';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
  accessTokenExpiry: string;   // e.g. '15m'
  refreshTokenExpiry: string;  // e.g. '7d'
}
