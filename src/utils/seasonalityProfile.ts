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
 * Generate seasonality profile report using live claims data
 */
export async function generateSeasonalityProfileReport(
  debug = false
): Promise<SeasonalityProfileReportWithRaw> {
  console.log(
    "🔍 CRITICAL FIX: Fetching live completed claims data from claims table"
  );

  // Query claims table directly for live data - DO NOT use monthly_performance_log
  const { data: claims, error } = await supabase
    .from("claims")
    .select("firm_name, completion_date")
    .eq("status", "COMPLETED")
    .not("completion_date", "is", null)
    .not("firm_name", "is", null)
    .order("completion_date");

  if (error) {
    throw new Error(
      `Failed to fetch live completed claims data: ${error.message}`
    );
  }

  if (!claims || claims.length === 0) {
    console.warn("⚠️ No completed claims found in claims table");
    return {
      aggregated: {},
      raw: [],
    };
  }

  console.log(`✅ Found ${claims.length} live completed claims`);

  // Build raw breakdown from live claims data
  const rawData: RawSeasonalityData[] = [];
  const yearlyData: SeasonalityProfileReport = {};

  // Group by firm, year, month
  const groupedData: { [key: string]: number } = {};

  for (const claim of claims) {
    const completionDate = new Date(claim.completion_date);
    // Use UTC methods to avoid timezone issues with date-only strings
    const year = completionDate.getUTCFullYear();
    const month = completionDate.getUTCMonth() + 1; // 1-12

    const key = `${claim.firm_name}-${year}-${month}`;
    groupedData[key] = (groupedData[key] || 0) + 1;
  }

  // Convert grouped data to raw data array
  for (const [key, count] of Object.entries(groupedData)) {
    const [firm, yearStr, monthStr] = key.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    rawData.push({
      year,
      month,
      firm,
      completed: count,
    });

    // Aggregate by year and month (SUM across all firms)
    const yearKey = year.toString();
    if (!yearlyData[yearKey]) {
      yearlyData[yearKey] = [];
    }

    let monthEntry = yearlyData[yearKey].find((m) => m.month === month);
    if (!monthEntry) {
      monthEntry = {
        month,
        monthName: MONTH_NAMES[month - 1],
        completedClaims: 0,
      };
      yearlyData[yearKey].push(monthEntry);
    }

    // SUM the claims (not AVG)
    monthEntry.completedClaims += count;
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
    console.log("🔍 SEASONALITY PROFILE DEBUG MODE - LIVE CLAIMS DATA");
    console.log("====================================================");
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

  // Mismatch detection: Check if completed claims exist but not in response
  await validateSeasonalityMismatch(rawData);

  return {
    aggregated: yearlyData,
    raw: rawData,
  };
}

/**
 * Mismatch validation: Detect if claims exist but missing from seasonality data
 */
async function validateSeasonalityMismatch(
  seasonalityData: RawSeasonalityData[]
) {
  try {
    // Get all firm-month combinations from claims table
    const { data: claimsData, error } = await supabase
      .from("claims")
      .select("firm_name, completion_date")
      .eq("status", "COMPLETED")
      .not("completion_date", "is", null)
      .not("firm_name", "is", null);

    if (error || !claimsData) {
      console.warn(
        "⚠️ Could not validate seasonality mismatch:",
        error?.message
      );
      return;
    }

    // Build set of firm-year-month combinations from claims
    const claimsCombinations = new Set<string>();
    for (const claim of claimsData) {
      const date = new Date(claim.completion_date);
      // Use UTC methods to avoid timezone issues with date-only strings
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      claimsCombinations.add(`${claim.firm_name}-${year}-${month}`);
    }

    // Build set from seasonality response
    const seasonalityCombinations = new Set<string>();
    for (const item of seasonalityData) {
      seasonalityCombinations.add(`${item.firm}-${item.year}-${item.month}`);
    }

    // Find mismatches
    for (const combination of claimsCombinations) {
      if (!seasonalityCombinations.has(combination)) {
        const [firm, year, month] = combination.split("-");
        console.warn(
          `🚨 SEASONALITY MISMATCH: Claims exist for ${firm} ${year}-${month} but missing from seasonality response`
        );
      }
    }
  } catch (err) {
    console.warn("⚠️ Error during seasonality mismatch validation:", err);
  }
}
