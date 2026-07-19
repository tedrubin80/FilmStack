import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

const COMMON_PASSWORDS = new Set([
  'password', '12345678', 'qwerty123', 'admin123',
  'letmein', 'welcome1', 'password1', 'abc12345',
]);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validates password strength. Returns null if valid, or an error message.
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 128) return 'Password must be at most 128 characters';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/\d/.test(password)) return 'Password must contain a digit';
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return 'Password is too common';
  return null;
}
