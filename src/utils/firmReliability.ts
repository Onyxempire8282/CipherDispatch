/**
 * Firm Reliability Metrics
 * Calculates payment reliability metrics for each firm to track:
 * - Average days late
 * - On-time payment percentage
 * - Outstanding balance aging buckets
 */

import { supabase } from '../lib/supabase';
import { normalizeFirmName } from './payoutForecasting';

export interface ClaimPayment {
  id: string;
  firm_name: string;
  expected_payout_date: string | null;
  actual_payout_date: string | null;
  payout_status: 'unpaid' | 'paid' | 'overdue' | 'not_applicable';
  pay_amount: number | null;
  file_total: number | null;
  completion_date: string | null;
  status: string;
}

export interface OutstandingBalanceAging {
  '0-7_days': { count: number; amount: number };
  '8-14_days': { count: number; amount: number };
  '15-30_days': { count: number; amount: number };
  '30plus_days': { count: number; amount: number };
}

export interface FirmReliabilityMetrics {
  firm_name: string;
  total_paid_claims: number;
  total_unpaid_claims: number;
  avg_days_late: number;
  on_time_percentage: number;
  total_outstanding_balance: number;
  outstanding_aging: OutstandingBalanceAging;
  median_days_late: number;
  worst_delay_days: number;
  best_turnaround_days: number;
}

export interface FirmReliabilityReport {
  generated_at: string;
  total_firms: number;
  metrics_by_firm: FirmReliabilityMetrics[];
  overall_summary: {
    total_claims_tracked: number;
    total_paid_claims: number;
    total_unpaid_claims: number;
    total_outstanding_balance: number;
    overall_avg_days_late: number;
    overall_on_time_percentage: number;
  };
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.floor((utc2 - utc1) / msPerDay);
}

/**
 * Calculate how many days late a payment is
 * Positive = late, Negative = early, 0 = on time
 */
function calculateDaysLate(expectedDate: string, actualDate: string): number {
  const expected = new Date(expectedDate);
  const actual = new Date(actualDate);
  return daysBetween(expected, actual);
}

/**
 * Calculate how many days overdue an unpaid claim is
 */
function calculateDaysOverdue(expectedDate: string): number {
  const expected = new Date(expectedDate);
  const today = new Date();
  return daysBetween(expected, today);
}

/**
 * Calculate firm-specific reliability metrics
 */
function calculateFirmMetrics(
  firmName: string,
  claims: ClaimPayment[]
): FirmReliabilityMetrics {
  const paidClaims = claims.filter(c => c.payout_status === 'paid' && c.actual_payout_date && c.expected_payout_date);
  const unpaidClaims = claims.filter(c => (c.payout_status === 'unpaid' || c.payout_status === 'overdue') && c.expected_payout_date);

  // Calculate days late for paid claims
  const daysLateArray: number[] = paidClaims.map(claim =>
    calculateDaysLate(claim.expected_payout_date!, claim.actual_payout_date!)
  );

  // Average days late
  const avgDaysLate = daysLateArray.length > 0
    ? daysLateArray.reduce((sum, days) => sum + days, 0) / daysLateArray.length
    : 0;

  // Median days late
  const sortedDaysLate = [...daysLateArray].sort((a, b) => a - b);
  const medianDaysLate = sortedDaysLate.length > 0
    ? sortedDaysLate[Math.floor(sortedDaysLate.length / 2)]
    : 0;

  // On-time percentage (on or before expected date)
  const onTimeClaims = daysLateArray.filter(days => days <= 0).length;
  const onTimePercentage = paidClaims.length > 0
    ? (onTimeClaims / paidClaims.length) * 100
    : 0;

  // Best and worst performance
  const worstDelayDays = daysLateArray.length > 0 ? Math.max(...daysLateArray) : 0;
  const bestTurnaroundDays = daysLateArray.length > 0 ? Math.min(...daysLateArray) : 0;

  // Outstanding balance aging buckets
  const aging: OutstandingBalanceAging = {
    '0-7_days': { count: 0, amount: 0 },
    '8-14_days': { count: 0, amount: 0 },
    '15-30_days': { count: 0, amount: 0 },
    '30plus_days': { count: 0, amount: 0 },
  };

  let totalOutstanding = 0;

  unpaidClaims.forEach(claim => {
    const daysOverdue = calculateDaysOverdue(claim.expected_payout_date!);
    const amount = claim.file_total || claim.pay_amount || 0;
    totalOutstanding += amount;

    if (daysOverdue <= 7 && daysOverdue >= 0) {
      aging['0-7_days'].count++;
      aging['0-7_days'].amount += amount;
    } else if (daysOverdue <= 14) {
      aging['8-14_days'].count++;
      aging['8-14_days'].amount += amount;
    } else if (daysOverdue <= 30) {
      aging['15-30_days'].count++;
      aging['15-30_days'].amount += amount;
    } else {
      aging['30plus_days'].count++;
      aging['30plus_days'].amount += amount;
    }
  });

  return {
    firm_name: firmName,
    total_paid_claims: paidClaims.length,
    total_unpaid_claims: unpaidClaims.length,
    avg_days_late: Math.round(avgDaysLate * 10) / 10, // Round to 1 decimal
    on_time_percentage: Math.round(onTimePercentage * 10) / 10,
    total_outstanding_balance: Math.round(totalOutstanding * 100) / 100,
    outstanding_aging: aging,
    median_days_late: medianDaysLate,
    worst_delay_days: worstDelayDays,
    best_turnaround_days: bestTurnaroundDays,
  };
}

