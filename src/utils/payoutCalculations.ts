export type PayCycleType =
  | 'weekly_thu_fri_thu'          // Sedgwick: weekly Thu; period = Fri→Thu
  | 'biweekly_thu_fri_thu'        // Legacy, Complete Claims: bi-weekly Thu; period = Fri→Thu
  | 'biweekly_fri_sat_fri'        // ClaimSolution, Doan: bi-weekly Fri; period = Sat→Fri
  | 'monthly_15th_prev_month'     // HEA: pays on 15th; covers previous month
  | 'semimonthly_15th_end'        // ACD: pays on 15th & 30/31
  | 'monthly_last_same_month';    // IANET: pays last day; covers same month

export interface PayoutPeriod {
  startDate: Date;
  endDate: Date;
  payDate: Date;
  periodName: string;
}

export interface VendorPayout {
  vendorName: string;
  currentPeriod: PayoutPeriod;
  nextPeriod: PayoutPeriod;
  currentTotal: number;
  nextTotal: number;
  claimCount: number;
}

// Sedgwick: weekly Thu; period = Fri→Thu
function getWeeklyThuFriThu(fromDate: Date = new Date()): PayoutPeriod {
  const now = new Date(fromDate);
  const dayOfWeek = now.getDay(); // 0=Sun, 4=Thu, 5=Fri

  // Find next Thursday
  let daysUntilThursday = (4 - dayOfWeek + 7) % 7;
  if (daysUntilThursday === 0) daysUntilThursday = 7; // If today is Thursday, move to next Thursday

  const nextThursday = new Date(now);
  nextThursday.setDate(now.getDate() + daysUntilThursday);
  nextThursday.setHours(0, 0, 0, 0);

  // Period is Fri→Thu (7 days ending on Thursday)
  const periodStart = new Date(nextThursday);
  periodStart.setDate(nextThursday.getDate() - 6); // Go back 6 days to Friday
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date(nextThursday);
  periodEnd.setHours(23, 59, 59, 999);

  return {
    startDate: periodStart,
    endDate: periodEnd,
    payDate: nextThursday,
    periodName: `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`
  };
}

