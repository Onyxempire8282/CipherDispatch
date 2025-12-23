/**
 * Payout Display Logic
 * All filtering and grouping functions for payout views
 * CRITICAL: All filters use payoutDate ONLY - never work dates
 */

import { PayoutForecast } from './payoutForecasting';

/**
 * Filter payouts that occur within a specific date range
 * Uses payoutDate ONLY - ignores work dates
 */
export function isPayoutInRange(
  payoutDate: Date,
  startDate: Date,
  endDate: Date
): boolean {
  return payoutDate >= startDate && payoutDate <= endDate;
}

/**
 * Get payouts occurring in a specific month
 * @param payouts - Array of payout forecasts
 * @param year - Year (e.g., 2025)
 * @param month - Month (0-11, where 0 is January)
 * @returns Payouts that will be paid out in the specified month
 */
export function getPayoutsForMonth(
  payouts: PayoutForecast[],
  year: number,
  month: number
): PayoutForecast[] {
  return payouts.filter(
    (payout) =>
      payout.payoutDate.getFullYear() === year &&
      payout.payoutDate.getMonth() === month
  );
}

/**
 * Get payouts occurring within a specific week
 * @param payouts - Array of payout forecasts
 * @param startDate - Start of week (typically Monday)
 * @param endDate - End of week (typically Sunday)
 * @returns Payouts that will be paid out during the week
 */
export function getPayoutsForWeek(
  payouts: PayoutForecast[],
  startDate: Date,
  endDate: Date
): PayoutForecast[] {
  return payouts.filter((payout) =>
    isPayoutInRange(payout.payoutDate, startDate, endDate)
  );
}

/**
 * Get payouts occurring in the current week
 * Uses today as reference point
 */
export function getThisWeekPayouts(payouts: PayoutForecast[]): PayoutForecast[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);

  return payouts.filter((payout) =>
    isPayoutInRange(payout.payoutDate, today, weekEnd)
  );
}

/**
 * Get payouts occurring in the next week (7-14 days from now)
 */
export function getNextWeekPayouts(payouts: PayoutForecast[]): PayoutForecast[] {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() + 7);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);

  return payouts.filter((payout) =>
    isPayoutInRange(payout.payoutDate, weekStart, weekEnd)
  );
}

/**
 * Get payouts occurring in the current month
 * Uses today's date to determine current month
 */
export function getThisMonthPayouts(payouts: PayoutForecast[]): PayoutForecast[] {
  const today = new Date();
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();

  return getPayoutsForMonth(payouts, thisYear, thisMonth);
}

/**
 * Calculate total payout amount for an array of payouts
 */
export function calculateTotalPayout(payouts: PayoutForecast[]): number {
  return payouts.reduce((sum, payout) => sum + payout.totalExpected, 0);
}

/**
 * Get summary statistics for a time period
 */
export interface PayoutSummary {
  totalAmount: number;
  payoutCount: number;
  claimCount: number;
}

export function getPayoutSummary(payouts: PayoutForecast[]): PayoutSummary {
  return {
    totalAmount: calculateTotalPayout(payouts),
    payoutCount: payouts.length,
    claimCount: payouts.reduce((sum, payout) => sum + payout.claimCount, 0)
  };
}
