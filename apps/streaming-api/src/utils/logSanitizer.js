/**
 * Log Sanitizer - Redacts sensitive data from log output
 * Prevents PII and credentials from appearing in logs
 */

const SENSITIVE_KEYS = [
    'password', 'token', 'secret', 'api_key', 'apikey', 'api-key',
    'authorization', 'cookie', 'credit_card', 'creditcard', 'card_number',
    'ssn', 'social_security', 'jwt', 'refresh_token', 'access_token',
    'private_key', 'privatekey', 'passwd', 'credential'
];

const SENSITIVE_PATTERNS = [
    /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,  // Bearer tokens
    /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_.+/=]*/g,  // JWTs
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,  // Credit card numbers
    /\b\d{3}-\d{2}-\d{4}\b/g,  // SSN
];

function isSensitiveKey(key) {
    const lowerKey = String(key).toLowerCase();
    return SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive));
}

function sanitizeValue(value) {
    if (typeof value === 'string') {
        let sanitized = value;
        for (const pattern of SENSITIVE_PATTERNS) {
            sanitized = sanitized.replace(pattern, '[REDACTED]');
        }
        return sanitized;
    }
    return value;
}

function sanitizeObject(obj, depth = 0) {
    if (depth > 5 || obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return sanitizeValue(obj);
    if (Array.isArray(obj)) return obj.map(item => sanitizeObject(item, depth + 1));

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (isSensitiveKey(key)) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value, depth + 1);
        } else {
            sanitized[key] = sanitizeValue(value);
        }
    }
    return sanitized;
}

module.exports = { sanitizeObject, sanitizeValue, isSensitiveKey };
