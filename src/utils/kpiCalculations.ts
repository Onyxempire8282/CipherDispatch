/**
 * KPI Calculation Logic (V1)
 *
 * KEY DESIGN: TWO DIFFERENT MONTH ANCHORS
 * ─────────────────────────────────────────────────────────────
 * 1. CalendarMonthKey (appointment_start) - matches calendar view
 *    - Used for: calendarClaims, monthScopedStatusCounts
 *    - Dec 2025 appointments = Dec 2025 calendar bucket
 *
 * 2. CompletedMonthKey (completion_date) - tracks production
 *    - Used for: totalClaims, revenue, peakDay, supplements
 *    - Dec 2025 completions = Dec 2025 completed bucket
 *
 * These are SEPARATE buckets - a claim with Dec appointment and Jan completion
 * appears in Dec calendar but Jan completed metrics.
 * ─────────────────────────────────────────────────────────────
 *
 * Other design decisions:
 * - Pipeline metrics are point-in-time (current queue state globally)
 * - Working days: full month for complete months, start→asOfDate for MTD
 * - Supplements: is_supplement === true OR original_claim_id != null
 * - Revenue: file_total ?? pay_amount ?? 0 for COMPLETED claims only
 * - Admin scheduling: scheduled_at with fallback to appointment_start
 */

import {
  startOfMonth,
  endOfMonth,
  parseISO,
  isValid,
  differenceInDays,
  differenceInMinutes,
  getDay,
  getWeek,
  format,
  eachDayOfInterval,
  isWeekend,
  min as minDate,
} from 'date-fns';
import type {
  KPIClaim,
  MonthlySnapshot,
  MonthComparison,
  MonthScopedStatusCounts,
  TeamMetrics,
  EfficiencyMetrics,
  WeekdayDistribution,
} from '../types/kpi';

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

function sum<T>(items: T[], valueFn: (item: T) => number): number {
  return items.reduce((acc, item) => acc + valueFn(item), 0);
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ═══════════════════════════════════════════════════════════════
// MONTH KEY FUNCTIONS (TWO DIFFERENT ANCHORS)
// ═══════════════════════════════════════════════════════════════

/**
 * Get the calendar month key for a claim (what month it appears on the calendar)
 * Uses appointment_start, with fallback to scheduled_at
 *
 * @returns "yyyy-MM" string or null if no appointment date
 */
export function getCalendarMonthKey(claim: KPIClaim): string | null {
  const dateStr = claim.appointment_start ?? claim.scheduled_at ?? null;
  if (!dateStr) return null;

  const d = parseISO(dateStr);
  if (!isValid(d)) return null;

  return format(d, 'yyyy-MM');
}

/**
 * Get the completed month key for a claim (what month it was completed)
 * Uses completion_date ONLY
 *
 * @returns "yyyy-MM" string or null if no completion date
 */
export function getCompletedMonthKey(claim: KPIClaim): string | null {
  if (!claim.completion_date) return null;

  const d = parseISO(claim.completion_date);
  if (!isValid(d)) return null;

  return format(d, 'yyyy-MM');
}

/**
 * Convert year/month to monthKey format
 */
export function toMonthKey(year: number, month: number): string {
  return `${year}-${month.toString().padStart(2, '0')}`;
}

// ═══════════════════════════════════════════════════════════════
// PERIOD BOUNDARY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get start and end dates for a given month
 */
export function getMonthBoundaries(year: number, month: number): { start: Date; end: Date } {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));
  return { start, end };
}

/**
 * Get last full month (relative to today)
 */
export function getLastFullMonth(today: Date): { year: number; month: number } {
  const year = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
  const month = today.getMonth() === 0 ? 12 : today.getMonth();
  return { year, month };
}

/**
 * Get current month info for MTD calculations
 */
export function getCurrentMTD(today: Date): { year: number; month: number; asOfDate: Date } {
  return {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    asOfDate: today,
  };
}

/**
 * Count working days (Mon-Fri) in a date range
 */
