/**
 * Monthly Performance Tracking
 * Tracks claims completed in current month with capacity/burnout metrics
 * Resets monthly without deleting historical data
 */

import { supabase } from "../lib/supabase";

// Configuration
export const MAX_SAFE_CAPACITY = 100; // claims per month - configurable

export interface MonthlyPerformanceReport {
  generated_at: string;
  current_month: string;
  current_year: number;
  current_month_name: string;
  monthly_completed_claims: number;
  monthly_backlog: number;
  business_days_elapsed: number;
  total_business_days_in_month: number;
  monthly_velocity: number;
  max_safe_capacity: number;
  monthly_burnout_ratio: number;
  capacity_status: "UNDER-UTILIZED" | "OPTIMAL" | "STRETCH" | "BURNOUT";
  capacity_percentage: number;
  projected_end_of_month: number;
  days_remaining: number;
  recommended_daily_rate: number;
}

interface ClaimForMonthly {
  id: string;
  status: string;
  completion_date: string | null;
  appointment_start: string | null;
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
 * Calculate business days (exclude weekends) between two dates
 */
function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Get business days elapsed in current month so far
 */
function getBusinessDaysElapsed(): number {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return calculateBusinessDays(firstOfMonth, now);
}

/**
 * Get total business days in current month
 */
function getTotalBusinessDaysInMonth(): number {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return calculateBusinessDays(firstOfMonth, lastOfMonth);
}

/**
 * Get days remaining in current month
 */
function getDaysRemainingInMonth(): number {
  const now = new Date();
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return Math.max(
    0,
    Math.ceil((lastOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );
}

/**
 * Determine capacity status based on burnout ratio
 */
function determineCapacityStatus(
  burnoutRatio: number
): "UNDER-UTILIZED" | "OPTIMAL" | "STRETCH" | "BURNOUT" {
  const percentage = burnoutRatio * 100;

  if (percentage < 60) return "UNDER-UTILIZED";
  if (percentage >= 60 && percentage < 85) return "OPTIMAL";
  if (percentage >= 85 && percentage <= 105) return "STRETCH";
  return "BURNOUT";
}

/**
 * Fetch claims for monthly analysis
 */
async function fetchClaimsForMonthly(): Promise<ClaimForMonthly[]> {
  const { data, error } = await supabase
    .from("claims")
    .select("id, status, completion_date, appointment_start");

  if (error) {
    console.error("Error fetching claims for monthly performance:", error);
    throw error;
  }

  return data || [];
}

/**
 * Generate monthly performance report
 */
export async function generateMonthlyPerformanceReport(): Promise<MonthlyPerformanceReport> {
  const claims = await fetchClaimsForMonthly();
  const currentMonth = getCurrentMonth();
  const now = new Date();
  const currentYear = now.getFullYear();
  const monthNames = [
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
  const currentMonthName = monthNames[now.getMonth()];

  // Count completed claims for current month only using completion_date
  const monthlyCompletedClaims = claims.filter((c) => {
    if (c.status !== "COMPLETED" || !c.completion_date) return false;
    const completionDate = new Date(c.completion_date);
    const completionMonth = `${completionDate.getFullYear()}-${(
      completionDate.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}`;
    return completionMonth === currentMonth;
  }).length;

  // Count backlog: claims scheduled this month but not completed
  const scheduledThisMonth = claims.filter((c) => {
    if (!c.appointment_start) return false;
    const appointmentDate = new Date(c.appointment_start);
    const appointmentMonth = `${appointmentDate.getFullYear()}-${String(
      appointmentDate.getMonth() + 1
    ).padStart(2, "0")}`;
    return appointmentMonth === currentMonth && c.status !== "COMPLETED";
  });
  const monthlyBacklog = scheduledThisMonth.length;

  // Calculate business days
  const businessDaysElapsed = getBusinessDaysElapsed();
  const totalBusinessDaysInMonth = getTotalBusinessDaysInMonth();
  const daysRemaining = getDaysRemainingInMonth();

  // Calculate velocity (claims per business day)
  const monthlyVelocity =
    businessDaysElapsed > 0 ? monthlyCompletedClaims / businessDaysElapsed : 0;

  // Calculate burnout ratio
  const monthlyBurnoutRatio = monthlyCompletedClaims / MAX_SAFE_CAPACITY;
  const capacityPercentage = monthlyBurnoutRatio * 100;

  // Determine capacity status
  const capacityStatus = determineCapacityStatus(monthlyBurnoutRatio);

  // Project end of month based on current velocity
  const businessDaysRemaining = totalBusinessDaysInMonth - businessDaysElapsed;
  const projectedEndOfMonth =
    monthlyCompletedClaims + monthlyVelocity * businessDaysRemaining;

  // Recommended daily rate to hit max capacity
  const remainingToCapacity = MAX_SAFE_CAPACITY - monthlyCompletedClaims;
  const recommendedDailyRate =
    businessDaysRemaining > 0 ? remainingToCapacity / businessDaysRemaining : 0;

  return {
    generated_at: new Date().toISOString(),
    current_month: currentMonth,
    current_year: currentYear,
    current_month_name: currentMonthName,
    monthly_completed_claims: monthlyCompletedClaims,
    monthly_backlog: monthlyBacklog,
    business_days_elapsed: businessDaysElapsed,
    total_business_days_in_month: totalBusinessDaysInMonth,
    monthly_velocity: Math.round(monthlyVelocity * 100) / 100,
    max_safe_capacity: MAX_SAFE_CAPACITY,
    monthly_burnout_ratio: Math.round(monthlyBurnoutRatio * 1000) / 1000,
    capacity_status: capacityStatus,
    capacity_percentage: Math.round(capacityPercentage * 10) / 10,
    projected_end_of_month: Math.round(projectedEndOfMonth),
    days_remaining: daysRemaining,
    recommended_daily_rate: Math.round(recommendedDailyRate * 10) / 10,
  };
}

/**
 * Get completed claims count for a specific month using completion_date
 */
export async function getMonthlyCompletedCount(
  yearMonth: string
): Promise<number> {
  const { data, error } = await supabase
    .from("claims")
    .select("completion_date")
    .eq("status", "COMPLETED")
    .not("completion_date", "is", null);

  if (error) {
    console.error("Error fetching monthly completed count:", error);
    throw error;
  }

  // Filter by month in the application since PostgreSQL date functions vary
  const targetMonth = yearMonth; // Expected format: YYYY-MM
  const filteredClaims =
    data?.filter((claim) => {
      if (!claim.completion_date) return false;
      const completionDate = new Date(claim.completion_date);
      const claimMonth = `${completionDate.getFullYear()}-${(
        completionDate.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}`;
      return claimMonth === targetMonth;
    }) || [];

  return filteredClaims.length;
}