// Legacy, Complete Claims: bi-weekly Thu; period = Fri→Thu
// Reference: Use a known Thursday pay date to calculate bi-weekly schedule
function getBiweeklyThuFriThu(fromDate: Date = new Date(), referencePayDate?: Date): PayoutPeriod {
  const now = new Date(fromDate);
  // Use Dec 26, 2024 as reference Thursday if none provided
  const ref = referencePayDate || new Date(2024, 11, 26); // Dec 26, 2024 (Thursday)

  // Find next Thursday from now
  const dayOfWeek = now.getDay();
  let daysUntilThursday = (4 - dayOfWeek + 7) % 7;
  if (daysUntilThursday === 0) daysUntilThursday = 7;

  let nextThursday = new Date(now);
  nextThursday.setDate(now.getDate() + daysUntilThursday);
  nextThursday.setHours(0, 0, 0, 0);

  // Calculate weeks difference from reference
  const daysDiff = Math.floor((nextThursday.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
  const weeksDiff = Math.floor(daysDiff / 7);

  // If not on bi-weekly schedule, move to next Thursday
  if (weeksDiff % 2 !== 0) {
    nextThursday.setDate(nextThursday.getDate() + 7);
  }

  // Period is 14 days (Fri→Thu)
  const periodStart = new Date(nextThursday);
  periodStart.setDate(nextThursday.getDate() - 13); // Go back 13 days to Friday 2 weeks ago
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date(nextThursday);
  periodEnd.setHours(23, 59, 59, 999);

  return {
    startDate: periodStart,
    endDate: periodEnd,
    payDate: nextThursday,
    periodName: `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`
  };
}

// ClaimSolution, Doan: bi-weekly Fri; period = Sat→Fri
function getBiweeklyFriSatFri(fromDate: Date = new Date(), referencePayDate?: Date): PayoutPeriod {
  const now = new Date(fromDate);
  // Use Dec 27, 2024 as reference Friday if none provided
  const ref = referencePayDate || new Date(2024, 11, 27); // Dec 27, 2024 (Friday)

  // Find next Friday from now
  const dayOfWeek = now.getDay();
  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  if (daysUntilFriday === 0) daysUntilFriday = 7;

  let nextFriday = new Date(now);
  nextFriday.setDate(now.getDate() + daysUntilFriday);
  nextFriday.setHours(0, 0, 0, 0);

  // Calculate weeks difference from reference
  const daysDiff = Math.floor((nextFriday.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
  const weeksDiff = Math.floor(daysDiff / 7);

  // If not on bi-weekly schedule, move to next Friday
  if (weeksDiff % 2 !== 0) {
    nextFriday.setDate(nextFriday.getDate() + 7);
  }

  // Period is 14 days (Sat→Fri)
  const periodStart = new Date(nextFriday);
  periodStart.setDate(nextFriday.getDate() - 13); // Go back 13 days to Saturday 2 weeks ago
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date(nextFriday);
  periodEnd.setHours(23, 59, 59, 999);

  return {
    startDate: periodStart,
    endDate: periodEnd,
    payDate: nextFriday,
    periodName: `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`
  };
}

// HEA: pays on 15th; covers previous month
function getMonthly15thPrevMonth(fromDate: Date = new Date()): PayoutPeriod {
  const now = new Date(fromDate);
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let payMonth, payYear;

  if (currentDay < 15) {
    // Next payout is 15th of this month
    payMonth = currentMonth;
    payYear = currentYear;
  } else {
    // Next payout is 15th of next month
    payMonth = currentMonth + 1;
    payYear = currentYear;
    if (payMonth > 11) {
      payMonth = 0;
      payYear++;
    }
  }

  const payDate = new Date(payYear, payMonth, 15, 0, 0, 0, 0);

  // Period is the entire previous month
  const periodMonth = payMonth - 1;
  const periodYear = periodMonth < 0 ? payYear - 1 : payYear;
  const adjustedPeriodMonth = periodMonth < 0 ? 11 : periodMonth;

  const periodStart = new Date(periodYear, adjustedPeriodMonth, 1, 0, 0, 0, 0);
  const periodEnd = new Date(periodYear, adjustedPeriodMonth + 1, 0, 23, 59, 59, 999);

  return {
    startDate: periodStart,
    endDate: periodEnd,
    payDate,
    periodName: `${getMonthName(adjustedPeriodMonth)} ${periodYear} (paid ${getMonthName(payMonth)} 15)`
  };
}

// ACD: pays on 15th & 30/31
function getSemimonthly15thEnd(fromDate: Date = new Date()): PayoutPeriod {
  const now = new Date(fromDate);
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  if (currentDay <= 15) {
    // Next payout is 15th
    const payDate = new Date(currentYear, currentMonth, 15, 0, 0, 0, 0);
    return {
      startDate: new Date(currentYear, currentMonth, 1, 0, 0, 0, 0),
      endDate: new Date(currentYear, currentMonth, 15, 23, 59, 59, 999),
      payDate,
      periodName: `${getMonthName(currentMonth)} 1-15`
    };
  } else {
    // Next payout is last day of month
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const payDate = new Date(currentYear, currentMonth, lastDay, 0, 0, 0, 0);
    return {
      startDate: new Date(currentYear, currentMonth, 16, 0, 0, 0, 0),
      endDate: new Date(currentYear, currentMonth, lastDay, 23, 59, 59, 999),
      payDate,
      periodName: `${getMonthName(currentMonth)} 16-${lastDay}`
    };
  }
}

// IANET: pays last day; covers same month
function getMonthlyLastSameMonth(fromDate: Date = new Date()): PayoutPeriod {
  const now = new Date(fromDate);
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  let payMonth, payYear;

  if (currentDay < lastDayOfMonth) {
    // Next payout is last day of this month
    payMonth = currentMonth;
    payYear = currentYear;
  } else {
    // Next payout is last day of next month
    payMonth = currentMonth + 1;
    payYear = currentYear;
    if (payMonth > 11) {
      payMonth = 0;
      payYear++;
    }
  }

  const lastDay = new Date(payYear, payMonth + 1, 0).getDate();
  const payDate = new Date(payYear, payMonth, lastDay, 0, 0, 0, 0);

  const periodStart = new Date(payYear, payMonth, 1, 0, 0, 0, 0);
  const periodEnd = new Date(payYear, payMonth, lastDay, 23, 59, 59, 999);

  return {
    startDate: periodStart,
    endDate: periodEnd,
    payDate,
    periodName: `${getMonthName(payMonth)} ${payYear}`
  };
}

export function getPayoutPeriod(cycleType: PayCycleType, fromDate: Date = new Date(), referencePayDate?: Date): PayoutPeriod {
  switch (cycleType) {
    case 'weekly_thu_fri_thu':
      return getWeeklyThuFriThu(fromDate);
    case 'biweekly_thu_fri_thu':
      return getBiweeklyThuFriThu(fromDate, referencePayDate);
    case 'biweekly_fri_sat_fri':
      return getBiweeklyFriSatFri(fromDate, referencePayDate);
    case 'monthly_15th_prev_month':
      return getMonthly15thPrevMonth(fromDate);
    case 'semimonthly_15th_end':
      return getSemimonthly15thEnd(fromDate);
    case 'monthly_last_same_month':
      return getMonthlyLastSameMonth(fromDate);
    default:
      return getWeeklyThuFriThu(fromDate);
  }
}

// Calculate monthly revenue
export function calculateMonthlyRevenue(claims: any[], month: number, year: number) {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const completedInMonth = claims.filter(c => {
    if (!c.completion_date || c.status !== 'COMPLETED') return false;
    const completionDate = new Date(c.completion_date);
    return completionDate >= monthStart && completionDate <= monthEnd;
  });

  return completedInMonth.reduce((sum, c) => sum + (c.file_total || 0), 0);
}

function getMonthName(month: number): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[month];
}
