import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  leftIcon,
  rightIcon,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-standard rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-gk-primary text-white hover:bg-gk-primaryHover focus:ring-gk-primary',
    secondary: 'bg-gk-secondary text-white hover:bg-gk-secondaryHover focus:ring-gk-secondary',
    danger: 'bg-gk-danger text-white hover:bg-red-600 focus:ring-gk-danger',
    ghost: 'bg-transparent text-gk-text-main hover:bg-gray-100 focus:ring-gray-200',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-small',
    md: 'px-4 py-2 text-body',
    lg: 'px-6 py-3 text-h3',
  };

  const currentVariantStyle = variants[variant] || variants.primary;
  const currentSizeStyle = sizes[size] || sizes.md;

  return (
    <button
      className={`${baseStyles} ${currentVariantStyle} ${currentSizeStyle} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};
