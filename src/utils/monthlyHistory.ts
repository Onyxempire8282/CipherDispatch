/**
 * Monthly Performance History Tracker
 * Automatically logs previous month's metrics when a new month is detected
 * Provides historical trend data for analytics dashboards
 */

import { supabase } from "../lib/supabase";
import { MAX_SAFE_CAPACITY } from "./monthlyPerformance";

export interface MonthlyPerformanceLogEntry {
  month: string; // YYYY-MM
  completed_claims: number;
  backlog: number;
  avg_velocity: number;
  burnout_ratio: number;
  firms_active: number;
  logged_at: string;
}

export interface MonthlyFirmActivity {
  month: string;
  firm_name: string;
  claims_completed: number;
  revenue_generated: number;
}

export interface MonthData {
  month: number; // 1-12
  monthName: string;
  claimsCompleted: number;
  revenueGenerated: number;
  avgVelocity: number;
}

export interface FirmYearlyData {
  [year: string]: MonthData[];
}

export interface FirmMonthlyData {
  [firmName: string]: FirmYearlyData;
}

export interface MonthlyHistoryReport {
  historical_performance: MonthlyPerformanceLogEntry[];
  firm_activity: MonthlyFirmActivity[];
  firm_monthly_data: FirmMonthlyData; // New grouped structure
  months_tracked: number;
  earliest_month: string | null;
  latest_month: string | null;
}

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Get previous month in YYYY-MM format
 */
