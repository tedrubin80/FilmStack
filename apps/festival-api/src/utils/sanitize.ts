import path from 'path';
import crypto from 'crypto';
import sanitizeHtmlLib from 'sanitize-html';

/**
 * Sanitization utilities to prevent security vulnerabilities
 */

/**
 * Sanitize filename to prevent path traversal attacks
 * Removes dangerous characters and ensures safe filename
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) {
    return 'unnamed-file';
  }

  // Get basename to prevent path traversal (../../../etc/passwd)
  const basename = path.basename(filename);

  // Remove null bytes and other dangerous characters
  const cleaned = basename
    .replace(/\0/g, '') // Null bytes
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Windows forbidden chars
    .replace(/^\.+/, '_') // No leading dots (hidden files)
    .replace(/\.+$/, '') // No trailing dots
    .trim();

  // Limit length to 255 characters (filesystem limit)
  const maxLength = 255;
  if (cleaned.length > maxLength) {
    const ext = path.extname(cleaned);
    const name = path.basename(cleaned, ext);
    return name.substring(0, maxLength - ext.length) + ext;
  }

  return cleaned || 'unnamed-file';
}

/**
 * Generate a safe, unique filename
 */
export function generateSafeFilename(originalName: string, prefix = ''): string {
  const sanitized = sanitizeFilename(originalName);
  const ext = path.extname(sanitized);
  const nameWithoutExt = path.basename(sanitized, ext);

  // Add timestamp and random hash for uniqueness
  const timestamp = Date.now();
  const randomHash = crypto.randomBytes(8).toString('hex');

  const safeName = [
    prefix,
    nameWithoutExt.substring(0, 50), // Limit base name length
    timestamp,
    randomHash,
  ]
    .filter(Boolean)
    .join('-');

  return `${safeName}${ext}`.toLowerCase();
}

/**
 * Validate file extension against whitelist
 */
export function isAllowedFileType(filename: string, allowedExtensions: string[]): boolean {
  const ext = path.extname(filename).toLowerCase();
  return allowedExtensions.includes(ext);
}

/**
 * Sanitize HTML content for email templates
 * Allows safe HTML tags while removing dangerous ones
 */
export function sanitizeEmailHtml(html: string): string {
  if (!html) {
    return '';
  }

  return sanitizeHtmlLib(html, {
    allowedTags: [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'br',
      'hr',
      'div',
      'span',
      'a',
      'img',
      'ul',
      'ol',
      'li',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'strong',
      'b',
      'em',
      'i',
      'u',
      'blockquote',
      'pre',
      'code',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'style'],
      div: ['class', 'style'],
      span: ['class', 'style'],
      p: ['class', 'style'],
      table: ['class', 'style', 'cellpadding', 'cellspacing', 'border'],
      td: ['class', 'style', 'colspan', 'rowspan'],
      th: ['class', 'style', 'colspan', 'rowspan'],
    },
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-fA-F]{3,6}$/, /^rgb/, /^rgba/],
        'background-color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb/, /^rgba/],
        'font-size': [/^\d+(?:px|em|rem|%)$/],
        'font-weight': [/^(?:normal|bold|bolder|lighter|\d{3})$/],
        'text-align': [/^(?:left|right|center|justify)$/],
        padding: [/^\d+(?:px|em|rem|%)$/],
        margin: [/^\d+(?:px|em|rem|%)$/],
        width: [/^\d+(?:px|em|rem|%)$/],
        height: [/^\d+(?:px|em|rem|%)$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
    },
    transformTags: {
      a: (_tagName, attribs) => {
        return {
          tagName: 'a',
          attribs: {
            ...attribs,
            rel: 'noopener noreferrer',
            target: '_blank',
          },
        };
      },
    },
  });
}

/**
 * Sanitize HTML content to prevent XSS attacks (strict mode)
 */
export function sanitizeHtml(html: string): string {
  if (!html) {
    return '';
  }

  return sanitizeHtmlLib(html, {
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
    allowedAttributes: {},
  });
}

/**
 * Sanitize text input to prevent XSS
 */
export function sanitizeText(text: string): string {
  if (!text) {
    return '';
  }

  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize object for logging (remove sensitive data)
 */
export function sanitizeForLogging(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = [
    'password',
    'passwordHash',
    'token',
    'apiKey',
    'secret',
    'creditCard',
    'ssn',
    'authorization',
    'cookie',
  ];

  const sanitized: any = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email) {
    return '';
  }

  // Basic email sanitization
  return email.trim().toLowerCase().replace(/[<>]/g, ''); // Remove angle brackets
}

/**
 * Sanitize URL to prevent injection
 */
export function sanitizeUrl(url: string): string {
  if (!url) {
    return '';
  }

  // Only allow http, https, and mailto protocols
  const allowedProtocols = ['http:', 'https:', 'mailto:'];

  try {
    const parsed = new URL(url);
    if (!allowedProtocols.includes(parsed.protocol)) {
      return '';
    }
    return url;
  } catch {
    return '';
  }
}

/**
 * Sanitize path to prevent directory traversal
 */
export function sanitizePath(filePath: string, baseDir: string): string {
  // Resolve the path and ensure it's within baseDir
  const resolved = path.resolve(baseDir, filePath);
  const normalizedBase = path.resolve(baseDir);

  if (!resolved.startsWith(normalizedBase)) {
    throw new Error('Path traversal attempt detected');
  }

  return resolved;
}
