/**
 * Survival Runway Analysis
 * 30-day rolling cash forecast with payment delay scenarios
 * Helps predict cash flow and impact of payment delays
 */

import { supabase } from '../lib/supabase';
import { forecastPayouts, Claim as ForecastClaim } from './payoutForecasting';

export interface DailyForecast {
  date: Date;
  date_label: string;
  expected_amount: number;
  delayed_amount: number;
  cumulative_expected: number;
  cumulative_delayed: number;
  payout_count: number;
  firms_paying: string[];
}

export interface SurvivalRunwayReport {
  generated_at: string;
  forecast_start: Date;
  forecast_end: Date;
  forecast_days: number;
  expected_cash_in_30_days: number;
  delayed_scenario_cash: number;
  delayed_payment_impact: number;
  impact_percentage: number;
  daily_forecast: DailyForecast[];
  summary: {
    total_payouts_expected: number;
    avg_daily_expected: number;
    avg_daily_delayed: number;
    largest_single_day: number;
    largest_single_day_date: string;
    days_with_payouts: number;
    days_without_payouts: number;
  };
  risk_assessment: {
    impact_level: 'low' | 'moderate' | 'high' | 'critical';
    cash_flow_health: string;
    recommendations: string[];
  };
}

/**
 * Helper functions
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateLabel(date: Date): string {
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  return `${weekday}, ${month} ${day}`;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Fetch all claims for forecasting
 */
async function fetchClaimsForForecast(): Promise<ForecastClaim[]> {
  const { data, error } = await supabase
    .from('claims')
    .select('id, firm_name, status, completion_date, appointment_start, file_total, pay_amount')
    .not('firm_name', 'is', null);

  if (error) {
    console.error('Error fetching claims for forecast:', error);
    throw error;
  }

  return data || [];
}

/**
 * Determine impact level based on delay impact percentage
 */
function determineImpactLevel(impactPercentage: number): 'low' | 'moderate' | 'high' | 'critical' {
  const absImpact = Math.abs(impactPercentage);
  if (absImpact < 10) return 'low';
  if (absImpact < 25) return 'moderate';
  if (absImpact < 50) return 'high';
  return 'critical';
}

/**
 * Generate recommendations based on forecast
 */
function generateRecommendations(
  impactLevel: 'low' | 'moderate' | 'high' | 'critical',
  expectedCash: number,
  delayedCash: number,
  impactAmount: number,
  daysWithoutPayouts: number
): string[] {
  const recommendations: string[] = [];

  if (impactLevel === 'critical') {
    recommendations.push('CRITICAL: 7-day payment delay would reduce 30-day cash by 50%+ - extremely vulnerable');
    recommendations.push('Maintain emergency cash reserves to cover at least 30 days of expenses');
    recommendations.push('Immediately follow up on all overdue payments');
    recommendations.push('Consider requiring deposits or faster payment terms for new work');
  } else if (impactLevel === 'high') {
    recommendations.push('HIGH RISK: 7-day delay would significantly impact cash flow (25-50% reduction)');
    recommendations.push('Build cash buffer to handle payment delays');
    recommendations.push('Prioritize collections from firms with history of late payment');
  } else if (impactLevel === 'moderate') {
    recommendations.push('Moderate delay sensitivity (10-25% impact from 7-day delay)');
    recommendations.push('Monitor payment timing closely');
    recommendations.push('Maintain working capital cushion');
  } else {
    recommendations.push('Low sensitivity to payment delays (<10% impact)');
    recommendations.push('Cash flow relatively stable and predictable');
  }

  if (expectedCash === 0) {
    recommendations.push('WARNING: No expected payments in next 30 days - cash flow gap');
  } else if (expectedCash < 10000) {
    recommendations.push(`Low expected cash ($${expectedCash.toLocaleString()}) - may need to increase volume`);
  }

  if (daysWithoutPayouts > 20) {
    recommendations.push(`${daysWithoutPayouts} days with no expected payments - uneven cash flow distribution`);
  }

  return recommendations;
}

/**
 * Generate 30-day survival runway forecast
 * @param forecastDays Number of days to forecast (default: 30)
 * @param delayDays Number of days to delay all payments in scenario (default: 7)
 */
