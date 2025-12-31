/**
 * Payout Variance Tracking
 * Compares expected payouts vs actual payments received
 * Includes historical data and projections
 */

import { supabase } from '../lib/supabase';
import { forecastPayouts, getPayPeriod, normalizeFirmName, Claim as ForecastClaim } from './payoutForecasting';

export interface WeeklyVariance {
  week_start: Date;
  week_end: Date;
  week_label: string;
  expected_payout: number;
  actual_paid: number;
  variance: number;
  variance_percentage: number;
  is_projection: boolean;
  claim_count_expected: number;
  claim_count_actual: number;
}

export interface PayoutVarianceReport {
  generated_at: string;
  period_start: Date;
  period_end: Date;
  total_weeks: number;
  historical_weeks: number;
  projection_weeks: number;
  weekly_data: WeeklyVariance[];
  summary: {
    total_expected: number;
    total_actual: number;
    total_variance: number;
    avg_weekly_expected: number;
    avg_weekly_actual: number;
    avg_weekly_variance: number;
    accuracy_percentage: number;
  };
  rolling_average: {
    period: number;
    avg_expected: number;
    avg_actual: number;
    avg_variance: number;
  };
}

interface ClaimWithPayment {
  id: string;
  firm_name: string;
  status: string;
  completion_date: string | null;
  expected_payout_date: string | null;
  actual_payout_date: string | null;
  pay_amount: number | null;
  file_total: number | null;
  appointment_start: string | null;
  payout_status: string;
}

/**
 * Helper functions
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getWeekStart(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  const weekStart = addDays(date, diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function getWeekEnd(weekStart: Date): Date {
  const weekEnd = addDays(weekStart, 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

function formatWeekLabel(weekStart: Date): string {
  const month = weekStart.toLocaleDateString('en-US', { month: 'short' });
  const day = weekStart.getDate();
  const year = weekStart.getFullYear();
  return `${month} ${day}, ${year}`;
}

function isDateInWeek(date: Date, weekStart: Date, weekEnd: Date): boolean {
  return date >= weekStart && date <= weekEnd;
}

/**
 * Fetch all claims with payout data
 */
async function fetchPayoutClaims(): Promise<ClaimWithPayment[]> {
  const { data, error } = await supabase
    .from('claims')
    .select('id, firm_name, status, completion_date, expected_payout_date, actual_payout_date, pay_amount, file_total, appointment_start, payout_status')
    .not('firm_name', 'is', null);

  if (error) {
    console.error('Error fetching payout claims:', error);
    throw error;
  }

  return data || [];
}

/**
 * Calculate weekly expected payouts from forecast
 */
function calculateWeeklyExpected(
  claims: ClaimWithPayment[],
  weekStart: Date,
  weekEnd: Date
): { amount: number; count: number } {
  let totalExpected = 0;
  let claimCount = 0;

  // Convert to forecast claim format
  const forecastClaims: ForecastClaim[] = claims
    .filter(c => c.completion_date || c.appointment_start)
    .map(c => ({
      id: c.id,
      firm_name: c.firm_name,
      completion_date: c.completion_date,
      appointment_start: c.appointment_start,
      file_total: c.file_total,
      pay_amount: c.pay_amount,
      status: c.status
    }));

  // Get payouts forecast
  const payouts = forecastPayouts(forecastClaims);

  // Filter payouts that fall within this week
  for (const payout of payouts) {
    if (isDateInWeek(payout.payoutDate, weekStart, weekEnd)) {
      totalExpected += payout.totalExpected;
      claimCount += payout.claimCount;
    }
  }

  return { amount: totalExpected, count: claimCount };
}

/**
 * Calculate weekly actual payments received
 */
function calculateWeeklyActual(
  claims: ClaimWithPayment[],
  weekStart: Date,
  weekEnd: Date
): { amount: number; count: number } {
  let totalActual = 0;
  let claimCount = 0;

  for (const claim of claims) {
    if (claim.actual_payout_date) {
      const payoutDate = new Date(claim.actual_payout_date);

      if (isDateInWeek(payoutDate, weekStart, weekEnd)) {
        const amount = claim.file_total || claim.pay_amount || 0;
        totalActual += amount;
        claimCount++;
      }
    }
  }

  return { amount: totalActual, count: claimCount };
}

/**
 * Calculate rolling average for projections
 */
function calculateRollingAverage(
  weeklyData: WeeklyVariance[],
  weeksToAverage: number = 4
): { avgExpected: number; avgActual: number; avgVariance: number } {
  // Get last N weeks of historical data (not projections)
  const historicalData = weeklyData
    .filter(w => !w.is_projection)
    .slice(-weeksToAverage);

  if (historicalData.length === 0) {
    return { avgExpected: 0, avgActual: 0, avgVariance: 0 };
  }

  const avgExpected = historicalData.reduce((sum, w) => sum + w.expected_payout, 0) / historicalData.length;
  const avgActual = historicalData.reduce((sum, w) => sum + w.actual_paid, 0) / historicalData.length;
  const avgVariance = historicalData.reduce((sum, w) => sum + w.variance, 0) / historicalData.length;

  return { avgExpected, avgActual, avgVariance };
}

/**
 * Generate complete payout variance report
 * @param historicalWeeks Number of past weeks to include (default: 12)
 * @param projectionWeeks Number of future weeks to project (default: 4)
 */
