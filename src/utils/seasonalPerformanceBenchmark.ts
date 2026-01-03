/**
 * Seasonal Performance Benchmark Analysis
 * Compares current year performance vs historical averages by month
 * Provides performance index calculation (current_year / historical_avg)
 */

import { supabase } from "../lib/supabase";
import { getSupabaseAuthz } from "../lib/supabaseAuthz";

export interface MonthlyBenchmarkData {
  month: string;
  historical_avg: number;
  current_year: number;
  index: number;
}

export interface SeasonalPerformanceBenchmarkReport {
  data: MonthlyBenchmarkData[];
  current_year: number;
  years_included: number[];
  summary: {
    avg_index: number;
    best_month: string;
    worst_month: string;
    months_above_expected: number;
    months_below_expected: number;
  };
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Generate seasonal performance benchmark report
 */
export async function generateSeasonalPerformanceBenchmarkReport(
  debug = false
): Promise<SeasonalPerformanceBenchmarkReport> {
  console.log("🔍 Fetching seasonal performance benchmark data");

  // Get authz instance for role-based query scoping
  const authz = getSupabaseAuthz();
  if (!authz || !authz.isInitialized) {
    console.error("❌ Authorization not initialized for benchmark query");
    return {
      data: [],
      current_year: new Date().getFullYear(),
      years_included: [],
      summary: {
        avg_index: 0,
        best_month: "",
        worst_month: "",
        months_above_expected: 0,
        months_below_expected: 0,
      },
    };
  }

  try {
    const currentYear = new Date().getFullYear();

    // Query claims table for completed claims data
    let query = supabase
      .from("claims")
      .select("completion_date")
      .eq("status", "COMPLETED")
      .not("completion_date", "is", null)
      .order("completion_date");

    // Apply role-based scoping
    if (authz.role === "appraiser" && authz.userId) {
      query = query.eq("appraiser_email", authz.userId);
    }

    const { data: rawData, error } = await query;

    if (error) {
      console.error("❌ Database query error:", error);
      throw error;
    }

    if (!rawData || rawData.length === 0) {
      console.warn("⚠️ No claims data found");
      return {
        data: [],
        current_year: currentYear,
        years_included: [],
        summary: {
          avg_index: 0,
          best_month: "",
          worst_month: "",
          months_above_expected: 0,
          months_below_expected: 0,
        },
      };
    }

    // Process data by month and year
    const monthlyData: { [month: number]: { [year: number]: number } } = {};
    const yearsSet = new Set<number>();

    for (const claim of rawData) {
      const date = new Date(claim.completion_date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 1-12

      yearsSet.add(year);

      if (!monthlyData[month]) {
        monthlyData[month] = {};
      }
      if (!monthlyData[month][year]) {
        monthlyData[month][year] = 0;
      }
      monthlyData[month][year]++;
    }

    const years = Array.from(yearsSet).sort();
    const historicalYears = years.filter((y) => y < currentYear);

    if (debug) {
      console.log("Years with data:", years);
      console.log("Historical years:", historicalYears);
      console.log("Current year:", currentYear);
    }

    // If no historical data, return empty benchmark with proper structure
    if (historicalYears.length === 0) {
      console.warn("⚠️ No historical data available for benchmark analysis");
      return {
        data: MONTH_NAMES.map((month, index) => ({
          month,
          historical_avg: 0,
          current_year: monthlyData[index + 1]?.[currentYear] || 0,
          index: 0,
        })),
        current_year: currentYear,
        years_included: years,
        summary: {
          avg_index: 0,
          best_month: "",
          worst_month: "",
          months_above_expected: 0,
          months_below_expected: 0,
        },
      };
    }

    // Calculate benchmark data for each month
    const benchmarkData: MonthlyBenchmarkData[] = [];

    for (let month = 1; month <= 12; month++) {
      // Calculate historical average
      const historicalValues = historicalYears
        .map((year) => monthlyData[month]?.[year] || 0)
        .filter((val) => val > 0); // Only include years with data for this month

      const historical_avg =
        historicalValues.length > 0
          ? historicalValues.reduce((sum, val) => sum + val, 0) /
            historicalValues.length
          : 0;

      // Get current year value
      const current_year = monthlyData[month]?.[currentYear] || 0;

      // Calculate performance index
      const index = historical_avg > 0 ? current_year / historical_avg : 0;

      benchmarkData.push({
        month: MONTH_NAMES[month - 1],
        historical_avg: Number(historical_avg.toFixed(1)),
        current_year,
        index: Number(index.toFixed(2)),
      });
    }

    // Calculate summary statistics
    const validIndexes = benchmarkData
      .filter((d) => d.index > 0)
      .map((d) => d.index);
    const avg_index =
      validIndexes.length > 0
        ? Number(
            (
              validIndexes.reduce((sum, val) => sum + val, 0) /
              validIndexes.length
            ).toFixed(2)
          )
        : 0;

    const monthsAboveExpected = benchmarkData.filter(
      (d) => d.index > 1.0
    ).length;
    const monthsBelowExpected = benchmarkData.filter(
      (d) => d.index < 1.0 && d.index > 0
    ).length;

    const bestMonth = benchmarkData.reduce((best, current) =>
      current.index > best.index ? current : best
    );
    const worstMonth = benchmarkData
      .filter((d) => d.index > 0)
      .reduce(
        (worst, current) => (current.index < worst.index ? current : worst),
        { index: Infinity, month: "" }
      );

    const result = {
      data: benchmarkData,
      current_year: currentYear,
      years_included: years,
      summary: {
        avg_index,
        best_month: bestMonth.month,
        worst_month: worstMonth.month || "",
        months_above_expected: monthsAboveExpected,
        months_below_expected: monthsBelowExpected,
      },
    };

    if (debug) {
      console.log("🔍 SEASONAL PERFORMANCE BENCHMARK DEBUG");
      console.table(benchmarkData);
      console.log("Summary:", result.summary);
    }

    return result;
  } catch (error: any) {
    console.error("❌ Error in seasonal performance benchmark:", error);
    throw new Error(
      `Failed to generate seasonal performance benchmark: ${error.message}`
    );
  }
}
