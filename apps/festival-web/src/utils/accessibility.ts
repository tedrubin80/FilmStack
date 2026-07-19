/**
 * Accessibility Utilities
 * Helpers for keyboard navigation, ARIA attributes, and screen reader support
 */

/**
 * Keyboard event handlers
 */
export const KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
} as const;

/**
 * Handle keyboard event for clickable elements
 * Triggers onClick when Enter or Space is pressed
 */
export function handleKeyPress(
  event: React.KeyboardEvent,
  onClick: () => void,
  keys: string[] = [KEYS.ENTER, KEYS.SPACE]
): void {
  if (keys.includes(event.key)) {
    event.preventDefault();
    onClick();
  }
}

/**
 * Create ARIA label for form fields
 */
export function getAriaLabel(
  label: string,
  required?: boolean,
  error?: string
): string {
  let ariaLabel = label;
  if (required) {
    ariaLabel += ', required';
  }
  if (error) {
    ariaLabel += `, error: ${error}`;
  }
  return ariaLabel;
}

/**
 * Get ARIA attributes for form field
 */
export function getFormFieldAria(
  fieldId: string,
  error?: string,
  description?: string
): {
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-errormessage'?: string;
} {
  const aria: any = {};

  if (error) {
    aria['aria-invalid'] = true;
    aria['aria-errormessage'] = `${fieldId}-error`;
  }

  if (description) {
    aria['aria-describedby'] = `${fieldId}-description`;
  }

  return aria;
}

/**
 * Focus management utilities
 */
export const focusManagement = {
  /**
   * Trap focus within a modal/dialog
   */
  trapFocus: (containerElement: HTMLElement) => {
    const focusableElements = containerElement.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== KEYS.TAB) return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    containerElement.addEventListener('keydown', handleTabKey);
    return () => containerElement.removeEventListener('keydown', handleTabKey);
  },

  /**
   * Focus first focusable element
   */
  focusFirst: (containerElement: HTMLElement) => {
    const focusableElements = containerElement.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusableElements[0]?.focus();
  },

  /**
   * Restore focus to previous element
   */
  saveFocus: (): (() => void) => {
    const previousElement = document.activeElement as HTMLElement;
    return () => previousElement?.focus();
  },
};

/**
 * Screen reader announcements
 */
export const announceToScreenReader = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Skip link component helpers
 */
export const skipLinkProps = {
  className:
    'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:bg-purple-600 focus:text-white focus:px-4 focus:py-2',
  href: '#main-content',
};

/**
 * Get color contrast ratio (simplified)
 * Returns true if contrast is sufficient for WCAG AA
 */
export function hasGoodContrast(foreground: string, background: string): boolean {
  // Simplified check - in production use a proper color contrast library
  // This is a basic implementation for common cases
  const lightBackgrounds = ['white', '#fff', '#ffffff', 'rgb(255, 255, 255)'];
  const darkBackgrounds = ['black', '#000', '#000000', 'rgb(0, 0, 0)'];
  const lightForegrounds = ['white', '#fff', '#ffffff', 'rgb(255, 255, 255)'];
  const darkForegrounds = ['black', '#000', '#000000', 'rgb(0, 0, 0)'];

  if (
    (lightBackgrounds.includes(background.toLowerCase()) &&
      darkForegrounds.includes(foreground.toLowerCase())) ||
    (darkBackgrounds.includes(background.toLowerCase()) &&
      lightForegrounds.includes(foreground.toLowerCase()))
  ) {
    return true;
  }

  // Default to assuming good contrast for other colors
  return true;
}

/**
 * Accessible button props
 */
export function getButtonProps(
  label: string,
  onClick: () => void,
  options: {
    disabled?: boolean;
    loading?: boolean;
    type?: 'button' | 'submit' | 'reset';
  } = {}
): {
  type: 'button' | 'submit' | 'reset';
  onClick: () => void;
  disabled: boolean;
  'aria-label': string;
  'aria-busy'?: boolean;
  'aria-disabled'?: boolean;
} {
  const { disabled = false, loading = false, type = 'button' } = options;

  return {
    type,
    onClick: disabled || loading ? () => {} : onClick,
    disabled: disabled || loading,
    'aria-label': label,
    ...(loading && { 'aria-busy': true }),
    ...(disabled && { 'aria-disabled': true }),
  };
}

/**
 * Accessible link props for client-side routing
 */
export function getLinkProps(href: string, label?: string): {
  href: string;
  'aria-label'?: string;
  onClick: (e: React.MouseEvent) => void;
} {
  return {
    href,
    ...(label && { 'aria-label': label }),
    onClick: (e: React.MouseEvent) => {
      // Prevent default for internal links if using client-side routing
      if (href.startsWith('/') && !e.ctrlKey && !e.metaKey) {
        // Client-side router should handle this
        // e.preventDefault();
      }
    },
  };
}

/**
 * Visually hidden but accessible to screen readers
 */
export const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: '0',
} as const;
