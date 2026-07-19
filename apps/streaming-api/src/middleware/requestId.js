const crypto = require('crypto');

/**
 * Request ID middleware
 * Generates a unique ID for each request for tracing and debugging.
 * If the request already contains an X-Request-ID header (e.g., from a reverse proxy),
 * that value is reused to allow end-to-end tracing.
 */
const requestIdMiddleware = (req, res, next) => {
  const existingId = req.headers['x-request-id'];
  req.id = existingId || crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
};

module.exports = requestIdMiddleware;
