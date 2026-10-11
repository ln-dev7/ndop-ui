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
} from '@/ui/calendar/calendar';

/**
 * Month and weekday names in French, with weeks from Monday, as French
 * calendars start them. Names and labels come from Intl.
 */
@Component({
  selector: 'example-calendar-locale',
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
      locale="fr-FR"
      [(value)]="date"
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
export class CalendarLocaleExample {
  protected readonly date = signal<Date | null>(null);
}
