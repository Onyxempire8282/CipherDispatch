/**
 * Seasonality Profile Analysis
 * Analyzes seasonal patterns in business activity across months and years
 * Uses SUM aggregation grouped by year, month, firm
 */

import { supabase } from "../lib/supabase";

export interface RawSeasonalityData {
  year: number;
  month: number;
  firm: string;
  completed: number;
}

export interface MonthlyData {
  month: number;
  monthName: string;
  completedClaims: number;
}

export interface SeasonalityProfileReport {
  [year: string]: MonthlyData[];
}

export interface SeasonalityProfileReportWithRaw {
  aggregated: SeasonalityProfileReport;
  raw: RawSeasonalityData[];
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
 * Generate seasonality profile report using SUM aggregation
 */
export async function generateSeasonalityProfileReport(debug = false): Promise<SeasonalityProfileReportWithRaw> {
  // Query monthly_firm_activity to get raw firm-level data
  const { data: firmActivity, error } = await supabase
    .from("monthly_firm_activity")
    .select("month, firm_name, claims_completed")
    .order("month");

  if (error) {
    throw new Error(
      `Failed to fetch firm activity data: ${error.message}`
    );
  }

  if (!firmActivity || firmActivity.length === 0) {
    throw new Error("No firm activity data found");
  }

  // Build raw breakdown
  const rawData: RawSeasonalityData[] = [];
  const yearlyData: SeasonalityProfileReport = {};

  for (const activity of firmActivity) {
    const monthDate = new Date(activity.month + "-01");
    const year = monthDate.getFullYear();
    const monthNumber = monthDate.getMonth() + 1; // 1-12

    // Add to raw breakdown
    rawData.push({
      year,
      month: monthNumber,
      firm: activity.firm_name,
      completed: activity.claims_completed || 0,
    });

    // Aggregate by year and month (SUM across all firms)
    const yearKey = year.toString();
    if (!yearlyData[yearKey]) {
      yearlyData[yearKey] = [];
    }

    let monthEntry = yearlyData[yearKey].find((m) => m.month === monthNumber);
    if (!monthEntry) {
      monthEntry = {
        month: monthNumber,
        monthName: MONTH_NAMES[monthNumber - 1],
        completedClaims: 0,
      };
      yearlyData[yearKey].push(monthEntry);
    }

    // SUM the claims (not AVG)
    monthEntry.completedClaims += activity.claims_completed || 0;
  }

  // Fill missing months with zeros and sort
  for (const year in yearlyData) {
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
    yearlyData[year].sort((a, b) => a.month - b.month);
  }

  // Debug mode: Print console table in browser
  if (debug) {
    console.log("🔍 SEASONALITY PROFILE DEBUG MODE");
    console.log("=================================");
    console.table(
      rawData.map((d) => ({
        Year: d.year,
        Month: d.month,
        Firm: d.firm,
        Completed: d.completed,
      }))
    );
    console.log("\n📊 Aggregated Totals by Year-Month:");
    const aggregatedTable = [];
    for (const year in yearlyData) {
      for (const monthData of yearlyData[year]) {
        aggregatedTable.push({
          Year: year,
          Month: monthData.month,
          MonthName: monthData.monthName,
          TotalCompleted: monthData.completedClaims,
        });
      }
    }
    console.table(aggregatedTable);
  }

  return {
    aggregated: yearlyData,
    raw: rawData,
  };
}
