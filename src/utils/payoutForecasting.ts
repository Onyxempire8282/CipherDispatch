// Payout Forecasting - Based on Historical Deposit Analysis
// Uses actual deposit dates to infer pay periods and forecast future payouts
// Forecasts FUTURE payouts based on scheduled appointments
// Schedule data is injected from the vendors table — no hardcoded values

import { calculateExpectedPayout, normalizeFirmNameForConfig, isRecurringFirm } from './firmFeeConfig';

export interface Claim {
  id: string;
  firm: string;
  completion_date?: string | null;
  appointment_start?: string | null;
  file_total?: number | null;
  pay_amount?: number | null;
  state?: string | null;
  status: string;
}

export interface FirmSchedule {
  pay_schedule_type: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'irregular';
  pay_day: number;           // day of week (0-6) or day of month for monthly
  reference_date?: Date;     // only required for biweekly
}

export interface PayoutPeriod {
  periodStart: Date;
  periodEnd: Date;
  payoutDate: Date;
}

export interface PayoutForecast {
  payoutDate: Date;
  firm: string;
  totalExpected: number;
  claimIds: string[];
  claimCount: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface WeeklyTotal {
  weekStart: Date;
  weekEnd: Date;
  totalAmount: number;
  payouts: PayoutForecast[];
}

export interface MonthlyTotal {
  year: number;
  month: number;
  monthName: string;
  totalAmount: number;
  byFirm: Record<string, number>;
}

// Normalize firm names per deposit data mapping
export function normalizeFirmName(firmName: string): string {
  return normalizeFirmNameForConfig(firmName) || 'Unknown';
}

// Helper functions
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.floor((utc2 - utc1) / msPerDay);
}

function adjustForWeekend(date: Date): Date {
  const day = date.getDay();
  if (day === 0) return addDays(date, 1); // Sun → Mon
  if (day === 6) return addDays(date, 2); // Sat → Mon
  return date;
}

function getWeekStart(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  return addDays(date, diff);
}

