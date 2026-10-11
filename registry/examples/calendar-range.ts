import { Component, signal } from '@angular/core';
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
  type DateRange,
} from '@/ui/calendar/calendar';

/**
 * Two months side by side to choose a range of days: the first click
 * starts it, the second ends it.
 */
@Component({
  selector: 'example-calendar-range',
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
      mode="range"
      [numberOfMonths]="2"
      [(range)]="range"
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
export class CalendarRangeExample {
  protected readonly range = signal<DateRange>({
    from: new Date(),
    to: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
  });
}
