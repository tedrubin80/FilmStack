import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@filmstack/shared-db';
import { logger } from '../utils/logger';

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

export interface AuthResult {
  success: boolean;
  user?: any;
  token?: string;
  error?: string;
}

export class AuthService {
  private static readonly JWT_SECRET = (() => {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error(
        'JWT_SECRET environment variable must be set with minimum 32 characters. ' +
          'Generate a secure secret with: openssl rand -base64 32'
      );
    }
    return secret;
  })();
  private static readonly JWT_EXPIRES_IN: string | number = process.env.JWT_EXPIRES_IN || '24h';
  private static readonly SALT_ROUNDS = 12;

  /**
   * Authenticate a tenant admin user
   */
  static async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const { username, password, tenantSubdomain } = credentials;

      // Find the tenant by subdomain
      const tenant = await prisma.tenant.findFirst({
        where: {
          subdomain: tenantSubdomain,
          isActive: true,
        },
      });

      if (!tenant) {
        logger.warn(`Authentication failed: tenant not found for subdomain ${tenantSubdomain}`);
        return {
          success: false,
          error: 'Invalid credentials or organization not found',
        };
      }

      // Find the tenant admin user (check both adminUser and tenantAdmin tables)
      const tenantAdmin = await prisma.tenantAdmin.findFirst({
        where: {
          tenantId: tenant.id,
          username: username,
          isActive: true,
        },
        include: {
          tenant: true,
        },
      });

      let isAdminUser = false;
      let adminUser = null;

      // If not found in tenantAdmin, check adminUser table
      if (!tenantAdmin) {
        adminUser = await prisma.adminUser.findFirst({
          where: {
            tenantId: tenant.id,
            username: username,
            isActive: true,
          },
          include: {
            tenant: true,
          },
        });

        if (adminUser) {
          isAdminUser = true;
        }
      }

      const userRecord = tenantAdmin || adminUser;

      if (!userRecord) {
        logger.warn(`Authentication failed: user ${username} not found in tenant ${tenant.name}`);
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, userRecord.passwordHash);

      if (!isPasswordValid) {
        logger.warn(`Authentication failed: invalid password for user ${username}`);
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      // Update last login
      if (isAdminUser) {
        await prisma.adminUser.update({
          where: { id: adminUser!.id },
          data: { lastLogin: new Date() },
        });
      } else {
        await prisma.tenantAdmin.update({
          where: { id: tenantAdmin!.id },
          data: { lastLogin: new Date() },
        });
      }

      const userRole = isAdminUser ? adminUser!.role || 'admin' : 'tenant_admin';

      // Generate JWT token
      const token = this.generateToken({
        userId: userRecord.id,
        username: userRecord.username,
        email: userRecord.email,
        tenantId: tenant.id,
        tenantSubdomain: tenant.subdomain,
        role: userRole,
      });

      logger.info(`User ${username} authenticated successfully for tenant ${tenant.name}`);

      const fullName = isAdminUser
        ? `${adminUser!.firstName || ''} ${adminUser!.lastName || ''}`.trim() || adminUser!.username
        : userRecord.username;

      return {
        success: true,
        user: {
          id: userRecord.id,
          username: userRecord.username,
          email: userRecord.email,
          fullName: fullName,
          role: userRole,
          tenant: {
            id: tenant.id,
            name: tenant.name,
            subdomain: tenant.subdomain,
            planType: tenant.planType,
            settings: tenant.settings,
          },
        },
        token,
      };
    } catch (error) {
      logger.error('Authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed due to server error',
      };
    }
  }

  /**
   * Register a new tenant with admin user
   */
  static async registerTenant(data: RegisterData): Promise<AuthResult> {
    try {
      const {
        tenantName,
        subdomain,
        email,
        adminName,
        adminUsername,
        adminPassword,
        subscriptionTier,
      } = data;

      // Check if subdomain already exists
      const existingTenant = await prisma.tenant.findUnique({
        where: { subdomain },
      });

      if (existingTenant) {
        return {
          success: false,
          error: 'Subdomain already exists',
        };
      }

      // Hash the admin password
      const passwordHash = await bcrypt.hash(adminPassword, this.SALT_ROUNDS);

      // Create tenant with admin user in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create tenant
        const tenant = await tx.tenant.create({
          data: {
            name: tenantName,
            subdomain: subdomain,
            email: email,
            planType: subscriptionTier || 'starter',
            isActive: true,
          },
        });

        // Create tenant admin
        const tenantAdmin = await tx.tenantAdmin.create({
          data: {
            tenantId: tenant.id,
            username: adminUsername,
            email: email,
            passwordHash: passwordHash,
            isActive: true,
          },
        });

        // Note: Film categories are created when festivals are created
        // to maintain proper foreign key relationships

        return { tenant, tenantAdmin };
      });

      // Generate JWT token for immediate login
      const token = this.generateToken({
        userId: result.tenantAdmin.id,
        username: result.tenantAdmin.username,
        email: result.tenantAdmin.email,
        tenantId: result.tenant.id,
        tenantSubdomain: result.tenant.subdomain,
        role: 'tenant_admin',
      });

      logger.info(
        `New tenant registered: ${tenantName} (${subdomain}) with admin ${adminUsername}`
      );

      return {
        success: true,
        user: {
          id: result.tenantAdmin.id,
          username: result.tenantAdmin.username,
          email: result.tenantAdmin.email,
          fullName: adminName,
          role: 'tenant_admin',
          tenant: {
            id: result.tenant.id,
            name: result.tenant.name,
            subdomain: result.tenant.subdomain,
            planType: result.tenant.planType,
            settings: result.tenant.settings,
          },
        },
        token,
      };
    } catch (error) {
      logger.error('Tenant registration error:', error);
      return {
        success: false,
        error: 'Registration failed due to server error',
      };
    }
  }

  /**
   * Verify JWT token and extract user data
   */
  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      logger.warn('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Generate JWT token
   */
  private static generateToken(payload: any): string {
    if (!this.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    const options: jwt.SignOptions = {
      expiresIn: this.JWT_EXPIRES_IN as any,
    };
    return jwt.sign(payload, this.JWT_SECRET, options);
  }

  /**
   * Hash password
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Get user by ID with tenant information
   */
  static async getUserById(userId: number, tenantId: number) {
    try {
      // First try tenantAdmin table
      let user = await prisma.tenantAdmin.findFirst({
        where: {
          id: userId,
          tenantId: tenantId,
          isActive: true,
        },
        include: {
          tenant: true,
        },
      });

      // If not found, try adminUser table
      if (!user) {
        user = await prisma.adminUser.findFirst({
          where: {
            id: userId,
            tenantId: tenantId,
            isActive: true,
          },
          include: {
            tenant: true,
          },
        });
      }

      return user;
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      return null;
    }
  }

  /**
   * Check if subdomain is available
   */
  static async isSubdomainAvailable(subdomain: string): Promise<boolean> {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { subdomain },
      });

      return !tenant;
    } catch (error) {
      logger.error('Error checking subdomain availability:', error);
      return false;
    }
  }

  private static async findUserRecord(userId: number, tenantId: number) {
    const tenantAdmin = await prisma.tenantAdmin.findFirst({
      where: { id: userId, tenantId, isActive: true },
      include: { tenant: true },
    });
    if (tenantAdmin) return { record: tenantAdmin, isAdminUser: false };

    const adminUser = await prisma.adminUser.findFirst({
      where: { id: userId, tenantId, isActive: true },
      include: { tenant: true },
    });
    if (adminUser) return { record: adminUser, isAdminUser: true };

    return null;
  }

  static async updateProfile(
    userId: number,
    tenantId: number,
    data: { username?: string; email?: string; fullName?: string },
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const found = await this.findUserRecord(userId, tenantId);
      if (!found) return { success: false, error: 'User not found' };

      const { record, isAdminUser } = found;

      if (data.username && data.username !== record.username) {
        const taken = isAdminUser
          ? await prisma.adminUser.findFirst({ where: { tenantId, username: data.username, id: { not: userId } } })
          : await prisma.tenantAdmin.findFirst({ where: { tenantId, username: data.username, id: { not: userId } } });
        if (taken) return { success: false, error: 'Username is already taken' };
      }

      if (data.email && data.email !== record.email) {
        const taken = isAdminUser
          ? await prisma.adminUser.findFirst({ where: { tenantId, email: data.email, id: { not: userId } } })
          : await prisma.tenantAdmin.findFirst({ where: { tenantId, email: data.email, id: { not: userId } } });
        if (taken) return { success: false, error: 'Email is already in use' };
      }

      let updated;
      if (isAdminUser) {
        const nameParts = data.fullName?.trim().split(/\s+/) || [];
        updated = await prisma.adminUser.update({
          where: { id: userId },
          data: {
            ...(data.username && { username: data.username }),
            ...(data.email && { email: data.email }),
            ...(data.fullName !== undefined && {
              firstName: nameParts[0] || null,
              lastName: nameParts.slice(1).join(' ') || null,
            }),
          },
          include: { tenant: true },
        });
      } else {
        updated = await prisma.tenantAdmin.update({
          where: { id: userId },
          data: {
            ...(data.username && { username: data.username }),
            ...(data.email && { email: data.email }),
          },
          include: { tenant: true },
        });
      }

      const fullName = isAdminUser
        ? `${(updated as any).firstName || ''} ${(updated as any).lastName || ''}`.trim() || updated.username
        : data.fullName || updated.username;

      return {
        success: true,
        user: {
          id: updated.id,
          username: updated.username,
          email: updated.email,
          fullName,
          role: isAdminUser ? (updated as any).role || 'admin' : 'tenant_admin',
          tenant: {
            id: updated.tenant.id,
            name: updated.tenant.name,
            subdomain: updated.tenant.subdomain,
            planType: updated.tenant.planType,
            settings: updated.tenant.settings,
          },
        },
      };
    } catch (error) {
      logger.error('Profile update error:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  }

  static async changePassword(
    userId: number,
    tenantId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const found = await this.findUserRecord(userId, tenantId);
      if (!found) return { success: false, error: 'User not found' };

      const valid = await bcrypt.compare(currentPassword, found.record.passwordHash);
      if (!valid) return { success: false, error: 'Current password is incorrect' };

      const passwordHash = await this.hashPassword(newPassword);

      if (found.isAdminUser) {
        await prisma.adminUser.update({ where: { id: userId }, data: { passwordHash } });
      } else {
        await prisma.tenantAdmin.update({ where: { id: userId }, data: { passwordHash } });
      }

      return { success: true };
    } catch (error) {
      logger.error('Password change error:', error);
      return { success: false, error: 'Failed to change password' };
    }
  }

  static async updatePreferences(
    tenantId: number,
    preferences: Record<string, unknown>,
  ): Promise<{ success: boolean; settings?: string; error?: string }> {
    try {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) return { success: false, error: 'Tenant not found' };

      const current = JSON.parse(tenant.settings || '{}');
      delete preferences.platform_admin;
      delete preferences.access_level;

      const merged = {
        ...current,
        ...preferences,
        notifications: { ...(current.notifications || {}), ...(preferences.notifications as object || {}) },
        locale: { ...(current.locale || {}), ...(preferences.locale as object || {}) },
      };

      const updated = await prisma.tenant.update({
        where: { id: tenantId },
        data: { settings: JSON.stringify(merged) },
      });

      return { success: true, settings: updated.settings };
    } catch (error) {
      logger.error('Preferences update error:', error);
      return { success: false, error: 'Failed to update preferences' };
    }
  }
}
