import React, { forwardRef } from 'react';

export const Input = forwardRef(({
  label,
  helperText,
  error,
  type = 'text',
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  const baseStyles = 'block w-full rounded-md border text-body shadow-sm focus:outline-none transition-standard placeholder-gray-400 px-3 py-2';
  
  const stateStyles = error 
    ? 'border-gk-danger focus:border-gk-danger focus:ring-1 focus:ring-gk-danger text-gk-danger'
    : 'border-gk-border focus:border-gk-primary focus:ring-1 focus:ring-gk-primary text-gk-text-main';

  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && (
        <label className="block text-body font-medium text-gk-text-main mb-1.5">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={`${baseStyles} ${stateStyles} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-small text-gk-danger font-medium">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-small text-gk-text-muted">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export const Select = forwardRef(({
  label,
  helperText,
  error,
  options = [],
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  const baseStyles = 'block w-full rounded-md border text-body shadow-sm focus:outline-none transition-standard px-3 py-2 bg-white';
  
  const stateStyles = error 
    ? 'border-gk-danger focus:border-gk-danger focus:ring-1 focus:ring-gk-danger text-gk-danger'
    : 'border-gk-border focus:border-gk-primary focus:ring-1 focus:ring-gk-primary text-gk-text-main';

  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && (
        <label className="block text-body font-medium text-gk-text-main mb-1.5">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`${baseStyles} ${stateStyles} ${className}`}
        {...props}
      >
        {options.map((option, idx) => (
          <option key={idx} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1.5 text-small text-gk-danger font-medium">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-small text-gk-text-muted">{helperText}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export const Textarea = forwardRef(({
  label,
  helperText,
  error,
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  const baseStyles = 'block w-full rounded-md border text-body shadow-sm focus:outline-none transition-standard placeholder-gray-400 px-3 py-2';
  
  const stateStyles = error 
    ? 'border-gk-danger focus:border-gk-danger focus:ring-1 focus:ring-gk-danger text-gk-danger'
    : 'border-gk-border focus:border-gk-primary focus:ring-1 focus:ring-gk-primary text-gk-text-main';

  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && (
        <label className="block text-body font-medium text-gk-text-main mb-1.5">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={`${baseStyles} ${stateStyles} ${className}`}
        rows={4}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-small text-gk-danger font-medium">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-small text-gk-text-muted">{helperText}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';
