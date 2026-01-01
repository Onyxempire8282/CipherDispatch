/**
 * Seasonality Profile Analysis
 * Analyzes seasonal patterns in business activity across months
 */

import { supabase } from "../lib/supabase";

export interface SeasonalityData {
  month: number;
  monthName: string;
  avgCompletedClaims: number;
  dataPoints: number;
}

export interface SeasonalityProfileReport {
  seasonal_data: SeasonalityData[];
  peak_month: {
    month: number;
    monthName: string;
    avgClaims: number;
  };
  low_month: {
    month: number;
    monthName: string;
    avgClaims: number;
  };
  overall_avg: number;
  seasonal_variance: number;
  status: string;
  timestamp: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Generate seasonality profile report
 */
export async function generateSeasonalityProfileReport(): Promise<SeasonalityProfileReport> {
  const { data: monthlyLogs, error } = await supabase
    .from("monthly_performance_log")
    .select("month, completed_claims")
    .order("month");

  if (error) {
    throw new Error(
      `Failed to fetch monthly performance data: ${error.message}`
    );
  }

  if (!monthlyLogs || monthlyLogs.length === 0) {
    throw new Error("No monthly performance data found");
  }

  // Group by month number (1-12) and calculate averages
  const monthlyGroups: { [key: number]: number[] } = {};

  for (const log of monthlyLogs) {
    const monthDate = new Date(log.month + "-01");
    const monthNumber = monthDate.getMonth() + 1; // 1-12

    if (!monthlyGroups[monthNumber]) {
      monthlyGroups[monthNumber] = [];
    }

    monthlyGroups[monthNumber].push(log.completed_claims || 0);
  }

  // Calculate seasonal data
  const seasonalData: SeasonalityData[] = [];
  let totalAvg = 0;
  let dataPointCount = 0;

  for (let month = 1; month <= 12; month++) {
    const claims = monthlyGroups[month] || [];
    const avgClaims =
      claims.length > 0
        ? claims.reduce((sum, val) => sum + val, 0) / claims.length
        : 0;

    seasonalData.push({
      month,
      monthName: MONTH_NAMES[month - 1],
      avgCompletedClaims: Math.round(avgClaims * 10) / 10,
      dataPoints: claims.length,
    });

    if (claims.length > 0) {
      totalAvg += avgClaims;
      dataPointCount++;
    }
  }

  const overallAvg = dataPointCount > 0 ? totalAvg / dataPointCount : 0;

  // Find peak and low months (only from months with data)
  const monthsWithData = seasonalData.filter((m) => m.dataPoints > 0);

  const peakMonth = monthsWithData.reduce((max, current) =>
    current.avgCompletedClaims > max.avgCompletedClaims ? current : max
  );

  const lowMonth = monthsWithData.reduce((min, current) =>
    current.avgCompletedClaims < min.avgCompletedClaims ? current : min
  );

  // Calculate seasonal variance (coefficient of variation)
  const validAverages = monthsWithData.map((m) => m.avgCompletedClaims);
  const variance =
    validAverages.length > 1
      ? Math.sqrt(
          validAverages.reduce(
            (sum, val) => sum + Math.pow(val - overallAvg, 2),
            0
          ) / validAverages.length
        )
      : 0;

  const seasonalVariance = overallAvg > 0 ? (variance / overallAvg) * 100 : 0;

  return {
    seasonal_data: seasonalData,
    peak_month: {
      month: peakMonth.month,
      monthName: peakMonth.monthName,
      avgClaims: peakMonth.avgCompletedClaims,
    },
    low_month: {
      month: lowMonth.month,
      monthName: lowMonth.monthName,
      avgClaims: lowMonth.avgCompletedClaims,
    },
    overall_avg: Math.round(overallAvg * 10) / 10,
    seasonal_variance: Math.round(seasonalVariance * 10) / 10,
    status: "success",
    timestamp: new Date().toISOString(),
  };
}