export async function generateSurvivalRunwayReport(
  forecastDays: number = 30,
  delayDays: number = 7
): Promise<SurvivalRunwayReport> {
  const claims = await fetchClaimsForForecast();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const forecastStart = today;
  const forecastEnd = addDays(today, forecastDays);

  // Get all payouts using existing forecast logic
  const allPayouts = forecastPayouts(claims, today);

  // Filter payouts within 30-day window
  const payoutsIn30Days = allPayouts.filter(
    p => p.payoutDate >= forecastStart && p.payoutDate < forecastEnd
  );

  // Build daily forecast
  const dailyForecasts: DailyForecast[] = [];
  let cumulativeExpected = 0;
  let cumulativeDelayed = 0;

  for (let i = 0; i < forecastDays; i++) {
    const currentDate = addDays(forecastStart, i);
    const delayedDate = addDays(forecastStart, i);

    // Find payouts expected on this day (normal scenario)
    const payoutsToday = payoutsIn30Days.filter(p => isSameDay(p.payoutDate, currentDate));
    const expectedAmount = payoutsToday.reduce((sum, p) => sum + p.totalExpected, 0);
    cumulativeExpected += expectedAmount;

    // Find payouts that would arrive today in delayed scenario
    // In delayed scenario, payments due on (currentDate - delayDays) arrive today
    const originalDate = addDays(currentDate, -delayDays);
    const delayedPayouts = payoutsIn30Days.filter(p => isSameDay(p.payoutDate, originalDate));
    const delayedAmount = delayedPayouts.reduce((sum, p) => sum + p.totalExpected, 0);
    cumulativeDelayed += delayedAmount;

    const firms = payoutsToday.map(p => p.firm);

    dailyForecasts.push({
      date: currentDate,
      date_label: formatDateLabel(currentDate),
      expected_amount: Math.round(expectedAmount * 100) / 100,
      delayed_amount: Math.round(delayedAmount * 100) / 100,
      cumulative_expected: Math.round(cumulativeExpected * 100) / 100,
      cumulative_delayed: Math.round(cumulativeDelayed * 100) / 100,
      payout_count: payoutsToday.length,
      firms_paying: firms
    });
  }

  // Calculate final metrics
  const expectedCashIn30Days = cumulativeExpected;
  const delayedScenarioCash = cumulativeDelayed;
  const delayedPaymentImpact = expectedCashIn30Days - delayedScenarioCash;
  const impactPercentage = expectedCashIn30Days > 0
    ? (delayedPaymentImpact / expectedCashIn30Days) * 100
    : 0;

  // Summary statistics
  const totalPayoutsExpected = payoutsIn30Days.length;
  const avgDailyExpected = forecastDays > 0 ? expectedCashIn30Days / forecastDays : 0;
  const avgDailyDelayed = forecastDays > 0 ? delayedScenarioCash / forecastDays : 0;

  const dailyAmounts = dailyForecasts.map(d => d.expected_amount);
  const largestSingleDay = Math.max(...dailyAmounts, 0);
  const largestDayIndex = dailyAmounts.indexOf(largestSingleDay);
  const largestSingleDayDate = largestDayIndex >= 0
    ? dailyForecasts[largestDayIndex].date_label
    : '';

  const daysWithPayouts = dailyForecasts.filter(d => d.payout_count > 0).length;
  const daysWithoutPayouts = forecastDays - daysWithPayouts;

  // Risk assessment
  const impactLevel = determineImpactLevel(impactPercentage);

  let cashFlowHealth = '';
  if (expectedCashIn30Days === 0) {
    cashFlowHealth = 'No expected payments - critical cash flow gap';
  } else if (impactLevel === 'critical') {
    cashFlowHealth = 'Extremely vulnerable to payment delays';
  } else if (impactLevel === 'high') {
    cashFlowHealth = 'Highly sensitive to payment timing';
  } else if (impactLevel === 'moderate') {
    cashFlowHealth = 'Moderately sensitive to delays';
  } else {
    cashFlowHealth = 'Stable and predictable cash flow';
  }

  const recommendations = generateRecommendations(
    impactLevel,
    expectedCashIn30Days,
    delayedScenarioCash,
    delayedPaymentImpact,
    daysWithoutPayouts
  );

  return {
    generated_at: new Date().toISOString(),
    forecast_start: forecastStart,
    forecast_end: forecastEnd,
    forecast_days: forecastDays,
    expected_cash_in_30_days: Math.round(expectedCashIn30Days * 100) / 100,
    delayed_scenario_cash: Math.round(delayedScenarioCash * 100) / 100,
    delayed_payment_impact: Math.round(delayedPaymentImpact * 100) / 100,
    impact_percentage: Math.round(impactPercentage * 10) / 10,
    daily_forecast: dailyForecasts,
    summary: {
      total_payouts_expected: totalPayoutsExpected,
      avg_daily_expected: Math.round(avgDailyExpected * 100) / 100,
      avg_daily_delayed: Math.round(avgDailyDelayed * 100) / 100,
      largest_single_day: Math.round(largestSingleDay * 100) / 100,
      largest_single_day_date: largestSingleDayDate,
      days_with_payouts: daysWithPayouts,
      days_without_payouts: daysWithoutPayouts
    },
    risk_assessment: {
      impact_level: impactLevel,
      cash_flow_health: cashFlowHealth,
      recommendations: recommendations
    }
  };
}

/**
 * Get forecast for a specific day range
 */
export async function getForecastRange(startDate: Date, endDate: Date): Promise<DailyForecast[]> {
  const claims = await fetchClaimsForForecast();
  const allPayouts = forecastPayouts(claims, startDate);

  const payoutsInRange = allPayouts.filter(
    p => p.payoutDate >= startDate && p.payoutDate < endDate
  );

  const dailyForecasts: DailyForecast[] = [];
  let currentDate = new Date(startDate);
  let cumulativeExpected = 0;
  let cumulativeDelayed = 0;

  while (currentDate < endDate) {
    const payoutsToday = payoutsInRange.filter(p => isSameDay(p.payoutDate, currentDate));
    const expectedAmount = payoutsToday.reduce((sum, p) => sum + p.totalExpected, 0);
    cumulativeExpected += expectedAmount;

    const delayedDate = addDays(currentDate, -7);
    const delayedPayouts = payoutsInRange.filter(p => isSameDay(p.payoutDate, delayedDate));
    const delayedAmount = delayedPayouts.reduce((sum, p) => sum + p.totalExpected, 0);
    cumulativeDelayed += delayedAmount;

    const firms = payoutsToday.map(p => p.firm);

    dailyForecasts.push({
      date: new Date(currentDate),
      date_label: formatDateLabel(currentDate),
      expected_amount: Math.round(expectedAmount * 100) / 100,
      delayed_amount: Math.round(delayedAmount * 100) / 100,
      cumulative_expected: Math.round(cumulativeExpected * 100) / 100,
      cumulative_delayed: Math.round(cumulativeDelayed * 100) / 100,
      payout_count: payoutsToday.length,
      firms_paying: firms
    });

    currentDate = addDays(currentDate, 1);
  }

  return dailyForecasts;
}