// Main pay period calculation — schedule-driven, no hardcoded values
export function getPayPeriod(firm: string, completedDate: Date, schedule?: FirmSchedule): PayoutPeriod {
  const normalized = normalizeFirmName(firm);

  // If no schedule provided, throw — caller must supply one
  if (!schedule) {
    throw new Error(`No schedule provided for firm: ${normalized}`);
  }

  const day = completedDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const payDay = schedule.pay_day;

  switch (schedule.pay_schedule_type) {
    case 'weekly': {
      // Pays on payDay each week
      // Period: day after payDay → payDay (work week)
      const daysUntilPayDay = (payDay - day + 7) % 7 || 7;
      const payoutDay = addDays(completedDate, daysUntilPayDay);

      return {
        periodStart: addDays(payoutDay, -6), // 6 days before payout
        periodEnd: payoutDay,
        payoutDate: payoutDay
      };
    }

    case 'biweekly': {
      if (!schedule.reference_date) {
        throw new Error(`Bi-weekly firm ${normalized} requires a reference_date`);
      }

      const refDate = schedule.reference_date;

      // ClaimSolution special case: pays Thursday, 21 days after period start
      if (normalized === 'ClaimSolution') {
        // Find which bi-weekly period CONTAINS the work date
        const daysSincePayDay = (day - payDay + 7) % 7;
        const mostRecentPayDay = addDays(completedDate, -daysSincePayDay);

        const daysSinceRef = daysBetween(refDate, mostRecentPayDay);
        const weeksSinceRef = Math.floor(daysSinceRef / 7);

        let periodStartDay;
        if (weeksSinceRef % 2 === 0) {
          periodStartDay = mostRecentPayDay;
        } else {
          periodStartDay = addDays(mostRecentPayDay, -7);
        }

        const periodEnd = addDays(periodStartDay, 13);
        const payoutDate = addDays(periodStartDay, 21);

        return {
          periodStart: periodStartDay,
          periodEnd: periodEnd,
          payoutDate: payoutDate
        };
      }

      // Standard bi-weekly: pays on payDay every 2 weeks
      const daysUntilPayDay = (payDay - day + 7) % 7 || 7;
      let nextPayDay = addDays(completedDate, daysUntilPayDay);

      // Check if this day is on the bi-weekly schedule
      const daysSinceRef = daysBetween(refDate, nextPayDay);
      const weeksSinceRef = Math.floor(daysSinceRef / 7);
      if (weeksSinceRef % 2 !== 0) {
        nextPayDay = addDays(nextPayDay, 7); // Move to next bi-weekly cycle
      }

      return {
        periodStart: addDays(nextPayDay, -13), // 2 weeks before
        periodEnd: addDays(nextPayDay, -1),    // day before payout
        payoutDate: nextPayDay
      };
    }

    case 'semimonthly': {
      // Pays on payDay (e.g. 15th) and end-of-month
      const currMonth = completedDate.getMonth();
      const currYear = completedDate.getFullYear();
      const currDay = completedDate.getDate();

      if (currDay <= payDay) {
        const payoutMid = new Date(currYear, currMonth, payDay);
        return {
          periodStart: new Date(currYear, currMonth, 1, 0, 0, 0),
          periodEnd: new Date(currYear, currMonth, payDay, 23, 59, 59),
          payoutDate: adjustForWeekend(payoutMid)
        };
      } else {
        const lastDay = new Date(currYear, currMonth + 1, 0).getDate();
        const payoutEOM = new Date(currYear, currMonth, lastDay);
        return {
          periodStart: new Date(currYear, currMonth, payDay + 1, 0, 0, 0),
          periodEnd: new Date(currYear, currMonth, lastDay, 23, 59, 59),
          payoutDate: adjustForWeekend(payoutEOM)
        };
      }
    }

    case 'monthly': {
      const mMonth = completedDate.getMonth();
      const mYear = completedDate.getFullYear();

      if (payDay === 0) {
        // pay_day=0 means end-of-month (same month)
        const lastDay = new Date(mYear, mMonth + 1, 0).getDate();
        const payoutEOM = new Date(mYear, mMonth, lastDay);
        return {
          periodStart: new Date(mYear, mMonth, 1, 0, 0, 0),
          periodEnd: new Date(mYear, mMonth, lastDay, 23, 59, 59),
          payoutDate: adjustForWeekend(payoutEOM)
        };
      }

      // HEA-style: pays on payDay (e.g. 15th), covers PREVIOUS month's work
      const mDay = completedDate.getDate();
      if (mDay < payDay) {
        // Work in first half → pays payDay of this month for previous month
        const payoutDay = new Date(mYear, mMonth, payDay);
        return {
          periodStart: new Date(mYear, mMonth - 1, 1, 0, 0, 0),
          periodEnd: new Date(mYear, mMonth, 0, 23, 59, 59),
          payoutDate: adjustForWeekend(payoutDay)
        };
      } else {
        // Work after payDay → pays payDay of NEXT month
        const payoutDayNext = new Date(mYear, mMonth + 1, payDay);
        return {
          periodStart: new Date(mYear, mMonth, 1, 0, 0, 0),
          periodEnd: new Date(mYear, mMonth + 1, 0, 23, 59, 59),
          payoutDate: adjustForWeekend(payoutDayNext)
        };
      }
    }

    case 'irregular': {
      // Treat as monthly EOM
      const iMonth = completedDate.getMonth();
      const iYear = completedDate.getFullYear();
      const lastDay = new Date(iYear, iMonth + 1, 0).getDate();
      const payoutEOM = new Date(iYear, iMonth, lastDay);
      return {
        periodStart: new Date(iYear, iMonth, 1, 0, 0, 0),
        periodEnd: new Date(iYear, iMonth, lastDay, 23, 59, 59),
        payoutDate: adjustForWeekend(payoutEOM)
      };
    }

    default:
      throw new Error(`Unknown schedule type for firm ${normalized}: ${schedule.pay_schedule_type}`);
  }
}

