/**
 * Claim filtering utilities for tab navigation in MyClaims view
 * Provides filtering logic based on date, status, and assignment
 */

import { isAppointmentToday, isAppointmentThisWeek } from './dateHelpers';

export type ClaimTab = 'unassigned' | 'today' | 'this-week' | 'in-progress';

export interface Claim {
  id: string;
  claim_number: string;
  status?: string | null;
  assigned_to?: string | null;
  appointment_start?: string;
  pay_amount?: number | null;
  file_total?: number | null;
  [key: string]: any; // Allow other properties
}

export interface TabCounts {
  unassigned: number;
  today: number;
  'this-week': number;
  'in-progress': number;
}

/**
 * Filter claims based on the selected tab
 */
export function filterClaimsByTab(claims: Claim[], tab: ClaimTab): Claim[] {
  switch (tab) {
    case 'unassigned':
      // Claims without an assigned appraiser
      return claims.filter(c => !c.assigned_to);

    case 'today':
      // Claims with appointments scheduled for today
      return claims.filter(c => isAppointmentToday(c.appointment_start));

    case 'this-week':
      // Claims with appointments this week
      return claims.filter(c => isAppointmentThisWeek(c.appointment_start));

    case 'in-progress':
      // Claims currently in progress
      return claims.filter(c => c.status === 'IN_PROGRESS');

    default:
      return claims;
  }
}

/**
 * Calculate counts for each tab
 * Useful for displaying badge counts in tab navigation
 */
export function getTabCounts(claims: Claim[]): TabCounts {
  return {
    unassigned: claims.filter(c => !c.assigned_to).length,
    today: claims.filter(c => isAppointmentToday(c.appointment_start)).length,
    'this-week': claims.filter(c => isAppointmentThisWeek(c.appointment_start)).length,
    'in-progress': claims.filter(c => c.status === 'IN_PROGRESS').length,
  };
}

/**
 * Get human-readable label for a tab
 */
export function getTabLabel(tab: ClaimTab): string {
  const labels: Record<ClaimTab, string> = {
    'unassigned': 'Unassigned',
    'today': 'Today',
    'this-week': 'This Week',
    'in-progress': 'In Progress',
  };

  return labels[tab];
}

/**
 * Get icon for a tab
 */
export function getTabIcon(tab: ClaimTab): string {
  const icons: Record<ClaimTab, string> = {
    'unassigned': '👤',
    'today': '📅',
    'this-week': '📆',
    'in-progress': '🔧',
  };

  return icons[tab];
}

/**
 * Get default tab based on claims data
 * Returns the first non-empty tab, or 'today' as default
 */
export function getDefaultTab(claims: Claim[]): ClaimTab {
  const counts = getTabCounts(claims);

  if (counts.today > 0) return 'today';
  if (counts['this-week'] > 0) return 'this-week';
  if (counts['in-progress'] > 0) return 'in-progress';
  if (counts.unassigned > 0) return 'unassigned';

  return 'today'; // Default fallback
}

/**
 * Check if a tab has any claims
 */
export function isTabEmpty(claims: Claim[], tab: ClaimTab): boolean {
  const filtered = filterClaimsByTab(claims, tab);
  return filtered.length === 0;
}

/**
 * Get color class for status badge
 */
export function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'COMPLETED':
      return 'bg-status-completed';
    case 'IN_PROGRESS':
      return 'bg-status-progress';
    case 'SCHEDULED':
      return 'bg-status-scheduled';
    case 'CANCELED':
      return 'bg-status-canceled';
    default:
      return 'bg-status-unassigned';
  }
}

/**
 * Get text color for status badge (for contrast)
 */
export function getStatusTextColor(status: string | null | undefined): string {
  // All status colors have sufficient contrast with white text
  return 'text-white';
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Unassigned';

  // Convert from SNAKE_CASE to Title Case
  return status
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}
