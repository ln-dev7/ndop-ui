/**
 * The date at local midnight, so dates compare by day.
 *
 * @param date - Any time on the day.
 * @returns The day at 00:00 local time.
 */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * The first day of a date's month.
 *
 * @param date - Any day in the month.
 * @returns The 1st of the month.
 */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * A date some days away, keeping local midnight across DST changes.
 *
 * @param date - The start.
 * @param days - How many days to add; negative goes back.
 * @returns The new date.
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * The same day some months away, or the month's last day when it's
 * shorter, as from January 31 to February 28.
 *
 * @param date - The start.
 * @param months - How many months to add; negative goes back.
 * @returns The new date.
 */
export function addMonths(date: Date, months: number): Date {
  const first = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  return new Date(
    first.getFullYear(),
    first.getMonth(),
    Math.min(date.getDate(), last.getDate()),
  );
}

/**
 * Whether two dates fall on the same day.
 *
 * @param a - A date, or nothing.
 * @param b - Another date, or nothing.
 * @returns `true` when both are on the same day.
 */
export function isSameDay(a: Date | null, b: Date | null): boolean {
  return (
    !!a &&
    !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Whether two dates fall in the same month.
 *
 * @param a - A date.
 * @param b - Another date.
 * @returns `true` when both are in the same month of the same year.
 */
export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/**
 * The first day of a date's week.
 *
 * @param date - Any day in the week.
 * @param weekStartsOn - The first weekday, 0 for Sunday to 6 for Saturday.
 * @returns That week's first day.
 */
export function startOfWeek(date: Date, weekStartsOn: number): Date {
  return addDays(date, -((date.getDay() - weekStartsOn + 7) % 7));
}

/**
 * A day's key, stable across renders: `2026-10-11`.
 *
 * @param date - The day.
 * @returns Its key.
 */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * The locale's first day of the week, from `Intl`, or Sunday where the
 * browser can't tell.
 *
 * @param locale - A BCP 47 locale, such as `fr-FR`.
 * @returns 0 for Sunday to 6 for Saturday.
 */
export function localeWeekStart(locale: string): number {
  try {
    const info = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const firstDay = (info.getWeekInfo?.() ?? info.weekInfo)?.firstDay;
    // Intl numbers days 1 (Monday) to 7 (Sunday).
    return firstDay === undefined ? 0 : firstDay % 7;
  } catch {
    return 0;
  }
}