/**
 * Fetch all claims with payout tracking data
 */
export async function fetchPaymentClaims(): Promise<ClaimPayment[]> {
  const { data, error } = await supabase
    .from('claims')
    .select('id, firm_name, expected_payout_date, actual_payout_date, payout_status, pay_amount, file_total, completion_date, status')
    .not('firm_name', 'is', null); // Only claims with a firm

  if (error) {
    console.error('Error fetching payment claims:', error);
    throw error;
  }

  return data || [];
}

/**
 * Generate complete firm reliability report
 */
export async function generateFirmReliabilityReport(): Promise<FirmReliabilityReport> {
  const claims = await fetchPaymentClaims();

  // Group claims by firm
  const claimsByFirm = new Map<string, ClaimPayment[]>();

  claims.forEach(claim => {
    const normalizedFirm = normalizeFirmName(claim.firm_name);
    if (!claimsByFirm.has(normalizedFirm)) {
      claimsByFirm.set(normalizedFirm, []);
    }
    claimsByFirm.get(normalizedFirm)!.push(claim);
  });

  // Calculate metrics for each firm
  const metricsByFirm: FirmReliabilityMetrics[] = [];

  for (const [firmName, firmClaims] of claimsByFirm.entries()) {
    const metrics = calculateFirmMetrics(firmName, firmClaims);
    metricsByFirm.push(metrics);
  }

  // Sort by firm name
  metricsByFirm.sort((a, b) => a.firm_name.localeCompare(b.firm_name));

  // Calculate overall summary
  const totalClaimsTracked = claims.filter(c => c.expected_payout_date).length;
  const totalPaidClaims = metricsByFirm.reduce((sum, m) => sum + m.total_paid_claims, 0);
  const totalUnpaidClaims = metricsByFirm.reduce((sum, m) => sum + m.total_unpaid_claims, 0);
  const totalOutstandingBalance = metricsByFirm.reduce((sum, m) => sum + m.total_outstanding_balance, 0);

  // Weighted average days late (weighted by number of paid claims)
  const totalWeightedDaysLate = metricsByFirm.reduce(
    (sum, m) => sum + (m.avg_days_late * m.total_paid_claims),
    0
  );
  const overallAvgDaysLate = totalPaidClaims > 0
    ? totalWeightedDaysLate / totalPaidClaims
    : 0;

  // Weighted on-time percentage
  const totalOnTimeClaims = metricsByFirm.reduce(
    (sum, m) => sum + (m.total_paid_claims * (m.on_time_percentage / 100)),
    0
  );
  const overallOnTimePercentage = totalPaidClaims > 0
    ? (totalOnTimeClaims / totalPaidClaims) * 100
    : 0;

  return {
    generated_at: new Date().toISOString(),
    total_firms: metricsByFirm.length,
    metrics_by_firm: metricsByFirm,
    overall_summary: {
      total_claims_tracked: totalClaimsTracked,
      total_paid_claims: totalPaidClaims,
      total_unpaid_claims: totalUnpaidClaims,
      total_outstanding_balance: Math.round(totalOutstandingBalance * 100) / 100,
      overall_avg_days_late: Math.round(overallAvgDaysLate * 10) / 10,
      overall_on_time_percentage: Math.round(overallOnTimePercentage * 10) / 10,
    },
  };
}

/**
 * Get metrics for a specific firm
 */
export async function getFirmMetrics(firmName: string): Promise<FirmReliabilityMetrics | null> {
  const claims = await fetchPaymentClaims();
  const normalizedFirmName = normalizeFirmName(firmName);

  const firmClaims = claims.filter(c => normalizeFirmName(c.firm_name) === normalizedFirmName);

  if (firmClaims.length === 0) {
    return null;
  }

  return calculateFirmMetrics(normalizedFirmName, firmClaims);
}
