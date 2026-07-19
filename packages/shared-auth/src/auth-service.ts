import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import type { AuthTokenPayload, AuthTokens, AuthConfig } from './types';

/** Convert a duration string like '15m' or '7d' to seconds for jwt.sign */
function parseExpiry(value: string): number {
  const match = value.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 86400; // default 24h
  const n = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return n;
    case 'm': return n * 60;
    case 'h': return n * 3600;
    case 'd': return n * 86400;
    default: return 86400;
  }
}

/**
 * Shared auth service used by both the festival and streaming APIs.
 * Handles JWT creation, verification, and refresh token hashing.
 *
 * Token strategy:
 * - Access token: short-lived (15m), contains user claims
 * - Refresh token: long-lived (7d), stored hashed in DB, rotated on use
 *
 * Both APIs verify the same tokens, enabling SSO across the platform.
 */
export class AuthService {
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    if (config.jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters');
    }
    if (config.jwtRefreshSecret.length < 32) {
      throw new Error('JWT_REFRESH_SECRET must be at least 32 characters');
    }
    this.config = config;
  }

  /**
   * Generate both access and refresh tokens for a user.
   */
  generateTokens(payload: Omit<AuthTokenPayload, 'type'>): AuthTokens {
    const accessOpts: SignOptions = { expiresIn: parseExpiry(this.config.accessTokenExpiry) };
    const refreshOpts: SignOptions = { expiresIn: parseExpiry(this.config.refreshTokenExpiry) };

    const accessToken = jwt.sign(
      { ...payload, type: 'access' } satisfies AuthTokenPayload,
      this.config.jwtSecret,
      accessOpts,
    );

    const refreshToken = jwt.sign(
      { ...payload, type: 'refresh' } satisfies AuthTokenPayload,
      this.config.jwtRefreshSecret,
      refreshOpts,
    );

    return { accessToken, refreshToken };
  }

  /**
   * Verify an access token. Returns the decoded payload or null.
   */
  verifyAccessToken(token: string): AuthTokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret) as AuthTokenPayload;
      if (decoded.type !== 'access') return null;
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Verify a refresh token. Returns the decoded payload or null.
   */
  verifyRefreshToken(token: string): AuthTokenPayload | null {
    try {
      const decoded = jwt.verify(
        token,
        this.config.jwtRefreshSecret,
      ) as AuthTokenPayload;
      if (decoded.type !== 'refresh') return null;
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Hash a refresh token for safe storage in the database.
   * We never store raw refresh tokens — only their SHA-256 hash.
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