export function countWorkingDays(start: Date, end: Date): number {
  if (start > end) return 0;
  const days = eachDayOfInterval({ start, end });
  return days.filter(d => !isWeekend(d)).length;
}

// ═══════════════════════════════════════════════════════════════
// SUPPLEMENT DETECTION (V1: single source of truth)
// ═══════════════════════════════════════════════════════════════

/**
 * Determine if a claim is a supplement
 * V1 Rule: is_supplement === true OR original_claim_id is set
 */
export function isSupplementClaim(claim: KPIClaim): boolean {
  return claim.is_supplement === true || claim.original_claim_id != null;
}

// ═══════════════════════════════════════════════════════════════
// CALENDAR MONTH WORKLOAD (based on appointment_start)
// ═══════════════════════════════════════════════════════════════

/**
 * Get claims that appear on the calendar for a specific month
 * Uses appointment_start (with scheduled_at fallback) as the anchor
 */
function getCalendarClaimsForMonth(claims: KPIClaim[], monthKey: string): KPIClaim[] {
  return claims.filter(c => {
    if (c.archived_at) return false;
    return getCalendarMonthKey(c) === monthKey;
  });
}

/**
 * Calculate month-scoped status counts that match the calendar view
 * These counts "restart" each month based on appointment_start
 */
export function calculateMonthScopedStatusCounts(
  claims: KPIClaim[],
  monthKey: string
): MonthScopedStatusCounts {
  // Get all claims with appointments in this month (not archived)
  const monthSet = getCalendarClaimsForMonth(claims, monthKey);

  return {
    allActive: monthSet.filter(c => c.status !== 'CANCELED').length,
    unassigned: monthSet.filter(c =>
      c.status === 'UNASSIGNED' || c.status === null || !c.assigned_to
    ).length,
    scheduled: monthSet.filter(c => c.status === 'SCHEDULED').length,
    inProgress: monthSet.filter(c => c.status === 'IN_PROGRESS').length,
    completed: monthSet.filter(c => c.status === 'COMPLETED').length,
    canceled: monthSet.filter(c => c.status === 'CANCELED').length,
  };
}

/**
 * Calculate calendar workload metrics
 */
export function calculateCalendarWorkload(
  claims: KPIClaim[],
  year: number,
  month: number,
  asOfDate: Date,
  isMTD: boolean
): {
  calendarClaims: number;
  calendarClaimsPerWorkingDay: number;
  monthScopedCounts: MonthScopedStatusCounts;
} {
  const monthKey = toMonthKey(year, month);
  const { start, end } = getMonthBoundaries(year, month);

  // Get all calendar claims for month
  const calendarClaimsSet = getCalendarClaimsForMonth(claims, monthKey);

  // For MTD, we still show all appointments scheduled in the month
  // (calendar shows full month even if we're mid-month)
  const calendarClaims = calendarClaimsSet.length;

  // Working days calculation
  const workingDaysEnd = isMTD ? minDate([end, asOfDate]) : end;
  const workingDays = countWorkingDays(start, workingDaysEnd);

  // Month-scoped status counts (matches calendar counters)
  const monthScopedCounts = calculateMonthScopedStatusCounts(claims, monthKey);

  return {
    calendarClaims,
    calendarClaimsPerWorkingDay: workingDays > 0 ? round(calendarClaims / workingDays, 1) : 0,
    monthScopedCounts,
  };
}

// ═══════════════════════════════════════════════════════════════
// COMPLETED VOLUME (based on completion_date)
// ═══════════════════════════════════════════════════════════════

/**
 * Filter claims COMPLETED within a period
 * Uses completion_date as the anchor for "when work was done"
 */
function getCompletedClaimsInPeriod(claims: KPIClaim[], start: Date, end: Date): KPIClaim[] {
  return claims.filter(c => {
    if (c.status !== 'COMPLETED' || !c.completion_date) return false;
    const completionDate = parseISO(c.completion_date);
    return isValid(completionDate) && completionDate >= start && completionDate <= end;
  });
}

/**
 * Get claims completed in a specific month (by monthKey)
 */
