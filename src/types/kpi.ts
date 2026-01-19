/**
 * KPI Dashboard Type Definitions (V1)
 *
 * Design principles:
 * - MonthlySnapshot captures both period metrics AND point-in-time pipeline
 * - MonthComparison provides deltas and pace projections (projections are secondary in UI)
 * - TeamMetrics tracks Admin/Photography/Inspection contributions
 * - EfficiencyMetrics captures scheduling patterns
 */

// ═══════════════════════════════════════════════════════════════
// CORE METRIC TYPES
// ═══════════════════════════════════════════════════════════════

export interface MonthlySnapshot {
  year: number;
  month: number;                        // 1-12
  monthName: string;                    // "January", "February", etc.
  isComplete: boolean;                  // false = current MTD, true = locked month
  asOfDate: Date;                       // snapshot timestamp (end of month if complete, today if MTD)

  // ─────────────────────────────────────────────────────────────
  // Volume Metrics (based on completion_date in period)
  // ─────────────────────────────────────────────────────────────
  totalClaims: number;                  // claims completed in period
  supplementClaims: number;             // claims flagged as supplements (is_supplement OR has original_claim_id)
  peakDayVolume: number;                // max claims completed in single day
  peakDayDate: string | null;           // ISO date of peak day (null if no claims)
  workingDays: number;                  // business days (Mon-Fri) in period
  claimsPerWorkingDay: number;          // totalClaims / workingDays

  // ─────────────────────────────────────────────────────────────
  // Revenue Metrics (COMPLETED claims only)
  // ─────────────────────────────────────────────────────────────
  grossRevenue: number;                 // sum of (file_total ?? pay_amount ?? 0) for completed claims
  avgRevenuePerClaim: number;           // grossRevenue / totalClaims (0 if no claims)

  // ─────────────────────────────────────────────────────────────
  // Pipeline Snapshot (point-in-time, NOT period-specific)
  // These reflect current queue state, updated live
  // ─────────────────────────────────────────────────────────────
  pipeline: {
    awaitingScheduling: number;         // status = UNASSIGNED or no assigned_to
    scheduled: number;                  // status = SCHEDULED
    inProgress: number;                 // status = IN_PROGRESS
  };

  // Period completion is tracked separately in totalClaims above
  // This avoids ambiguity between "completed in period" vs "currently completed status"
  completedThisPeriod: number;          // alias for totalClaims, explicit naming for clarity
}

export interface MonthComparison {
  lastMonth: MonthlySnapshot;
  currentMTD: MonthlySnapshot;

  // ─────────────────────────────────────────────────────────────
  // Computed Deltas (primary meeting numbers)
  // ─────────────────────────────────────────────────────────────
  claimsDelta: number;                  // currentMTD.totalClaims - lastMonth.totalClaims
  claimsDeltaPercent: number | null;    // percentage change (null if lastMonth = 0)
  revenueDelta: number;                 // currentMTD.grossRevenue - lastMonth.grossRevenue
  revenueDeltaPercent: number | null;
  avgRevenueDelta: number;
  avgRevenueDeltaPercent: number | null;

  // ─────────────────────────────────────────────────────────────
  // Pace Projections (secondary - toggle/tooltip in UI)
  // Simple linear projection: (MTD value / MTD working days) * total working days in month
  // ─────────────────────────────────────────────────────────────
  projectedMonthEndClaims: number;
  projectedMonthEndRevenue: number;
}

// ═══════════════════════════════════════════════════════════════
// TEAM CONTRIBUTION METRICS
// ═══════════════════════════════════════════════════════════════

export interface TeamMetrics {
  period: { year: number; month: number };

  // ─────────────────────────────────────────────────────────────
  // Admin/Scheduling (Nneka)
  // Uses scheduled_at as source of truth, with fallback to appointment_start
  // ─────────────────────────────────────────────────────────────
  admin: {
    claimsScheduled: number;            // claims where scheduled_at (or fallback) is in period
    claimsInvoiced: number;             // claims with file_total entered, completion_date in period
    avgSchedulingLag: number | null;    // avg days from created_at → scheduled_at (null if no data)
  };

  // ─────────────────────────────────────────────────────────────
  // Photography (Arianna)
  // Based on claim_photos table
  // ─────────────────────────────────────────────────────────────
  photography: {
    claimsWithPhotos: number;           // unique claims with at least 1 photo uploaded in period
    totalPhotosUploaded: number;        // count of all photos uploaded in period
    avgPhotosPerClaim: number;          // totalPhotosUploaded / claimsWithPhotos (0 if no claims)
  };

  // ─────────────────────────────────────────────────────────────
  // Inspection (Vernon)
  // Based on COMPLETED claims with completion_date in period
  // ─────────────────────────────────────────────────────────────
  inspection: {
    claimsInspected: number;            // claims moved to COMPLETED in period
    supplementsProcessed: number;       // subset that are supplements (is_supplement OR original_claim_id)
    avgFileTotal: number;               // average file_total for inspected claims (0 if none)
  };
}

// ═══════════════════════════════════════════════════════════════
// TIME & EFFICIENCY METRICS
// ═══════════════════════════════════════════════════════════════

export interface WeekdayDistribution {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;                     // computed but hidden in UI if 0
  sunday: number;                       // computed but hidden in UI if 0
}

export interface EfficiencyMetrics {
  period: { year: number; month: number };

  claimsPerDay: Record<string, number>;     // { "2025-01-15": 3, ... } keyed by ISO date
  claimsPerWeek: Record<number, number>;    // { 1: 12, 2: 15, ... } keyed by week number

  multiClaimDays: number;                   // days with 2+ claims completed
  avgAppointmentSpacing: number | null;     // avg minutes between appointments same day (null if insufficient data)

  weekdayDistribution: WeekdayDistribution; // claims by day of week (Sat/Sun hidden if 0)
}

// ═══════════════════════════════════════════════════════════════
// HISTORICAL TREND (V1: data structure ready, charting in V2)
// ═══════════════════════════════════════════════════════════════

export interface MonthlyTrendPoint {
  year: number;
  month: number;
  monthLabel: string;                   // "Jan '25"
  totalClaims: number;
  grossRevenue: number;
  avgRevenuePerClaim: number;
}

export type MonthlyTrend = MonthlyTrendPoint[];

// ═══════════════════════════════════════════════════════════════
// CLAIM TYPE (subset of fields needed for KPI calculations)
// ═══════════════════════════════════════════════════════════════

export interface KPIClaim {
  id: string;
  claim_number: string;
  status: string;
  created_at: string | null;
  completion_date: string | null;
  appointment_start: string | null;
  appointment_end: string | null;
  scheduled_at: string | null;          // when scheduling action occurred (fallback: appointment_start)
  file_total: number | null;
  pay_amount: number | null;
  firm_name: string | null;
  assigned_to: string | null;
  is_supplement: boolean | null;
  original_claim_id: string | null;
  archived_at: string | null;
}
