/**
 * Reusable Badge component for status, firm, and other labels
 * Follows TripleTen best practices: WCAG contrast, accessible
 */

import React from 'react';
import { getStatusColor, getStatusTextColor, getStatusLabel } from '../../utils/claimFilters';

export type BadgeVariant = 'status' | 'firm' | 'note' | 'info';

export interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  color?: string;
  status?: string | null;
  className?: string;
}

export default function Badge({
  variant,
  label,
  color,
  status,
  className = '',
}: BadgeProps) {
  // Base classes
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

  // Variant-specific styling
  let variantClasses = '';
  let displayLabel = label || '';
  let badgeColor = color;

  switch (variant) {
    case 'status':
      // Use status color mapping
      const statusColorClass = getStatusColor(status);
      const statusTextClass = getStatusTextColor(status);
      variantClasses = `${statusColorClass} ${statusTextClass}`;
      displayLabel = label || getStatusLabel(status);
      break;

    case 'firm':
      // Custom color badge for firm
      variantClasses = 'text-white';
      badgeColor = color || '#9CA3AF'; // Default gray
      break;

    case 'note':
      // Note indicator badge
      variantClasses = 'bg-yellow-600 text-white';
      displayLabel = label || '📝 Notes';
      break;

    case 'info':
      // Informational badge
      variantClasses = 'bg-blue-600 text-white';
      break;
  }

  const style = badgeColor && variant === 'firm' ? { backgroundColor: badgeColor } : {};

  return (
    <span
      className={`${baseClasses} ${variantClasses} ${className}`}
      style={style}
      role="status"
      aria-label={`${variant}: ${displayLabel}`}
    >
      {displayLabel}
    </span>
  );
}
