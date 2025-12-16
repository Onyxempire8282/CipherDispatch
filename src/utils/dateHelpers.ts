/**
 * Date utility functions using date-fns
 * Provides consistent date formatting and manipulation across the application
 */

import {
  format,
  parseISO,
  isToday,
  isThisWeek,
  isSameDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isValid,
} from 'date-fns';

/**
 * Format a claim appointment date/time for display
 * Example: "Mon, Dec 15, 2025, 2:30 PM"
 */
export function formatAppointmentDateTime(dateString: string | undefined): string {
  if (!dateString) return 'No appointment scheduled';

  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return 'Invalid date';

    return format(date, 'EEE, MMM d, yyyy, h:mm a');
  } catch (error) {
    console.error('Error formatting appointment date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date for display (date only, no time)
 * Example: "December 15, 2025"
 */
export function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'No date';

  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return 'Invalid date';

    return format(date, 'MMMM d, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date for calendar display
 * Example: "15" for day of month
 */
export function formatDayOfMonth(date: Date): string {
  return format(date, 'd');
}

/**
 * Format month and year for calendar header
 * Example: "December 2025"
 */
export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy');
}

/**
 * Check if a date string represents today
 */
export function isAppointmentToday(dateString: string | undefined): boolean {
  if (!dateString) return false;

  try {
    const date = parseISO(dateString);
    return isValid(date) && isToday(date);
  } catch (error) {
    return false;
  }
}

/**
 * Check if a date string is in the current week
 */
export function isAppointmentThisWeek(dateString: string | undefined): boolean {
  if (!dateString) return false;

  try {
    const date = parseISO(dateString);
    return isValid(date) && isThisWeek(date, { weekStartsOn: 0 }); // Sunday start
  } catch (error) {
    return false;
  }
}

/**
 * Check if two date strings represent the same day
 */
export function isSameAppointmentDay(dateString1: string | undefined, dateString2: string | undefined): boolean {
  if (!dateString1 || !dateString2) return false;

  try {
    const date1 = parseISO(dateString1);
    const date2 = parseISO(dateString2);
    return isValid(date1) && isValid(date2) && isSameDay(date1, date2);
  } catch (error) {
    return false;
  }
}

/**
 * Get all days in a month for calendar display
 * Includes days from previous/next month to fill the grid
 */
export function getCalendarDays(currentMonth: Date): Date[] {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
}

/**
 * Navigate to next month
 */
export function getNextMonth(currentMonth: Date): Date {
  return addMonths(currentMonth, 1);
}

/**
 * Navigate to previous month
 */
export function getPreviousMonth(currentMonth: Date): Date {
  return subMonths(currentMonth, 1);
}

/**
 * Check if a date is in the current month
 */
export function isInCurrentMonth(date: Date, currentMonth: Date): boolean {
  return isSameMonth(date, currentMonth);
}

/**
 * Parse ISO date string safely
 */
export function parseDateSafely(dateString: string | undefined): Date | null {
  if (!dateString) return null;

  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

/**
 * Get relative time description
 * Example: "Today", "Tomorrow", "Next Week"
 */
export function getRelativeTimeDescription(dateString: string | undefined): string {
  if (!dateString) return 'No date';

  const date = parseDateSafely(dateString);
  if (!date) return 'Invalid date';

  if (isToday(date)) return 'Today';
  if (isThisWeek(date, { weekStartsOn: 0 })) return 'This Week';

  return formatDate(dateString);
}