function getCompletedClaimsForMonth(claims: KPIClaim[], monthKey: string): KPIClaim[] {
  return claims.filter(c => {
    if (c.status !== 'COMPLETED') return false;
    return getCompletedMonthKey(c) === monthKey;
  });
}

/**
 * Calculate completed volume metrics (production-based)
 */
export function calculateCompletedVolume(
  claims: KPIClaim[],
  year: number,
  month: number,
  asOfDate: Date,
  isMTD: boolean
): {
  totalClaims: number;
  supplementClaims: number;
  peakDayVolume: number;
  peakDayDate: string | null;
  workingDays: number;
  claimsPerWorkingDay: number;
} {
  const { start, end } = getMonthBoundaries(year, month);

  // For MTD, only count completions up to asOfDate
  const effectiveEnd = isMTD ? minDate([end, asOfDate]) : end;
  const completedClaims = getCompletedClaimsInPeriod(claims, start, effectiveEnd);

  // Group by completion date for peak calculation
  const byDay = groupBy(completedClaims, c => {
    const d = parseISO(c.completion_date!);
    return format(d, 'yyyy-MM-dd');
  });

  // Find peak day (based on completion_date)
  let peakDayVolume = 0;
  let peakDayDate: string | null = null;
  for (const [date, dayClaims] of Object.entries(byDay)) {
    if (dayClaims.length > peakDayVolume) {
      peakDayVolume = dayClaims.length;
      peakDayDate = date;
    }
  }

  // Working days calculation
  const workingDaysEnd = isMTD ? minDate([end, asOfDate]) : end;
  const workingDays = countWorkingDays(start, workingDaysEnd);

  // Count supplements
  const supplementClaims = completedClaims.filter(isSupplementClaim).length;

  return {
    totalClaims: completedClaims.length,
    supplementClaims,
    peakDayVolume,
    peakDayDate,
    workingDays,
    claimsPerWorkingDay: workingDays > 0 ? round(completedClaims.length / workingDays, 1) : 0,
  };
}

// ═══════════════════════════════════════════════════════════════
// REVENUE CALCULATIONS (based on completion_date)
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate monthly revenue metrics
 * Revenue = file_total ?? pay_amount ?? 0 for COMPLETED claims only
 */
