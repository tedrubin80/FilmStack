import express from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/AuthService';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';
import { authRateLimiter } from '../middleware/rateLimiting';
import { passwordValidator } from '../utils/passwordValidator';
import type { AuthenticatedRequest } from '../middleware/auth';

export const authRouter = express.Router();

// Validation rules
const loginValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('tenantSubdomain')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Organization subdomain must be between 3 and 50 characters')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Subdomain can only contain lowercase letters, numbers, and hyphens'),
];

const registerValidation = [
  body('tenantName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Organization name must be between 2 and 100 characters'),
  body('subdomain')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Subdomain must be between 3 and 50 characters')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Subdomain can only contain lowercase letters, numbers, and hyphens')
    .custom(async (value) => {
      const isAvailable = await AuthService.isSubdomainAvailable(value);
      if (!isAvailable) {
        throw new Error('Subdomain is already taken');
      }
    }),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('adminName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Admin name must be between 2 and 100 characters'),
  body('adminUsername')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Admin username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('adminPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .custom(passwordValidator)
    .withMessage('Password does not meet security requirements'),
  body('subscriptionTier')
    .optional()
    .isIn(['starter', 'professional', 'enterprise'])
    .withMessage('Invalid subscription tier'),
];

/**
 * POST /api/auth/login
 * Authenticate a tenant admin user
 */
authRouter.post(
  '/login',
  authRateLimiter,
  loginValidation,
  async (req: any, res: any): Promise<void> => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: errors.array(),
        });
        return;
      }

      const { username, password, tenantSubdomain } = req.body;

      // Attempt authentication
      const result = await AuthService.authenticate({
        username,
        password,
        tenantSubdomain,
      });

      if (!result.success) {
        logger.warn(`Login attempt failed for ${username}@${tenantSubdomain}: ${result.error}`);
        res.status(401).json({
          error: 'Authentication Failed',
          message: result.error,
        });
        return;
      }

      logger.info(`User ${username} logged in successfully for tenant ${tenantSubdomain}`);

      res.json({
        success: true,
        message: 'Authentication successful',
        data: {
          user: result.user,
          token: result.token,
        },
      });
    } catch (error) {
      logger.error('Login endpoint error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication failed due to server error',
      });
    }
  }
);

/**
 * POST /api/auth/register
 * Register a new tenant organization with admin user
 */
authRouter.post(
  '/register',
  authRateLimiter,
  registerValidation,
  async (req: any, res: any): Promise<void> => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: errors.array(),
        });
        return;
      }

      const {
        tenantName,
        subdomain,
        email,
        adminName,
        adminUsername,
        adminPassword,
        subscriptionTier,
      } = req.body;

      // Attempt registration
      const result = await AuthService.registerTenant({
        tenantName,
        subdomain,
        email,
        adminName,
        adminUsername,
        adminPassword,
        subscriptionTier,
      });

      if (!result.success) {
        logger.warn(`Registration failed for ${tenantName} (${subdomain}): ${result.error}`);
        res.status(400).json({
          error: 'Registration Failed',
          message: result.error,
        });
        return;
      }

      logger.info(
        `New tenant registered: ${tenantName} (${subdomain}) with admin ${adminUsername}`
      );

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: result.user,
          token: result.token,
        },
      });
    } catch (error) {
      logger.error('Registration endpoint error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Registration failed due to server error',
      });
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout user - invalidates JWT by adding to blacklist in Redis
 */
authRouter.post('/logout', authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    // Blacklist the current token in Redis until it expires
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const { getRedis, isRedisAvailable } = await import('../config/redis');
        if (isRedisAvailable()) {
          const redis = getRedis()!;
          // Store blacklisted token with TTL matching JWT expiry (24h)
          await redis.set(`token_blacklist:${token}`, '1', 'EX', 86400);
        }
      } catch (redisErr) {
        logger.warn('Failed to blacklist token in Redis:', redisErr);
      }
    }

    logger.info(`User ${req.user?.username} logged out from tenant ${req.user?.tenantSubdomain}`);

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    logger.error('Logout endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Logout failed due to server error',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
authRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No user information available',
      });
      return;
    }

    // Get fresh user data from database
    const user = await AuthService.getUserById(req.user.userId, req.user.tenantId);

    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: 'firstName' in user && user.firstName
            ? `${user.firstName || ''} ${(user as { lastName?: string }).lastName || ''}`.trim() || user.username
            : user.username,
          role: req.user.role || 'tenant_admin',
          tenant: {
            id: user.tenant.id,
            name: user.tenant.name,
            subdomain: user.tenant.subdomain,
            planType: user.tenant.planType,
            settings: user.tenant.settings,
          },
        },
      },
    });
  } catch (error) {
    logger.error('Me endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user information',
    });
  }
});

/**
 * PATCH /api/auth/profile
 * Update current user profile
 */
authRouter.patch(
  '/profile',
  authenticate,
  [
    body('username').optional().trim().isLength({ min: 3, max: 50 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('fullName').optional().trim().isLength({ max: 100 }),
  ],
  async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation Error', details: errors.array() });
        return;
      }
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await AuthService.updateProfile(req.user.userId, req.user.tenantId, req.body);
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({ success: true, data: { user: result.user } });
    } catch (error) {
      logger.error('Profile update endpoint error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  },
);

/**
 * POST /api/auth/change-password
 */
authRouter.post(
  '/change-password',
  authenticate,
  authRateLimiter,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }).custom(passwordValidator),
  ],
  async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation Error', details: errors.array() });
        return;
      }
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      const result = await AuthService.changePassword(
        req.user.userId,
        req.user.tenantId,
        currentPassword,
        newPassword,
      );

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      logger.error('Change password endpoint error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  },
);

/**
 * PATCH /api/auth/preferences
 * Update notification and locale preferences (stored in tenant settings)
 */
authRouter.patch(
  '/preferences',
  authenticate,
  async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await AuthService.updatePreferences(req.user.tenantId, req.body);
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({ success: true, data: { settings: result.settings } });
    } catch (error) {
      logger.error('Preferences update endpoint error:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  },
);

/**
 * GET /api/auth/check-subdomain/:subdomain
 * Check if a subdomain is available
 */
authRouter.get('/check-subdomain/:subdomain', async (req, res): Promise<void> => {
  try {
    const { subdomain } = req.params;

    // Basic subdomain validation
    if (!/^[a-z0-9-]+$/.test(subdomain) || subdomain.length < 3 || subdomain.length > 50) {
      res.status(400).json({
        error: 'Invalid Subdomain',
        message:
          'Subdomain must be 3-50 characters and contain only lowercase letters, numbers, and hyphens',
      });
      return;
    }

    const isAvailable = await AuthService.isSubdomainAvailable(subdomain);

    res.json({
      success: true,
      data: {
        subdomain,
        available: isAvailable,
      },
    });
  } catch (error) {
    logger.error('Check subdomain endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check subdomain availability',
    });
  }
});
