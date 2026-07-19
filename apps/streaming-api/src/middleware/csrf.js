const { doubleCsrf } = require('csrf-csrf');

/**
 * CSRF Protection Middleware
 * Using csrf-csrf library (modern replacement for deprecated csurf)
 */

const {
  generateCsrfToken,
  validateRequest: _validateRequest,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => {
    if (!process.env.CSRF_SECRET) {
      throw new Error('CSRF_SECRET environment variable is required');
    }
    return process.env.CSRF_SECRET;
  },
  getSessionIdentifier: (req) => req.ip || 'anonymous',
  cookieName: process.env.CSRF_COOKIE_NAME || '__Host-festscout.x-csrf',
  cookieOptions: {
    sameSite: 'strict',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getCsrfTokenFromRequest: (req) => {
    return req.headers['x-csrf-token'] || req.body?._csrf;
  },
});

/**
 * CSRF Protection middleware for routes
 * Apply to state-changing routes (POST, PUT, PATCH, DELETE)
 */
const csrfProtection = doubleCsrfProtection;

/**
 * Generate and send CSRF token to client
 */
const csrfTokenEndpoint = (req, res) => {
  const csrfToken = generateCsrfToken(req, res);
  res.json({
    success: true,
    csrfToken,
    message: 'CSRF token generated successfully',
  });
};

module.exports = { csrfProtection, generateCsrfToken, csrfTokenEndpoint };
