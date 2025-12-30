/**
 * US Federal Holidays Utility
 * Calculates all 11 US federal holidays with observed date logic
 */

export type Holiday = {
  name: string;
  date: Date;
  observed: Date;
  isObserved: boolean;
};

/**
 * Get the nth occurrence of a weekday in a month
 * @param year - Year
 * @param month - Month (0-11)
 * @param dayOfWeek - Day of week (0=Sunday, 1=Monday, etc.)
 * @param n - Which occurrence (1=first, 2=second, etc., -1=last)
 */
function getNthWeekdayOfMonth(
  year: number,
  month: number,
  dayOfWeek: number,
  n: number
): Date {
  if (n === -1) {
    // Get last occurrence
    const lastDay = new Date(year, month + 1, 0);
    const lastDayOfWeek = lastDay.getDay();
    const daysToSubtract = (lastDayOfWeek - dayOfWeek + 7) % 7;
    return new Date(year, month, lastDay.getDate() - daysToSubtract);
  } else {
    // Get nth occurrence
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    const daysToAdd = (dayOfWeek - firstDayOfWeek + 7) % 7;
    const targetDate = 1 + daysToAdd + (n - 1) * 7;
    return new Date(year, month, targetDate);
  }
}

/**
 * Calculate observed date for a holiday
 * If Saturday -> Friday before
 * If Sunday -> Monday after
 */
function getObservedDate(actualDate: Date): Date {
  const dayOfWeek = actualDate.getDay();

  if (dayOfWeek === 6) {
    // Saturday -> observe on Friday
    const observed = new Date(actualDate);
    observed.setDate(actualDate.getDate() - 1);
    return observed;
  } else if (dayOfWeek === 0) {
    // Sunday -> observe on Monday
    const observed = new Date(actualDate);
    observed.setDate(actualDate.getDate() + 1);
    return observed;
  }

  // Weekday -> observe on actual date
  return actualDate;
}

/**
 * Calculate all US federal holidays for a given year
 */
export function getFederalHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = [];

  // 1. New Year's Day - January 1
  const newYears = new Date(year, 0, 1);
  holidays.push({
    name: "New Year's Day",
    date: newYears,
    observed: getObservedDate(newYears),
    isObserved: newYears.getTime() !== getObservedDate(newYears).getTime(),
  });

  // 2. Martin Luther King Jr. Day - 3rd Monday in January
  const mlkDay = getNthWeekdayOfMonth(year, 0, 1, 3);
  holidays.push({
    name: "Martin Luther King Jr. Day",
    date: mlkDay,
    observed: mlkDay,
    isObserved: false,
  });

  // 3. Presidents' Day - 3rd Monday in February
  const presidentsDay = getNthWeekdayOfMonth(year, 1, 1, 3);
  holidays.push({
    name: "Presidents' Day",
    date: presidentsDay,
    observed: presidentsDay,
    isObserved: false,
  });

  // 4. Memorial Day - Last Monday in May
  const memorialDay = getNthWeekdayOfMonth(year, 4, 1, -1);
  holidays.push({
    name: "Memorial Day",
    date: memorialDay,
    observed: memorialDay,
    isObserved: false,
  });

  // 5. Juneteenth - June 19
  const juneteenth = new Date(year, 5, 19);
  holidays.push({
    name: "Juneteenth",
    date: juneteenth,
    observed: getObservedDate(juneteenth),
    isObserved: juneteenth.getTime() !== getObservedDate(juneteenth).getTime(),
  });

  // 6. Independence Day - July 4
  const independenceDay = new Date(year, 6, 4);
  holidays.push({
    name: "Independence Day",
    date: independenceDay,
    observed: getObservedDate(independenceDay),
    isObserved:
      independenceDay.getTime() !== getObservedDate(independenceDay).getTime(),
  });

  // 7. Labor Day - 1st Monday in September
  const laborDay = getNthWeekdayOfMonth(year, 8, 1, 1);
  holidays.push({
    name: "Labor Day",
    date: laborDay,
    observed: laborDay,
    isObserved: false,
  });

  // 8. Columbus Day - 2nd Monday in October
  const columbusDay = getNthWeekdayOfMonth(year, 9, 1, 2);
  holidays.push({
    name: "Columbus Day",
    date: columbusDay,
    observed: columbusDay,
    isObserved: false,
  });

  // 9. Veterans Day - November 11
  const veteransDay = new Date(year, 10, 11);
  holidays.push({
    name: "Veterans Day",
    date: veteransDay,
    observed: getObservedDate(veteransDay),
    isObserved:
      veteransDay.getTime() !== getObservedDate(veteransDay).getTime(),
  });

  // 10. Thanksgiving - 4th Thursday in November
  const thanksgiving = getNthWeekdayOfMonth(year, 10, 4, 4);
  holidays.push({
    name: "Thanksgiving Day",
    date: thanksgiving,
    observed: thanksgiving,
    isObserved: false,
  });

  // 11. Christmas Day - December 25
  const christmas = new Date(year, 11, 25);
  holidays.push({
    name: "Christmas Day",
    date: christmas,
    observed: getObservedDate(christmas),
    isObserved: christmas.getTime() !== getObservedDate(christmas).getTime(),
  });

  return holidays;
}

/**
 * Check if a given date is a federal holiday (including observed dates)
 * Returns the holiday object if true, null otherwise
 */
export function isHoliday(date: Date): Holiday | null {
  const year = date.getFullYear();
  const holidays = getFederalHolidays(year);

  // Normalize the input date to midnight for comparison
  const normalizedDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  for (const holiday of holidays) {
    const normalizedObserved = new Date(
      holiday.observed.getFullYear(),
      holiday.observed.getMonth(),
      holiday.observed.getDate()
    );

    if (normalizedDate.getTime() === normalizedObserved.getTime()) {
      return holiday;
    }
  }

  return null;
}

/**
 * Format holiday name for display
 * Includes "(observed)" suffix if the date is an observed date
 */
export function formatHolidayName(holiday: Holiday): string {
  if (holiday.isObserved) {
    return `${holiday.name} (observed)`;
  }
  return holiday.name;
}

/**
 * Check if a date string (ISO format) is a holiday
 */
export function isHolidayISO(isoDateString: string): Holiday | null {
  if (!isoDateString) return null;
  const date = new Date(isoDateString);
  return isHoliday(date);
}
