/**
 * Reusable Button component with variants and accessibility
 * Follows TripleTen best practices: BEM naming, WCAG compliance, mobile-first design
 */

import React from 'react';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  ariaLabel?: string;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  type = 'button',
  className = '',
  ariaLabel,
}: ButtonProps) {
  // Base classes for all buttons
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-dark-900 disabled:opacity-50 disabled:cursor-not-allowed';

  // Variant classes
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-sm hover:shadow-md',
    secondary: 'bg-brand-dark-700 hover:bg-brand-dark-600 text-brand-light-100 border border-brand-dark-600 focus:ring-brand-dark-600',
    danger: 'bg-status-canceled hover:bg-red-600 text-white focus:ring-red-500 shadow-sm hover:shadow-md',
    success: 'bg-status-completed hover:bg-green-600 text-white focus:ring-green-500 shadow-sm hover:shadow-md',
    ghost: 'bg-transparent hover:bg-brand-dark-700 text-brand-light-100 border border-transparent hover:border-brand-dark-600 focus:ring-brand-dark-600',
  };

  // Size classes (mobile-first)
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
