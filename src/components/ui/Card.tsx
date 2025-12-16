/**
 * Reusable Card component with optional firm color accent
 * Follows TripleTen best practices: BEM naming, accessible, responsive
 */

import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  firmColor?: string;
  hover?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function Card({
  children,
  firmColor,
  hover = false,
  className = '',
  onClick,
}: CardProps) {
  // Base classes
  const baseClasses = 'bg-brand-dark-800 border border-brand-dark-700 rounded-lg p-4 shadow-card';

  // Hover classes
  const hoverClasses = hover
    ? 'transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover cursor-pointer'
    : '';

  // Firm color accent (left border)
  const firmColorStyle = firmColor ? { borderLeftWidth: '4px', borderLeftColor: firmColor } : {};

  return (
    <div
      className={`${baseClasses} ${hoverClasses} ${className}`}
      style={firmColorStyle}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {children}
    </div>
  );
}
