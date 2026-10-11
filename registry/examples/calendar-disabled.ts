import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  Calendar,
  CalendarCaption,
  CalendarCell,
  CalendarDay,
  CalendarGrid,
  CalendarHeading,
  CalendarMonth,
  CalendarMonths,
  CalendarNav,
  CalendarNext,
  CalendarPrevious,
  CalendarWeek,
  CalendarWeekday,
  CalendarWeekdays,
} from '@/ui/calendar/calendar';

/**
 * Weekends and past days that can't be chosen. They stay focusable, so
 * the arrow keys move across them.
 */
@Component({
  selector: 'example-calendar-disabled',
  imports: [
    Calendar,
    CalendarCaption,
    CalendarCell,
    CalendarDay,
    CalendarGrid,
    CalendarHeading,
    CalendarMonth,
    CalendarMonths,
    CalendarNav,
    CalendarNext,
    CalendarPrevious,
    CalendarWeek,
    CalendarWeekday,
    CalendarWeekdays,
    NdIcon,
  ],
  template: `
    <div
      ndCalendar
      #calendar="ndCalendar"
      [min]="today"
      [disabledDates]="weekends"
      class="rounded-md border shadow-sm"
    >
      <div ndCalendarMonths>
        <div ndCalendarNav>
          <button ndCalendarPrevious aria-label="Previous month">
            <svg ndIcon="chevron-left"></svg>
          </button>
          <button ndCalendarNext aria-label="Next month">
            <svg ndIcon="chevron-right"></svg>
          </button>
        </div>
        @for (month of calendar.months(); track month.key) {
          <div ndCalendarMonth [month]="month">
            <div ndCalendarCaption>
              <div ndCalendarHeading>{{ month.label }}</div>
            </div>
            <table ndCalendarGrid>
              <thead>
                <tr ndCalendarWeekdays>
                  @for (weekday of calendar.weekdays(); track weekday.long) {
                    <th ndCalendarWeekday [weekday]="weekday">
                      {{ weekday.short }}
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (week of month.weeks; track week.key) {
                  <tr ndCalendarWeek>
                    @for (day of week.days; track day.key) {
                      <td ndCalendarCell [day]="day">
                        <button ndCalendarDay [day]="day">
                          {{ day.label }}
                        </button>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
})
export class CalendarDisabledExample {
  protected readonly today = new Date();
  protected readonly weekends = (date: Date) =>
    date.getDay() === 0 || date.getDay() === 6;
}