export async function generatePayoutVarianceReport(
  historicalWeeks: number = 12,
  projectionWeeks: number = 4
): Promise<PayoutVarianceReport> {
  const claims = await fetchPayoutClaims();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate week boundaries
  const currentWeekStart = getWeekStart(today);
  const periodStart = addDays(currentWeekStart, -7 * historicalWeeks);
  const periodEnd = addDays(currentWeekStart, 7 * projectionWeeks);

  const weeklyData: WeeklyVariance[] = [];

  // Generate data for each week
  for (let i = -historicalWeeks; i < projectionWeeks; i++) {
    const weekStart = addDays(currentWeekStart, i * 7);
    const weekEnd = getWeekEnd(weekStart);
    const isProjection = weekStart > today;

    let expectedPayout = 0;
    let actualPaid = 0;
    let claimCountExpected = 0;
    let claimCountActual = 0;

    if (!isProjection) {
      // Historical week - use actual data
      const expected = calculateWeeklyExpected(claims, weekStart, weekEnd);
      const actual = calculateWeeklyActual(claims, weekStart, weekEnd);

      expectedPayout = expected.amount;
      actualPaid = actual.amount;
      claimCountExpected = expected.count;
      claimCountActual = actual.count;
    } else {
      // Projection week - use rolling average from past data
      const rollingAvg = calculateRollingAverage(weeklyData, 4);
      expectedPayout = rollingAvg.avgExpected;
      actualPaid = rollingAvg.avgActual;
      claimCountExpected = 0; // Projections don't have claim counts
      claimCountActual = 0;
    }

    const variance = expectedPayout - actualPaid;
    const variancePercentage = expectedPayout > 0
      ? ((actualPaid / expectedPayout) * 100) - 100
      : 0;

    weeklyData.push({
      week_start: weekStart,
      week_end: weekEnd,
      week_label: formatWeekLabel(weekStart),
      expected_payout: Math.round(expectedPayout * 100) / 100,
      actual_paid: Math.round(actualPaid * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      variance_percentage: Math.round(variancePercentage * 10) / 10,
      is_projection: isProjection,
      claim_count_expected: claimCountExpected,
      claim_count_actual: claimCountActual
    });
  }

  // Calculate summary statistics
  const historicalOnly = weeklyData.filter(w => !w.is_projection);

  const totalExpected = historicalOnly.reduce((sum, w) => sum + w.expected_payout, 0);
  const totalActual = historicalOnly.reduce((sum, w) => sum + w.actual_paid, 0);
  const totalVariance = totalExpected - totalActual;

  const avgWeeklyExpected = historicalOnly.length > 0 ? totalExpected / historicalOnly.length : 0;
  const avgWeeklyActual = historicalOnly.length > 0 ? totalActual / historicalOnly.length : 0;
  const avgWeeklyVariance = historicalOnly.length > 0 ? totalVariance / historicalOnly.length : 0;

  const accuracyPercentage = totalExpected > 0
    ? (totalActual / totalExpected) * 100
    : 0;

  // Calculate rolling average used for projections
  const rollingAvg = calculateRollingAverage(weeklyData, 4);

  return {
    generated_at: new Date().toISOString(),
    period_start: periodStart,
    period_end: periodEnd,
    total_weeks: weeklyData.length,
    historical_weeks: historicalOnly.length,
    projection_weeks: projectionWeeks,
    weekly_data: weeklyData,
    summary: {
      total_expected: Math.round(totalExpected * 100) / 100,
      total_actual: Math.round(totalActual * 100) / 100,
      total_variance: Math.round(totalVariance * 100) / 100,
      avg_weekly_expected: Math.round(avgWeeklyExpected * 100) / 100,
      avg_weekly_actual: Math.round(avgWeeklyActual * 100) / 100,
      avg_weekly_variance: Math.round(avgWeeklyVariance * 100) / 100,
      accuracy_percentage: Math.round(accuracyPercentage * 10) / 10
    },
    rolling_average: {
      period: 4,
      avg_expected: Math.round(rollingAvg.avgExpected * 100) / 100,
      avg_actual: Math.round(rollingAvg.avgActual * 100) / 100,
      avg_variance: Math.round(rollingAvg.avgVariance * 100) / 100
    }
  };
}

/**
 * Get variance for a specific week
 */
export async function getWeekVariance(weekStart: Date): Promise<WeeklyVariance> {
  const claims = await fetchPayoutClaims();
  const weekEnd = getWeekEnd(weekStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isProjection = weekStart > today;

  const expected = calculateWeeklyExpected(claims, weekStart, weekEnd);
  const actual = calculateWeeklyActual(claims, weekStart, weekEnd);

  const expectedPayout = expected.amount;
  const actualPaid = actual.amount;
  const variance = expectedPayout - actualPaid;
  const variancePercentage = expectedPayout > 0
    ? ((actualPaid / expectedPayout) * 100) - 100
    : 0;

  return {
    week_start: weekStart,
    week_end: weekEnd,
    week_label: formatWeekLabel(weekStart),
    expected_payout: Math.round(expectedPayout * 100) / 100,
    actual_paid: Math.round(actualPaid * 100) / 100,
    variance: Math.round(variance * 100) / 100,
    variance_percentage: Math.round(variancePercentage * 10) / 10,
    is_projection: isProjection,
    claim_count_expected: expected.count,
    claim_count_actual: actual.count
  };
}
