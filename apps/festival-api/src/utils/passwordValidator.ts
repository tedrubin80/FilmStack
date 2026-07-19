import zxcvbn from 'zxcvbn';

/**
 * Password Validation Utilities
 * Ensures strong, secure passwords using zxcvbn algorithm
 */

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-4 (0 = very weak, 4 = very strong)
  feedback: {
    warning?: string;
    suggestions: string[];
  };
  errors: string[];
}

/**
 * Minimum password requirements
 */
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  minScore: 3, // Require "strong" or "very strong" passwords (3 or 4 out of 4)
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false, // Optional but recommended
};

/**
 * Validate password strength and complexity
 */
export function validatePassword(
  password: string,
  userInputs: string[] = []
): PasswordValidationResult {
  const errors: string[] = [];
  const result: PasswordValidationResult = {
    isValid: true,
    score: 0,
    feedback: {
      suggestions: [],
    },
    errors: [],
  };

  // Check if password exists
  if (!password) {
    return {
      isValid: false,
      score: 0,
      feedback: { suggestions: [] },
      errors: ['Password is required'],
    };
  }

  // Check length
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  }

  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push(`Password must be less than ${PASSWORD_REQUIREMENTS.maxLength} characters`);
  }

  // Check for uppercase letters
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letters
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for numbers
  if (PASSWORD_REQUIREMENTS.requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for special characters (optional)
  if (PASSWORD_REQUIREMENTS.requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Use zxcvbn to check password strength
  const strengthResult = zxcvbn(password, userInputs);

  result.score = strengthResult.score;
  result.feedback = {
    warning: strengthResult.feedback.warning || undefined,
    suggestions: strengthResult.feedback.suggestions || [],
  };

  // Check if password meets minimum strength requirement
  if (strengthResult.score < PASSWORD_REQUIREMENTS.minScore) {
    errors.push(
      `Password is too weak (strength: ${strengthResult.score}/4). ` +
        `Minimum required: ${PASSWORD_REQUIREMENTS.minScore}/4`
    );

    if (strengthResult.feedback.warning) {
      errors.push(strengthResult.feedback.warning);
    }

    if (strengthResult.feedback.suggestions.length > 0) {
      result.feedback.suggestions = strengthResult.feedback.suggestions;
    }
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password',
    '123456',
    '12345678',
    'qwerty',
    'abc123',
    'monkey',
    '1234567',
    'letmein',
    'trustno1',
    'dragon',
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a more unique password');
  }

  result.errors = errors;
  result.isValid = errors.length === 0;

  return result;
}

/**
 * Express validator custom validator for password
 */
export const passwordValidator = (value: string, { req }: any) => {
  // Provide context for password strength check
  const userInputs = [
    req.body.username,
    req.body.email,
    req.body.tenantName,
    req.body.adminName,
    req.body.organizationName,
  ].filter(Boolean);

  const result = validatePassword(value, userInputs);

  if (!result.isValid) {
    throw new Error(result.errors.join('. '));
  }

  return true;
};

/**
 * Get password strength description
 */
export function getPasswordStrengthDescription(score: number): string {
  const descriptions = [
    'Very Weak - This password is easily guessable',
    'Weak - This password could be cracked quickly',
    'Fair - This password has some protection',
    'Strong - This is a good password',
    'Very Strong - This is an excellent password',
  ];

  return descriptions[score] || 'Unknown';
}

/**
 * Generate password strength requirements message
 */
export function getPasswordRequirementsMessage(): string {
  const requirements = [];

  requirements.push(`At least ${PASSWORD_REQUIREMENTS.minLength} characters long`);

  if (PASSWORD_REQUIREMENTS.requireUppercase) {
    requirements.push('Contains uppercase letters');
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase) {
    requirements.push('Contains lowercase letters');
  }

  if (PASSWORD_REQUIREMENTS.requireNumber) {
    requirements.push('Contains numbers');
  }

  if (PASSWORD_REQUIREMENTS.requireSpecialChar) {
    requirements.push('Contains special characters');
  }

  requirements.push(`Strength score of at least ${PASSWORD_REQUIREMENTS.minScore}/4`);

  return 'Password must meet the following requirements:\n- ' + requirements.join('\n- ');
}
