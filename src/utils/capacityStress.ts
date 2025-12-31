/**
 * Capacity Stress / Throughput Tracking
 * Tracks weekly claim assignment and completion rates
 * Monitors backlog growth and booking ahead metrics
 */

import { supabase } from '../lib/supabase';

export interface WeeklyThroughput {
  week_start: Date;
  week_end: Date;
  week_label: string;
  claims_assigned: number;
  claims_completed: number;
  backlog_growth: number;
  days_booked_ahead: number;
  utilization_rate: number;
  is_current_week: boolean;
}

export interface CapacityStressReport {
  generated_at: string;
  period_start: Date;
  period_end: Date;
  total_weeks: number;
  current_days_booked_ahead: number;
  weekly_data: WeeklyThroughput[];
  summary: {
    total_assigned: number;
    total_completed: number;
    total_backlog_growth: number;
    avg_weekly_assigned: number;
    avg_weekly_completed: number;
    avg_backlog_growth: number;
    completion_rate: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  capacity_indicators: {
    backlog_status: 'healthy' | 'warning' | 'critical';
    booking_pressure: 'low' | 'medium' | 'high';
    throughput_trend: string;
  };
}

interface ClaimForThroughput {
  id: string;
  created_at: string;
  status: string;
  assigned_to: string | null;
  appointment_start: string | null;
  completion_date: string | null;
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

function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.floor((utc2 - utc1) / msPerDay);
}

/**
 * Fetch all claims with throughput data
 */
async function fetchThroughputClaims(): Promise<ClaimForThroughput[]> {
  const { data, error } = await supabase
    .from('claims')
    .select('id, created_at, status, assigned_to, appointment_start, completion_date')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching throughput claims:', error);
    throw error;
  }

  return data || [];
}

/**
 * Calculate claims assigned in a week
 * Uses created_at as proxy for assignment date
 */
function calculateClaimsAssigned(
  claims: ClaimForThroughput[],
  weekStart: Date,
  weekEnd: Date
): number {
  let assignedCount = 0;

  for (const claim of claims) {
    // Count claims created during this week with an assigned appraiser
    if (claim.created_at && claim.assigned_to) {
      const createdDate = new Date(claim.created_at);
      if (isDateInWeek(createdDate, weekStart, weekEnd)) {
        assignedCount++;
      }
    }
  }

  return assignedCount;
}

/**
 * Calculate claims completed in a week
 */
function calculateClaimsCompleted(
  claims: ClaimForThroughput[],
  weekStart: Date,
  weekEnd: Date
): number {
  let completedCount = 0;

  for (const claim of claims) {
    if (claim.status === 'COMPLETED' && claim.completion_date) {
      const completedDate = new Date(claim.completion_date);
      if (isDateInWeek(completedDate, weekStart, weekEnd)) {
        completedCount++;
      }
    }
  }

  return completedCount;
}

/**
 * Calculate how many days ahead we're booked
 * Finds the latest scheduled appointment and calculates days from today
 */
