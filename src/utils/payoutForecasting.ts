// Payout Forecasting - Based on Historical Deposit Analysis
// Uses actual deposit dates to infer pay periods and forecast future payouts
// Forecasts FUTURE payouts based on scheduled appointments

import { calculateExpectedPayout, normalizeFirmNameForConfig, isRecurringFirm } from './firmFeeConfig';

export interface Claim {
  id: string;
  firm_name: string;
  completion_date?: string | null;
  appointment_start?: string | null;
  file_total?: number | null;
  pay_amount?: number | null;
  mileage?: number | null;
  status: string;
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
  // Use the shared normalizer from firmFeeConfig
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

// Main pay period calculation based on deposit analysis
export function getPayPeriod(firm: string, completedDate: Date): PayoutPeriod {
  const normalized = normalizeFirmName(firm);
  const day = completedDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  switch(normalized) {
    case 'Sedgwick': {
      // Pays WEDNESDAY (corrected from your stated Thursday)
      // Period: Fri→Thu (work week), paid following Wed
      const daysUntilWed = (3 - day + 7) % 7 || 7;
      const payoutWed = addDays(completedDate, daysUntilWed);

      return {
        periodStart: addDays(payoutWed, -5), // Friday before
        periodEnd: addDays(payoutWed, -1),   // Tuesday before payout
        payoutDate: payoutWed
      };
    }

    case 'Legacy': {
      // Bi-weekly Wednesday, period Thu→Wed
      // Reference: 12/18/2024 (Wed)
      const refLegacy = new Date('2024-12-18');
      const daysUntilWed = (3 - day + 7) % 7 || 7;
      let nextWed = addDays(completedDate, daysUntilWed);

      // Check if this Wed is on the bi-weekly schedule
      const daysSinceRef = daysBetween(refLegacy, nextWed);
      const weeksSinceRef = Math.floor(daysSinceRef / 7);
      if (weeksSinceRef % 2 !== 0) {
        nextWed = addDays(nextWed, 7); // Move to next bi-weekly Wed
      }

      return {
        periodStart: addDays(nextWed, -13), // Thursday 2 weeks ago
        periodEnd: addDays(nextWed, -1),    // Tuesday before payout
        payoutDate: nextWed
      };
    }

    case 'ClaimSolution': {
      // Bi-weekly Thursday, period Fri→Thu
      // Reference: 12/19/2024 (Thu)
      const refCS = new Date('2024-12-19');
      const daysUntilThu = (4 - day + 7) % 7 || 7;
      let nextThu = addDays(completedDate, daysUntilThu);

      const daysSinceRef = daysBetween(refCS, nextThu);
      const weeksSinceRef = Math.floor(daysSinceRef / 7);
      if (weeksSinceRef % 2 !== 0) {
        nextThu = addDays(nextThu, 7);
      }

      return {
        periodStart: addDays(nextThu, -13), // Friday 2 weeks ago
        periodEnd: nextThu,
        payoutDate: nextThu
      };
    }

    case 'Complete Claims': {
      // Bi-weekly Wednesday, period Thu→Wed
      // Reference: 12/4/2024 (Wed)
      const refCC = new Date('2024-12-04');
      const daysUntilWed = (3 - day + 7) % 7 || 7;
      let nextWed = addDays(completedDate, daysUntilWed);

      const daysSinceRef = daysBetween(refCC, nextWed);
      const weeksSinceRef = Math.floor(daysSinceRef / 7);
      if (weeksSinceRef % 2 !== 0) {
        nextWed = addDays(nextWed, 7);
      }

      return {
        periodStart: addDays(nextWed, -13), // Thursday 2 weeks ago
        periodEnd: addDays(nextWed, -1),    // Tuesday before
        payoutDate: nextWed
      };
    }

    case 'Doan': {
      // Weekly Thursday (low confidence - irregular deposits)
      // Best guess: period Fri→Thu
      const daysUntilThu = (4 - day + 7) % 7 || 7;
      const payoutThu = addDays(completedDate, daysUntilThu);

      return {
        periodStart: addDays(payoutThu, -6), // Friday before
        periodEnd: payoutThu,
        payoutDate: payoutThu
      };
    }

    case 'ACD': {
      // Semi-monthly: 15th & EOM
      // Work 1-15 → paid 15th; work 16-EOM → paid EOM
      const currMonth = completedDate.getMonth();
      const currYear = completedDate.getFullYear();
      const currDay = completedDate.getDate();

      if (currDay <= 15) {
        const payout15 = new Date(currYear, currMonth, 15);
        return {
          periodStart: new Date(currYear, currMonth, 1, 0, 0, 0),
          periodEnd: new Date(currYear, currMonth, 15, 23, 59, 59),
          payoutDate: adjustForWeekend(payout15)
        };
      } else {
        const lastDay = new Date(currYear, currMonth + 1, 0).getDate();
        const payoutEOM = new Date(currYear, currMonth, lastDay);
        return {
          periodStart: new Date(currYear, currMonth, 16, 0, 0, 0),
          periodEnd: new Date(currYear, currMonth, lastDay, 23, 59, 59),
          payoutDate: adjustForWeekend(payoutEOM)
        };
      }
    }

    case 'HEA': {
      // Monthly on 15th, covers PREVIOUS month's work
      const heaMonth = completedDate.getMonth();
      const heaYear = completedDate.getFullYear();
      const heaDay = completedDate.getDate();

      if (heaDay < 15) {
        // Work in first half → paid 15th of this month for previous month
        const payout15 = new Date(heaYear, heaMonth, 15);
        const prevMonthLast = new Date(heaYear, heaMonth, 0);
        return {
          periodStart: new Date(heaYear, heaMonth - 1, 1, 0, 0, 0),
          periodEnd: new Date(heaYear, heaMonth, 0, 23, 59, 59),
          payoutDate: adjustForWeekend(payout15)
        };
      } else {
        // Work after 15th → paid 15th of NEXT month
        const payout15Next = new Date(heaYear, heaMonth + 1, 15);
        return {
          periodStart: new Date(heaYear, heaMonth, 1, 0, 0, 0),
          periodEnd: new Date(heaYear, heaMonth + 1, 0, 23, 59, 59),
          payoutDate: adjustForWeekend(payout15Next)
        };
      }
    }

    case 'IANET': {
      // Monthly end-of-month, covers same month
      const ianetMonth = completedDate.getMonth();
      const ianetYear = completedDate.getFullYear();
      const lastDay = new Date(ianetYear, ianetMonth + 1, 0).getDate();
      const payoutEOM = new Date(ianetYear, ianetMonth, lastDay);

      return {
        periodStart: new Date(ianetYear, ianetMonth, 1, 0, 0, 0),
        periodEnd: new Date(ianetYear, ianetMonth, lastDay, 23, 59, 59),
        payoutDate: adjustForWeekend(payoutEOM)
      };
    }

    case 'AMA': {
      // Bi-weekly (assuming similar to Complete Claims)
      // Reference date to be determined from actual deposits
      const refAMA = new Date('2024-12-04');
      const daysUntilWed = (3 - day + 7) % 7 || 7;
      let nextWed = addDays(completedDate, daysUntilWed);

      const daysSinceRef = daysBetween(refAMA, nextWed);
      const weeksSinceRef = Math.floor(daysSinceRef / 7);
      if (weeksSinceRef % 2 !== 0) {
        nextWed = addDays(nextWed, 7);
      }

      return {
        periodStart: addDays(nextWed, -13),
        periodEnd: addDays(nextWed, -1),
        payoutDate: nextWed
      };
    }

    case 'A-TEAM': {
      // Bi-weekly (assuming Thursday)
      const refATEAM = new Date('2024-12-19');
      const daysUntilThu = (4 - day + 7) % 7 || 7;
      let nextThu = addDays(completedDate, daysUntilThu);

      const daysSinceRef = daysBetween(refATEAM, nextThu);
      const weeksSinceRef = Math.floor(daysSinceRef / 7);
      if (weeksSinceRef % 2 !== 0) {
        nextThu = addDays(nextThu, 7);
      }

      return {
        periodStart: addDays(nextThu, -13),
        periodEnd: nextThu,
        payoutDate: nextThu
      };
    }

    case 'Frontline': {
      // Monthly end-of-month (similar to IANET)
      const frontlineMonth = completedDate.getMonth();
      const frontlineYear = completedDate.getFullYear();
      const lastDay = new Date(frontlineYear, frontlineMonth + 1, 0).getDate();
      const payoutEOM = new Date(frontlineYear, frontlineMonth, lastDay);

      return {
        periodStart: new Date(frontlineYear, frontlineMonth, 1, 0, 0, 0),
        periodEnd: new Date(frontlineYear, frontlineMonth, lastDay, 23, 59, 59),
        payoutDate: adjustForWeekend(payoutEOM)
      };
    }

    case 'SCA': {
      // Irregular - treat as monthly EOM
      const scaMonth = completedDate.getMonth();
      const scaYear = completedDate.getFullYear();
      const lastDay = new Date(scaYear, scaMonth + 1, 0).getDate();
      const payoutEOM = new Date(scaYear, scaMonth, lastDay);

      return {
        periodStart: new Date(scaYear, scaMonth, 1, 0, 0, 0),
        periodEnd: new Date(scaYear, scaMonth, lastDay, 23, 59, 59),
        payoutDate: adjustForWeekend(payoutEOM)
      };
    }

    default:
      throw new Error(`Unknown or excluded firm: ${normalized}`);
  }
}

// Main forecasting function
export function forecastPayouts(claims: Claim[], todayDate: Date = new Date()): PayoutForecast[] {
  const payoutMap = new Map<string, PayoutForecast>();

  for (const claim of claims) {
    const firmNormalized = normalizeFirmName(claim.firm_name);

    // Skip if not a recurring firm
    if (!isRecurringFirm(claim.firm_name)) continue;

    // Determine the work date - use completion_date if completed, otherwise use appointment_start
    let workDate: Date | null = null;
    let expectedAmount = 0;

    if (claim.status === 'COMPLETED' && claim.completion_date) {
      // For completed claims, use actual completion date and file_total/pay_amount
      workDate = new Date(claim.completion_date);
      expectedAmount = claim.file_total || claim.pay_amount || 0;
    } else if (claim.appointment_start) {
      // For scheduled claims, use appointment date and calculate expected amount
      workDate = new Date(claim.appointment_start);
      expectedAmount = calculateExpectedPayout(
        claim.firm_name,
        claim.pay_amount || undefined,
        claim.mileage || undefined
      );
    }

    if (!workDate || expectedAmount <= 0) continue;

    try {
      const period = getPayPeriod(firmNormalized, workDate);

      // Only include if work falls in a valid period
      if (workDate >= period.periodStart && workDate <= period.periodEnd) {
        const key = `${firmNormalized}|${period.payoutDate.toISOString()}`;

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
