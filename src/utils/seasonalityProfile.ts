/**
 * Seasonality Profile Analysis
 * Analyzes seasonal patterns in business activity across months and years
 */

import { supabase } from "../lib/supabase";

export interface MonthlyData {
  month: number;
  monthName: string;
  completedClaims: number;
}

export interface SeasonalityProfileReport {
  [year: string]: MonthlyData[];
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

  // Group by year then by month number
  const yearlyData: SeasonalityProfileReport = {};
  const availableYears: string[] = [];

  for (const log of monthlyLogs) {
    const monthDate = new Date(log.month + "-01");
    const year = monthDate.getFullYear().toString();
    const monthNumber = monthDate.getMonth() + 1; // 1-12

    if (!yearlyData[year]) {
      yearlyData[year] = [];
      availableYears.push(year);
    }

    // Find or create entry for this month
    let monthEntry = yearlyData[year].find((m) => m.month === monthNumber);
    if (!monthEntry) {
      monthEntry = {
        month: monthNumber,
        monthName: MONTH_NAMES[monthNumber - 1],
        completedClaims: 0,
      };
      yearlyData[year].push(monthEntry);
    }

    monthEntry.completedClaims = log.completed_claims || 0;
  }

  // Sort months within each year and ensure all 12 months are present
  for (const year in yearlyData) {
    // Fill missing months with 0 data
    for (let month = 1; month <= 12; month++) {
      const existingMonth = yearlyData[year].find((m) => m.month === month);
      if (!existingMonth) {
        yearlyData[year].push({
          month,
          monthName: MONTH_NAMES[month - 1],
          completedClaims: 0,
        });
      }
    }

    // Sort by month number
    yearlyData[year].sort((a, b) => a.month - b.month);
  }

  availableYears.sort();

  // Calculate overall statistics for backward compatibility
  const allClaims: number[] = [];
  const monthlyTotals: { [month: number]: number[] } = {};

  for (const year in yearlyData) {
    for (const monthData of yearlyData[year]) {
      if (monthData.completedClaims > 0) {
        allClaims.push(monthData.completedClaims);

        if (!monthlyTotals[monthData.month]) {
          monthlyTotals[monthData.month] = [];
        }
        monthlyTotals[monthData.month].push(monthData.completedClaims);
      }
    }
  }

  const overallAvg =
    allClaims.length > 0
      ? allClaims.reduce((sum, val) => sum + val, 0) / allClaims.length
      : 0;

  // Calculate average by month for peak/low detection
  const monthAverages: {
    month: number;
    monthName: string;
    avgClaims: number;
  }[] = [];
  for (let month = 1; month <= 12; month++) {
    const claims = monthlyTotals[month] || [];
    const avgClaims =
      claims.length > 0
        ? claims.reduce((sum, val) => sum + val, 0) / claims.length
        : 0;

    monthAverages.push({
      month,
      monthName: MONTH_NAMES[month - 1],
      avgClaims,
    });
  }

  const monthsWithData = monthAverages.filter((m) => m.avgClaims > 0);
  const peakMonth =
    monthsWithData.length > 0
      ? monthsWithData.reduce((max, current) =>
          current.avgClaims > max.avgClaims ? current : max
        )
      : { month: 1, monthName: MONTH_NAMES[0], avgClaims: 0 };

  const lowMonth =
    monthsWithData.length > 0
      ? monthsWithData.reduce((min, current) =>
          current.avgClaims < min.avgClaims ? current : min
        )
      : { month: 1, monthName: MONTH_NAMES[0], avgClaims: 0 };

  // Calculate seasonal variance
  const validAverages = monthsWithData.map((m) => m.avgClaims);
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

  // Return simplified direct year-to-data mapping format
  return yearlyData;
}
