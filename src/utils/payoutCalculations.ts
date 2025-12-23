export type PayCycleType = 'weekly' | 'weekly_thursday' | 'bi_monthly' | 'monthly_15th' | 'monthly_last';

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

// Get next payout date for Sedgwick (pays every Thursday for Fri-Thu work)
function getNextSedgwickPayout(fromDate: Date = new Date()): PayoutPeriod {
  const now = new Date(fromDate);
  const dayOfWeek = now.getDay(); // 0=Sun, 4=Thu, 5=Fri

  // Find next Thursday
  let daysUntilThursday = (4 - dayOfWeek + 7) % 7;
  if (daysUntilThursday === 0 && now.getHours() >= 17) daysUntilThursday = 7; // After 5pm Thursday, move to next week

  const nextThursday = new Date(now);
  nextThursday.setDate(now.getDate() + daysUntilThursday);
  nextThursday.setHours(17, 0, 0, 0);

  // Period is previous Friday to this Thursday
  const periodStart = new Date(nextThursday);
  periodStart.setDate(nextThursday.getDate() - 6); // Go back 6 days to Friday
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date(nextThursday);
  periodEnd.setHours(23, 59, 59, 999);

  return {
    startDate: periodStart,
    endDate: periodEnd,
    payDate: nextThursday,
    periodName: `Week ending ${nextThursday.toLocaleDateString()}`
  };
}

// Get next payout for ACD (1-15 pays on 15th, 16-end pays on last day)
function getNextACDPayout(fromDate: Date = new Date()): PayoutPeriod {
  const now = new Date(fromDate);
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  if (currentDay <= 15) {
    // In first half, next payout is 15th
    const payDate = new Date(currentYear, currentMonth, 15, 17, 0, 0, 0);
    return {
      startDate: new Date(currentYear, currentMonth, 1, 0, 0, 0, 0),
      endDate: new Date(currentYear, currentMonth, 15, 23, 59, 59, 999),
      payDate,
      periodName: `${getMonthName(currentMonth)} 1-15`
    };
  } else {
    // In second half, next payout is last day of month
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const payDate = new Date(currentYear, currentMonth, lastDay, 17, 0, 0, 0);
    return {
      startDate: new Date(currentYear, currentMonth, 16, 0, 0, 0, 0),
      endDate: new Date(currentYear, currentMonth, lastDay, 23, 59, 59, 999),
      payDate,
      periodName: `${getMonthName(currentMonth)} 16-${lastDay}`
    };
  }
}

// Get next payout for monthly vendors
function getNextMonthlyPayout(fromDate: Date, payDay: number | 'last'): PayoutPeriod {
  const now = new Date(fromDate);
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const isLast = payDay === 'last';
  const targetDay = isLast ? new Date(currentYear, currentMonth + 1, 0).getDate() : payDay as number;

  let payDate: Date;
  let periodStart: Date;
  let periodEnd: Date;

  if (currentDay <= targetDay) {
    // This month
    payDate = new Date(currentYear, currentMonth, targetDay, 17, 0, 0, 0);
    periodStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
    periodEnd = new Date(currentYear, currentMonth, targetDay, 23, 59, 59, 999);
  } else {
    // Next month
    const nextMonth = currentMonth + 1;
    const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
    const adjustedMonth = nextMonth > 11 ? 0 : nextMonth;
    const nextTargetDay = isLast ? new Date(nextYear, adjustedMonth + 1, 0).getDate() : payDay as number;

    payDate = new Date(nextYear, adjustedMonth, nextTargetDay, 17, 0, 0, 0);
    periodStart = new Date(nextYear, adjustedMonth, 1, 0, 0, 0, 0);
    periodEnd = new Date(nextYear, adjustedMonth, nextTargetDay, 23, 59, 59, 999);
  }

  return {
    startDate: periodStart,
    endDate: periodEnd,
    payDate,
    periodName: `${getMonthName(periodStart.getMonth())} ${isLast ? 'Month-End' : payDay}`
  };
}

// Get next weekly payout (generic weekly, pays Friday for previous week)
function getNextWeeklyPayout(fromDate: Date = new Date()): PayoutPeriod {
  const now = new Date(fromDate);
  const dayOfWeek = now.getDay();

  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  if (daysUntilFriday === 0 && now.getHours() >= 17) daysUntilFriday = 7;

  const nextFriday = new Date(now);
  nextFriday.setDate(now.getDate() + daysUntilFriday);
  nextFriday.setHours(17, 0, 0, 0);

  const periodStart = new Date(nextFriday);
  periodStart.setDate(nextFriday.getDate() - 6);
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date(nextFriday);
  periodEnd.setHours(23, 59, 59, 999);

  return {
    startDate: periodStart,
    endDate: periodEnd,
    payDate: nextFriday,
    periodName: `Week ending ${nextFriday.toLocaleDateString()}`
  };
}

export function getPayoutPeriod(cycleType: PayCycleType, fromDate: Date = new Date()): PayoutPeriod {
  switch (cycleType) {
    case 'weekly_thursday':
      return getNextSedgwickPayout(fromDate);
    case 'bi_monthly':
      return getNextACDPayout(fromDate);
    case 'monthly_15th':
      return getNextMonthlyPayout(fromDate, 15);
    case 'monthly_last':
      return getNextMonthlyPayout(fromDate, 'last');
    case 'weekly':
    default:
      return getNextWeeklyPayout(fromDate);
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
