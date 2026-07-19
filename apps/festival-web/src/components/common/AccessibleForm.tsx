import React from 'react';
import { InlineError } from './ErrorMessage';
import { getFormFieldAria, getAriaLabel } from '../../utils/accessibility';

interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  className?: string;
}

/**
 * Accessible form input field with proper labels and error handling
 */
export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  helpText,
  className = '',
}) => {
  const ariaProps = getFormFieldAria(id, error, helpText);
  const ariaLabel = getAriaLabel(label, required, error);

  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="text-red-600" aria-label="required">
            {' '}
            *
          </span>
        )}
      </label>
      {helpText && (
        <p id={`${id}-description`} className="mt-1 text-sm text-gray-500">
          {helpText}
        </p>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm ${
          error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        aria-label={ariaLabel}
        {...ariaProps}
      />
      {error && (
        <div id={`${id}-error`} role="alert">
          <InlineError message={error} />
        </div>
      )}
    </div>
  );
};

interface TextAreaFieldProps extends Omit<FormFieldProps, 'type'> {
  rows?: number;
}

/**
 * Accessible textarea field
 */
export const TextAreaField: React.FC<TextAreaFieldProps> = ({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  helpText,
  rows = 4,
  className = '',
}) => {
  const ariaProps = getFormFieldAria(id, error, helpText);
  const ariaLabel = getAriaLabel(label, required, error);

  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="text-red-600" aria-label="required">
            {' '}
            *
          </span>
        )}
      </label>
      {helpText && (
        <p id={`${id}-description`} className="mt-1 text-sm text-gray-500">
          {helpText}
        </p>
      )}
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm ${
          error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        aria-label={ariaLabel}
        {...ariaProps}
      />
      {error && (
        <div id={`${id}-error`} role="alert">
          <InlineError message={error} />
        </div>
      )}
    </div>
  );
};

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Accessible select field
 */
export const SelectField: React.FC<SelectFieldProps> = ({
  id,
  label,
  value,
  onChange,
  options,
  error,
  required = false,
  disabled = false,
  helpText,
  placeholder = 'Select an option',
  className = '',
}) => {
  const ariaProps = getFormFieldAria(id, error, helpText);
  const ariaLabel = getAriaLabel(label, required, error);

  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="text-red-600" aria-label="required">
            {' '}
            *
          </span>
        )}
      </label>
      {helpText && (
        <p id={`${id}-description`} className="mt-1 text-sm text-gray-500">
          {helpText}
        </p>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm ${
          error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        aria-label={ariaLabel}
        {...ariaProps}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <div id={`${id}-error`} role="alert">
          <InlineError message={error} />
        </div>
      )}
    </div>
  );
};

/**
 * Accessible checkbox field
 */
export const CheckboxField: React.FC<{
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}> = ({ id, label, checked, onChange, error, disabled = false, className = '' }) => {
  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex items-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className={`h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 ${
            disabled ? 'cursor-not-allowed opacity-50' : ''
          }`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <label htmlFor={id} className="ml-2 block text-sm text-gray-900">
          {label}
        </label>
      </div>
      {error && (
        <div id={`${id}-error`} role="alert" className="mt-1">
          <InlineError message={error} />
        </div>
      )}
    </div>
  );
};