export function calculateMonthlyRevenue(
  claims: KPIClaim[],
  year: number,
  month: number,
  asOfDate: Date,
  isMTD: boolean
): {
  grossRevenue: number;
  avgRevenuePerClaim: number;
} {
  const { start, end } = getMonthBoundaries(year, month);
  const effectiveEnd = isMTD ? minDate([end, asOfDate]) : end;
  const completedClaims = getCompletedClaimsInPeriod(claims, start, effectiveEnd);

  // Sum revenue: file_total ?? pay_amount ?? 0
  const grossRevenue = completedClaims.reduce((sum, c) => {
    return sum + (c.file_total ?? c.pay_amount ?? 0);
  }, 0);

  const avgRevenuePerClaim = completedClaims.length > 0
    ? grossRevenue / completedClaims.length
    : 0;

  return {
    grossRevenue: round(grossRevenue, 2),
    avgRevenuePerClaim: round(avgRevenuePerClaim, 2),
  };
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE STATUS (Point-in-time, GLOBAL - not month-filtered)
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate current pipeline status (global, point-in-time)
 * This is a snapshot of the ENTIRE queue, not filtered by month
 */
export function calculatePipelineStatus(claims: KPIClaim[]): {
  awaitingScheduling: number;
  scheduled: number;
  inProgress: number;
} {
  // Active claims only (not archived)
  const active = claims.filter(c => !c.archived_at);

  return {
    awaitingScheduling: active.filter(c =>
      !c.assigned_to || c.status === 'UNASSIGNED' || c.status === null
    ).length,

    scheduled: active.filter(c => c.status === 'SCHEDULED').length,

    inProgress: active.filter(c => c.status === 'IN_PROGRESS').length,
  };
}

// ═══════════════════════════════════════════════════════════════
// MONTHLY SNAPSHOT (combines BOTH calendar and completed metrics)
// ═══════════════════════════════════════════════════════════════

/**
 * Build a complete monthly snapshot with both calendar and completed metrics
 */
export function buildMonthlySnapshot(
  claims: KPIClaim[],
  year: number,
  month: number,
  asOfDate: Date,
  isMTD: boolean
): MonthlySnapshot {
  const monthKey = toMonthKey(year, month);

  // Calendar workload (appointment_start based)
  const calendarWorkload = calculateCalendarWorkload(claims, year, month, asOfDate, isMTD);

  // Completed volume (completion_date based)
  const completedVolume = calculateCompletedVolume(claims, year, month, asOfDate, isMTD);

  // Revenue (completion_date based)
  const revenue = calculateMonthlyRevenue(claims, year, month, asOfDate, isMTD);

  // Pipeline (global, point-in-time)
  const pipeline = calculatePipelineStatus(claims);

  return {
    year,
    month,
    monthName: MONTH_NAMES[month - 1],
    monthKey,
    isComplete: !isMTD,
    asOfDate,

    // Calendar workload (appointment_start based)
    calendarClaims: calendarWorkload.calendarClaims,
    calendarClaimsPerWorkingDay: calendarWorkload.calendarClaimsPerWorkingDay,
    monthScopedCounts: calendarWorkload.monthScopedCounts,

    // Completed volume (completion_date based)
    totalClaims: completedVolume.totalClaims,
    completedThisPeriod: completedVolume.totalClaims,
    supplementClaims: completedVolume.supplementClaims,
    peakDayVolume: completedVolume.peakDayVolume,
    peakDayDate: completedVolume.peakDayDate,
    workingDays: completedVolume.workingDays,
    claimsPerWorkingDay: completedVolume.claimsPerWorkingDay,

    // Revenue
    grossRevenue: revenue.grossRevenue,
    avgRevenuePerClaim: revenue.avgRevenuePerClaim,

    // Pipeline (global)
    pipeline,
  };
}

// ═══════════════════════════════════════════════════════════════
// COMPARISON & DELTA CALCULATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate delta and percentage change
 */
function calculateDelta(current: number, previous: number): {
  delta: number;
  percent: number | null;
} {
  const delta = current - previous;
  const percent = previous !== 0 ? round((delta / previous) * 100, 1) : null;
  return { delta, percent };
}

/**
 * Calculate pace projection (simple linear extrapolation)
 */
function calculatePaceProjection(
  mtdValue: number,
  mtdWorkingDays: number,
  totalWorkingDaysInMonth: number
): number {
  if (mtdWorkingDays === 0) return 0;
  const dailyRate = mtdValue / mtdWorkingDays;
  return round(dailyRate * totalWorkingDaysInMonth, 0);
}

/**
 * Build month-over-month comparison
 */
export function buildMonthComparison(
  claims: KPIClaim[],
  today: Date
): MonthComparison {
  // Last full month
  const lastMonthInfo = getLastFullMonth(today);
  const lastMonthBounds = getMonthBoundaries(lastMonthInfo.year, lastMonthInfo.month);
  const lastMonth = buildMonthlySnapshot(
    claims,
    lastMonthInfo.year,
    lastMonthInfo.month,
    lastMonthBounds.end,
    false // complete month
  );

  // Current MTD
  const currentInfo = getCurrentMTD(today);
  const currentMTD = buildMonthlySnapshot(
    claims,
    currentInfo.year,
    currentInfo.month,
    currentInfo.asOfDate,
    true // MTD
  );

  // Calculate deltas (completed-based)
  const claimsDelta = calculateDelta(currentMTD.totalClaims, lastMonth.totalClaims);
  const revenueDelta = calculateDelta(currentMTD.grossRevenue, lastMonth.grossRevenue);
  const avgRevenueDelta = calculateDelta(currentMTD.avgRevenuePerClaim, lastMonth.avgRevenuePerClaim);

  // Calendar workload delta (appointment-based)
  const calendarClaimsDelta = calculateDelta(currentMTD.calendarClaims, lastMonth.calendarClaims);

  // Calculate pace projections
  const totalWorkingDaysInMonth = countWorkingDays(
    startOfMonth(today),
    endOfMonth(today)
  );

  return {
    lastMonth,
    currentMTD,

    // Completed deltas
    claimsDelta: claimsDelta.delta,
    claimsDeltaPercent: claimsDelta.percent,
    revenueDelta: revenueDelta.delta,
    revenueDeltaPercent: revenueDelta.percent,
    avgRevenueDelta: avgRevenueDelta.delta,
    avgRevenueDeltaPercent: avgRevenueDelta.percent,

    // Calendar workload delta
    calendarClaimsDelta: calendarClaimsDelta.delta,
    calendarClaimsDeltaPercent: calendarClaimsDelta.percent,

    // Pace projections
    projectedMonthEndClaims: calculatePaceProjection(
      currentMTD.totalClaims,
      currentMTD.workingDays,
      totalWorkingDaysInMonth
    ),
    projectedMonthEndRevenue: calculatePaceProjection(
      currentMTD.grossRevenue,
      currentMTD.workingDays,
      totalWorkingDaysInMonth
    ),
  };
}

// ═══════════════════════════════════════════════════════════════
// TEAM METRICS
// ═══════════════════════════════════════════════════════════════

/**
 * Get scheduling date for a claim
 * Uses scheduled_at if available, falls back to appointment_start
 */
function getSchedulingDate(claim: KPIClaim): Date | null {
  if (claim.scheduled_at) {
    const d = parseISO(claim.scheduled_at);
    if (isValid(d)) return d;
  }

  if (claim.appointment_start) {
    const d = parseISO(claim.appointment_start);
    if (isValid(d)) return d;
  }

  return null;
}

/**
 * Calculate team contribution metrics
 */
export function calculateTeamMetrics(
  claims: KPIClaim[],
  year: number,
  month: number,
  photoMetrics?: { claimsWithPhotos: number; totalPhotosUploaded: number; avgPhotosPerClaim: number }
): TeamMetrics {
  const { start, end } = getMonthBoundaries(year, month);

  // Admin: scheduling + invoicing
  const scheduledInPeriod = claims.filter(c => {
    const schedulingDate = getSchedulingDate(c);
    return schedulingDate && schedulingDate >= start && schedulingDate <= end;
  });

  const invoicedInPeriod = claims.filter(c => {
    if (c.file_total == null || !c.completion_date) return false;
    const completionDate = parseISO(c.completion_date);
    return isValid(completionDate) && completionDate >= start && completionDate <= end;
  });

  const withSchedulingData = scheduledInPeriod.filter(c => c.created_at);
  let avgSchedulingLag: number | null = null;
  if (withSchedulingData.length > 0) {
    const totalDays = withSchedulingData.reduce((sum, c) => {
      const created = parseISO(c.created_at!);
      const scheduled = getSchedulingDate(c)!;
      return sum + differenceInDays(scheduled, created);
    }, 0);
    avgSchedulingLag = round(totalDays / withSchedulingData.length, 1);
  }

  // Inspection: completed claims
  const completedInPeriod = getCompletedClaimsInPeriod(claims, start, end);
  const supplementsCompleted = completedInPeriod.filter(isSupplementClaim).length;
  const avgFileTotal = completedInPeriod.length > 0
    ? round(sum(completedInPeriod, c => c.file_total ?? 0) / completedInPeriod.length, 2)
    : 0;

  return {
    period: { year, month },

    admin: {
      claimsScheduled: scheduledInPeriod.length,
      claimsInvoiced: invoicedInPeriod.length,
      avgSchedulingLag,
    },

    photography: photoMetrics ?? {
      claimsWithPhotos: 0,
      totalPhotosUploaded: 0,
      avgPhotosPerClaim: 0,
    },

    inspection: {
      claimsInspected: completedInPeriod.length,
      supplementsProcessed: supplementsCompleted,
      avgFileTotal,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// EFFICIENCY METRICS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate efficiency/scheduling pattern metrics
 */
export function calculateEfficiencyMetrics(
  claims: KPIClaim[],
  year: number,
  month: number
): EfficiencyMetrics {
  const { start, end } = getMonthBoundaries(year, month);
  const completedInPeriod = getCompletedClaimsInPeriod(claims, start, end);

  // Group by completion date
  const byDay = groupBy(completedInPeriod, c => {
    const d = parseISO(c.completion_date!);
    return format(d, 'yyyy-MM-dd');
  });

  // Claims per day map
  const claimsPerDay: Record<string, number> = {};
  for (const [date, dayClaims] of Object.entries(byDay)) {
    claimsPerDay[date] = dayClaims.length;
  }

  // Claims per week
  const claimsPerWeek: Record<number, number> = {};
  for (const claim of completedInPeriod) {
    const d = parseISO(claim.completion_date!);
    const weekNum = getWeek(d);
    claimsPerWeek[weekNum] = (claimsPerWeek[weekNum] ?? 0) + 1;
  }

  // Multi-claim days (2+ claims)
  const multiClaimDays = Object.values(byDay).filter(dayClaims => dayClaims.length >= 2).length;

  // Weekday distribution
  const weekdayDist: WeekdayDistribution = {
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
    sunday: 0,
  };
  const dayKeys: (keyof WeekdayDistribution)[] = [
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
  ];
  for (const claim of completedInPeriod) {
    const d = parseISO(claim.completion_date!);
    const dayIndex = getDay(d);
    weekdayDist[dayKeys[dayIndex]]++;
  }

  // Appointment spacing
  const avgSpacing = calculateAvgAppointmentSpacing(claims, start, end);

  return {
    period: { year, month },
    claimsPerDay,
    claimsPerWeek,
    multiClaimDays,
    avgAppointmentSpacing: avgSpacing,
    weekdayDistribution: weekdayDist,
  };
}

/**
 * Calculate average spacing between appointments on multi-appointment days
 */
function calculateAvgAppointmentSpacing(
  claims: KPIClaim[],
  start: Date,
  end: Date
): number | null {
  const withAppointments = claims.filter(c => {
    if (!c.appointment_start) return false;
    const d = parseISO(c.appointment_start);
    return isValid(d) && d >= start && d <= end;
  });

  const byDay = groupBy(withAppointments, c => {
    const d = parseISO(c.appointment_start!);
    return format(d, 'yyyy-MM-dd');
  });

  let totalGapMinutes = 0;
  let gapCount = 0;

  for (const dayClaims of Object.values(byDay)) {
    if (dayClaims.length < 2) continue;

    const sorted = [...dayClaims].sort((a, b) => {
      const aTime = parseISO(a.appointment_start!).getTime();
      const bTime = parseISO(b.appointment_start!).getTime();
      return aTime - bTime;
    });

    for (let i = 1; i < sorted.length; i++) {
      const prevEnd = sorted[i - 1].appointment_end
        ? parseISO(sorted[i - 1].appointment_end!)
        : parseISO(sorted[i - 1].appointment_start!);
      const currStart = parseISO(sorted[i].appointment_start!);

      const gapMinutes = differenceInMinutes(currStart, prevEnd);

      if (gapMinutes > 0 && gapMinutes < 480) {
        totalGapMinutes += gapMinutes;
        gapCount++;
      }
    }
  }

  return gapCount > 0 ? round(totalGapMinutes / gapCount, 0) : null;
}

// ═══════════════════════════════════════════════════════════════
// UI HELPER: Weekend visibility check
// ═══════════════════════════════════════════════════════════════

/**
 * Determine if weekend columns should be shown
 * Rule: Hide weekends unless values > 0
 */
export function shouldShowWeekends(distribution: WeekdayDistribution): {
  showSaturday: boolean;
  showSunday: boolean;
} {
  return {
    showSaturday: distribution.saturday > 0,
    showSunday: distribution.sunday > 0,
  };
}