function getPreviousMonth(yearMonth?: string): string {
  const base = yearMonth || getCurrentMonth();
  const [year, month] = base.split("-").map(Number);

  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, "0")}`;
}

/**
 * Calculate business days (exclude weekends) between two dates
 */
function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Get total business days in a specific month
 */
function getBusinessDaysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split("-").map(Number);
  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = new Date(year, month, 0);
  return calculateBusinessDays(firstOfMonth, lastOfMonth);
}

/**
 * Check if previous month needs to be logged
 * Returns the month that needs logging, or null if already logged
 */
export async function checkAndLogPreviousMonth(): Promise<string | null> {
  const currentMonth = getCurrentMonth();
  const previousMonth = getPreviousMonth();

  // Check if previous month already logged
  const { data: existing, error: checkError } = await supabase
    .from("monthly_performance_log")
    .select("month")
    .eq("month", previousMonth)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    console.error("Error checking monthly log:", checkError);
    return null;
  }

  // Already logged
  if (existing) {
    return null;
  }

  // Need to log previous month - calculate its metrics
  console.log(`Logging metrics for ${previousMonth}...`);

  const { data: claims, error: claimsError } = await supabase
    .from("claims")
    .select("id, status, completed_month, appointment_start, firm, pay_amount");

  if (claimsError) {
    console.error("Error fetching claims for logging:", claimsError);
    return null;
  }

  if (!claims) {
    console.log("No claims data available");
    return null;
  }

  // Calculate metrics for previous month
  const completedClaims = claims.filter(
    (c) => c.status === "COMPLETED" && c.completed_month === previousMonth
  ).length;

  const scheduledPrevMonth = claims.filter((c) => {
    if (!c.appointment_start) return false;
    const appointmentDate = new Date(c.appointment_start);
    const appointmentMonth = `${appointmentDate.getFullYear()}-${String(
      appointmentDate.getMonth() + 1
    ).padStart(2, "0")}`;
    return appointmentMonth === previousMonth && c.status !== "COMPLETED";
  });
  const backlog = scheduledPrevMonth.length;

  const businessDays = getBusinessDaysInMonth(previousMonth);
  const avgVelocity = businessDays > 0 ? completedClaims / businessDays : 0;
  const burnoutRatio = completedClaims / MAX_SAFE_CAPACITY;

  // Count unique firms that completed claims in previous month
  const firmsSet = new Set<string>();
  const firmActivity: { [firm: string]: { claims: number; revenue: number } } =
    {};

  claims.forEach((claim) => {
    if (
      claim.status === "COMPLETED" &&
      claim.completed_month === previousMonth &&
      claim.firm
    ) {
      firmsSet.add(claim.firm);

      if (!firmActivity[claim.firm]) {
        firmActivity[claim.firm] = { claims: 0, revenue: 0 };
      }
      firmActivity[claim.firm].claims += 1;
      firmActivity[claim.firm].revenue += claim.pay_amount || 0;
    }
  });

  const firmsActive = firmsSet.size;

  // Insert monthly performance log
  const { error: logError } = await supabase
    .from("monthly_performance_log")
    .insert({
      month: previousMonth,
      completed_claims: completedClaims,
      backlog: backlog,
      avg_velocity: Math.round(avgVelocity * 100) / 100,
      burnout_ratio: Math.round(burnoutRatio * 1000) / 1000,
      firms_active: firmsActive,
    });

  if (logError) {
    console.error("Error inserting monthly log:", logError);
    return null;
  }

  // Insert firm activity records
  const firmActivityRecords = Object.entries(firmActivity).map(
    ([firm, data]) => ({
      month: previousMonth,
      firm_name: firm,
      claims_completed: data.claims,
      revenue_generated: data.revenue,
    })
  );

  if (firmActivityRecords.length > 0) {
    const { error: activityError } = await supabase
      .from("monthly_firm_activity")
      .insert(firmActivityRecords);

    if (activityError) {
      console.error("Error inserting firm activity:", activityError);
    }
  }

  console.log(`Successfully logged metrics for ${previousMonth}`);
  return previousMonth;
}

/**
 * Fetch all historical monthly performance data from live claims
 */
export async function fetchMonthlyHistory(): Promise<MonthlyHistoryReport> {
  console.log(
    "🔍 CRITICAL FIX: Fetching live completed claims for monthly history"
  );

  // Get completed claims directly from claims table
  const { data: completedClaims, error: claimsError } = await supabase
    .from("claims")
    .select("firm_name, completion_date, pay_amount, file_total")
    .eq("status", "COMPLETED")
    .not("completion_date", "is", null)
    .not("firm_name", "is", null)
    .order("completion_date", { ascending: true });

  if (claimsError) {
    console.error("Error fetching completed claims:", claimsError);
    throw claimsError;
  }

  // Still fetch historical logs for backward compatibility
  const { data: perfData, error: perfError } = await supabase
    .from("monthly_performance_log")
    .select("*")
    .order("month", { ascending: true });

  if (perfError) {
    console.warn("Warning: Could not fetch performance logs:", perfError);
  }

  const historical = perfData || [];
  const claims = completedClaims || [];
  console.log(
    `✅ Found ${claims.length} completed claims for history analysis`
  );

  // Build firm activity from live claims instead of monthly_firm_activity
  const firmActivityMap: { [key: string]: MonthlyFirmActivity } = {};

  for (const claim of claims) {
    const completionDate = new Date(claim.completion_date);
    const year = completionDate.getFullYear();
    const month = completionDate.getMonth() + 1;
    const monthKey = `${year}-${month.toString().padStart(2, "0")}`;
    const activityKey = `${claim.firm_name}-${monthKey}`;

    if (!firmActivityMap[activityKey]) {
      firmActivityMap[activityKey] = {
        month: monthKey,
        firm_name: claim.firm_name,
        claims_completed: 0,
        revenue_generated: 0,
      };
    }

    firmActivityMap[activityKey].claims_completed += 1;
    firmActivityMap[activityKey].revenue_generated +=
      claim.file_total || claim.pay_amount || 0;
  }

  const firmActivity = Object.values(firmActivityMap);

  // Build grouped structure: firm → year → month
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

  const firmMonthlyData: FirmMonthlyData = {};

  firmActivity.forEach((activity) => {
    const firmName = activity.firm_name;
    const monthDate = new Date(activity.month + "-01");
    const year = monthDate.getFullYear().toString();
    const monthNumber = monthDate.getMonth() + 1; // 1-12
    const businessDays = getBusinessDaysInMonth(activity.month);

    if (!firmMonthlyData[firmName]) {
      firmMonthlyData[firmName] = {};
    }

    if (!firmMonthlyData[firmName][year]) {
      firmMonthlyData[firmName][year] = [];
    }

    // Find or create month entry
    let monthEntry = firmMonthlyData[firmName][year].find(
      (m) => m.month === monthNumber
    );
    if (!monthEntry) {
      monthEntry = {
        month: monthNumber,
        monthName: MONTH_NAMES[monthNumber - 1],
        claimsCompleted: 0,
        revenueGenerated: 0,
        avgVelocity: 0,
      };
      firmMonthlyData[firmName][year].push(monthEntry);
    }

    monthEntry.claimsCompleted = activity.claims_completed;
    monthEntry.revenueGenerated = activity.revenue_generated;
    monthEntry.avgVelocity =
      businessDays > 0 ? activity.claims_completed / businessDays : 0;
  });

  // Fill missing months with zero data and sort
  for (const firmName in firmMonthlyData) {
    for (const year in firmMonthlyData[firmName]) {
      // Ensure all 12 months are present
      for (let month = 1; month <= 12; month++) {
        const existingMonth = firmMonthlyData[firmName][year].find(
          (m) => m.month === month
        );
        if (!existingMonth) {
          firmMonthlyData[firmName][year].push({
            month,
            monthName: MONTH_NAMES[month - 1],
            claimsCompleted: 0,
            revenueGenerated: 0,
            avgVelocity: 0,
          });
        }
      }
      // Sort by month number
      firmMonthlyData[firmName][year].sort((a, b) => a.month - b.month);
    }
  }

  return {
    historical_performance: historical,
    firm_activity: firmActivity,
    firm_monthly_data: firmMonthlyData,
    months_tracked: historical.length,
    earliest_month: historical.length > 0 ? historical[0].month : null,
    latest_month:
      historical.length > 0 ? historical[historical.length - 1].month : null,
  };
}

/**
 * Generate complete monthly history report with auto-logging
 */
export async function generateMonthlyHistoryReport(): Promise<MonthlyHistoryReport> {
  // Check and log previous month if needed
  await checkAndLogPreviousMonth();

  // Fetch and return historical data
  return await fetchMonthlyHistory();
}