// Main forecasting function — schedule-driven
export function forecastPayouts(
  claims: Claim[],
  firmSchedules: Record<string, FirmSchedule> = {}
): PayoutForecast[] {
  const payoutMap = new Map<string, PayoutForecast>();

  for (const claim of claims) {
    const firmNormalized = normalizeFirmName(claim.firm);

    // Skip if not a recurring firm or no schedule entry
    if (!isRecurringFirm(claim.firm)) continue;
    const schedule = firmSchedules[firmNormalized];
    if (!schedule) continue;

    // Determine the work date
    let workDate: Date | null = null;
    let expectedAmount = 0;

    if (claim.status === 'COMPLETED' && claim.completion_date) {
      workDate = new Date(claim.completion_date);
      expectedAmount = claim.file_total || claim.pay_amount || 0;
    } else if (claim.appointment_start) {
      workDate = new Date(claim.appointment_start);
      expectedAmount = claim.pay_amount || calculateExpectedPayout(claim.firm) || 0;
    }

    if (!workDate || expectedAmount <= 0) continue;

    try {
      const period = getPayPeriod(firmNormalized, workDate, schedule);

      // Only include if work falls in a valid period
      if (workDate >= period.periodStart && workDate <= period.periodEnd) {
        const payoutDateKey = period.payoutDate.toISOString().split('T')[0];
        const key = `${firmNormalized}|${payoutDateKey}`;

        if (!payoutMap.has(key)) {
          payoutMap.set(key, {
            payoutDate: period.payoutDate,
            firm: firmNormalized,
            totalExpected: 0,
            claimIds: [],
            claimCount: 0,
            periodStart: period.periodStart,
            periodEnd: period.periodEnd
          });
        }

        const payout = payoutMap.get(key)!;
        payout.totalExpected += expectedAmount;
        payout.claimIds.push(claim.id);
        payout.claimCount++;
      }
    } catch (error) {
      console.warn(`Could not process claim ${claim.id} for firm ${firmNormalized}:`, error);
    }
  }

  return Array.from(payoutMap.values())
    .sort((a, b) => a.payoutDate.getTime() - b.payoutDate.getTime());
}

// Weekly view: group payouts by week (Mon-Sun)
export function getWeeklyView(payouts: PayoutForecast[]): WeeklyTotal[] {
  const weekMap = new Map<string, WeeklyTotal>();

  for (const payout of payouts) {
    const weekStart = getWeekStart(payout.payoutDate);
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        weekStart,
        weekEnd: addDays(weekStart, 6),
        totalAmount: 0,
        payouts: []
      });
    }

    const week = weekMap.get(weekKey)!;
    week.totalAmount += payout.totalExpected;
    week.payouts.push(payout);
  }

  return Array.from(weekMap.values())
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
}

// Monthly view: group by calendar month
export function getMonthlyView(payouts: PayoutForecast[]): MonthlyTotal[] {
  const monthMap = new Map<string, MonthlyTotal>();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (const payout of payouts) {
    const year = payout.payoutDate.getFullYear();
    const month = payout.payoutDate.getMonth();
    const monthKey = `${year}-${month}`;

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        year,
        month,
        monthName: monthNames[month],
        totalAmount: 0,
        byFirm: {}
      });
    }

    const monthTotal = monthMap.get(monthKey)!;
    monthTotal.totalAmount += payout.totalExpected;
    monthTotal.byFirm[payout.firm] = (monthTotal.byFirm[payout.firm] || 0) + payout.totalExpected;
  }

  return Array.from(monthMap.values())
    .sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
}

// Get upcoming payouts (next 30 days)
export function getUpcomingPayouts(payouts: PayoutForecast[], days: number = 30): PayoutForecast[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const futureDate = addDays(today, days);

  return payouts.filter(p => p.payoutDate >= today && p.payoutDate <= futureDate);
}