function calculateDaysBookedAhead(claims: ClaimForThroughput[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let latestAppointment: Date | null = null;

  for (const claim of claims) {
    // Only consider scheduled or in-progress claims
    if ((claim.status === 'SCHEDULED' || claim.status === 'IN_PROGRESS') && claim.appointment_start) {
      const appointmentDate = new Date(claim.appointment_start);

      if (!latestAppointment || appointmentDate > latestAppointment) {
        latestAppointment = appointmentDate;
      }
    }
  }

  if (!latestAppointment) {
    return 0;
  }

  return daysBetween(today, latestAppointment);
}

/**
 * Calculate utilization rate (completed / assigned ratio)
 */
function calculateUtilizationRate(assigned: number, completed: number): number {
  if (assigned === 0) return 0;
  return Math.round((completed / assigned) * 100 * 10) / 10;
}

/**
 * Determine backlog status
 */
function determineBacklogStatus(avgBacklogGrowth: number): 'healthy' | 'warning' | 'critical' {
  if (avgBacklogGrowth <= 2) return 'healthy';
  if (avgBacklogGrowth <= 5) return 'warning';
  return 'critical';
}

/**
 * Determine booking pressure
 */
function determineBookingPressure(daysBooked: number): 'low' | 'medium' | 'high' {
  if (daysBooked <= 7) return 'low';
  if (daysBooked <= 14) return 'medium';
  return 'high';
}

/**
 * Determine trend
 */
function determineTrend(weeklyData: WeeklyThroughput[]): 'improving' | 'stable' | 'declining' {
  if (weeklyData.length < 3) return 'stable';

  // Get last 3 weeks of backlog growth
  const recentWeeks = weeklyData.slice(-3);
  const avgRecentBacklog = recentWeeks.reduce((sum, w) => sum + w.backlog_growth, 0) / recentWeeks.length;

  // Get previous 3 weeks
  const previousWeeks = weeklyData.slice(-6, -3);
  if (previousWeeks.length < 3) return 'stable';
  const avgPreviousBacklog = previousWeeks.reduce((sum, w) => sum + w.backlog_growth, 0) / previousWeeks.length;

  // Compare trends
  const improvement = avgPreviousBacklog - avgRecentBacklog;

  if (improvement > 1) return 'improving'; // Backlog growing slower or shrinking
  if (improvement < -1) return 'declining'; // Backlog growing faster
  return 'stable';
}

/**
 * Generate complete capacity stress report
 * @param historicalWeeks Number of past weeks to include (default: 12)
 */
export async function generateCapacityStressReport(
  historicalWeeks: number = 12
): Promise<CapacityStressReport> {
  const claims = await fetchThroughputClaims();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate week boundaries
  const currentWeekStart = getWeekStart(today);
  const periodStart = addDays(currentWeekStart, -7 * historicalWeeks);
  const periodEnd = currentWeekStart;

  const weeklyData: WeeklyThroughput[] = [];

  // Calculate current days booked ahead
  const currentDaysBooked = calculateDaysBookedAhead(claims);

  // Generate data for each week
  for (let i = -historicalWeeks; i <= 0; i++) {
    const weekStart = addDays(currentWeekStart, i * 7);
    const weekEnd = getWeekEnd(weekStart);
    const isCurrentWeek = weekStart.getTime() === currentWeekStart.getTime();

    const claimsAssigned = calculateClaimsAssigned(claims, weekStart, weekEnd);
    const claimsCompleted = calculateClaimsCompleted(claims, weekStart, weekEnd);
    const backlogGrowth = claimsAssigned - claimsCompleted;

    // For historical weeks, calculate days booked ahead at end of that week
    // For current week, use current value
    const daysBooked = isCurrentWeek
      ? currentDaysBooked
      : calculateDaysBookedAhead(claims.filter(c => {
          if (!c.created_at) return false;
          return new Date(c.created_at) <= weekEnd;
        }));

    const utilizationRate = calculateUtilizationRate(claimsAssigned, claimsCompleted);

    weeklyData.push({
      week_start: weekStart,
      week_end: weekEnd,
      week_label: formatWeekLabel(weekStart),
      claims_assigned: claimsAssigned,
      claims_completed: claimsCompleted,
      backlog_growth: backlogGrowth,
      days_booked_ahead: daysBooked,
      utilization_rate: utilizationRate,
      is_current_week: isCurrentWeek
    });
  }

  // Calculate summary statistics
  const totalAssigned = weeklyData.reduce((sum, w) => sum + w.claims_assigned, 0);
  const totalCompleted = weeklyData.reduce((sum, w) => sum + w.claims_completed, 0);
  const totalBacklogGrowth = totalAssigned - totalCompleted;

  const avgWeeklyAssigned = weeklyData.length > 0 ? totalAssigned / weeklyData.length : 0;
  const avgWeeklyCompleted = weeklyData.length > 0 ? totalCompleted / weeklyData.length : 0;
  const avgBacklogGrowth = weeklyData.length > 0 ? totalBacklogGrowth / weeklyData.length : 0;

  const completionRate = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0;

  // Determine trend
  const trend = determineTrend(weeklyData);

  // Capacity indicators
  const backlogStatus = determineBacklogStatus(avgBacklogGrowth);
  const bookingPressure = determineBookingPressure(currentDaysBooked);

  let throughputTrend = '';
  if (trend === 'improving') {
    throughputTrend = 'Backlog decreasing - good throughput';
  } else if (trend === 'declining') {
    throughputTrend = 'Backlog increasing - throughput under pressure';
  } else {
    throughputTrend = 'Backlog stable - balanced throughput';
  }

  return {
    generated_at: new Date().toISOString(),
    period_start: periodStart,
    period_end: periodEnd,
    total_weeks: weeklyData.length,
    current_days_booked_ahead: currentDaysBooked,
    weekly_data: weeklyData,
    summary: {
      total_assigned: totalAssigned,
      total_completed: totalCompleted,
      total_backlog_growth: totalBacklogGrowth,
      avg_weekly_assigned: Math.round(avgWeeklyAssigned * 10) / 10,
      avg_weekly_completed: Math.round(avgWeeklyCompleted * 10) / 10,
      avg_backlog_growth: Math.round(avgBacklogGrowth * 10) / 10,
      completion_rate: Math.round(completionRate * 10) / 10,
      trend
    },
    capacity_indicators: {
      backlog_status: backlogStatus,
      booking_pressure: bookingPressure,
      throughput_trend: throughputTrend
    }
  };
}

/**
 * Get throughput for a specific week
 */
export async function getWeekThroughput(weekStart: Date): Promise<WeeklyThroughput> {
  const claims = await fetchThroughputClaims();
  const weekEnd = getWeekEnd(weekStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekStart = getWeekStart(today);
  const isCurrentWeek = weekStart.getTime() === currentWeekStart.getTime();

  const claimsAssigned = calculateClaimsAssigned(claims, weekStart, weekEnd);
  const claimsCompleted = calculateClaimsCompleted(claims, weekStart, weekEnd);
  const backlogGrowth = claimsAssigned - claimsCompleted;
  const daysBooked = calculateDaysBookedAhead(claims);
  const utilizationRate = calculateUtilizationRate(claimsAssigned, claimsCompleted);

  return {
    week_start: weekStart,
    week_end: weekEnd,
    week_label: formatWeekLabel(weekStart),
    claims_assigned: claimsAssigned,
    claims_completed: claimsCompleted,
    backlog_growth: backlogGrowth,
    days_booked_ahead: daysBooked,
    utilization_rate: utilizationRate,
    is_current_week: isCurrentWeek
  };
}
