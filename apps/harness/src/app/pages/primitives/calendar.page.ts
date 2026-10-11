import { Component, signal } from '@angular/core';
import {
  NdCalendar,
  NdCalendarCell,
  NdCalendarDay,
  NdCalendarGrid,
  NdCalendarHeading,
  NdCalendarMonth,
  NdCalendarNext,
  NdCalendarPrevious,
  NdCalendarWeekday,
} from '@ndop/primitives/calendar';

/**
 * Calendar demo (`/primitives/calendar`): October 2026, weeks from
 * Monday, Sundays disabled, reporting the chosen date.
 */
@Component({
  selector: 'harness-calendar-demo',
  imports: [
    NdCalendar,
    NdCalendarPrevious,
    NdCalendarNext,
    NdCalendarMonth,
    NdCalendarHeading,
    NdCalendarGrid,
    NdCalendarWeekday,
    NdCalendarCell,
    NdCalendarDay,
  ],
  template: `
    <main class="grid justify-items-start gap-4 p-8">
      <h1 class="text-2xl font-semibold">Calendar</h1>
      <div
        ndCalendar
        #calendar="ndCalendar"
        [(value)]="date"
        [defaultMonth]="start"
        [weekStartsOn]="1"
        [disabledDates]="sundays"
        locale="en-US"
        class="grid gap-2 rounded-md border p-3"
      >
        <div class="flex justify-between">
          <button ndCalendarPrevious aria-label="Previous month" [class]="nav">
            ‹
          </button>
          <button ndCalendarNext aria-label="Next month" [class]="nav">
            ›
          </button>
        </div>
        @for (month of calendar.months(); track month.key) {
          <div ndCalendarMonth [month]="month">
            <div ndCalendarHeading class="text-center font-medium">
              {{ month.label }}
            </div>
            <table ndCalendarGrid>
              <thead>
                <tr>
                  @for (weekday of calendar.weekdays(); track weekday.long) {
                    <th ndCalendarWeekday [weekday]="weekday" class="text-xs">
                      {{ weekday.short }}
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (week of month.weeks; track week.key) {
                  <tr>
                    @for (day of week.days; track day.key) {
                      <td ndCalendarCell [day]="day">
                        <button ndCalendarDay [day]="day" [class]="dayClass">
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
      <p data-testid="value">{{ date()?.toDateString() }}</p>
      <button class="rounded-md border px-3 py-1">Next</button>
    </main>
  `,
})
export default class CalendarDemo {
  protected readonly start = new Date(2026, 9, 1);
  protected readonly date = signal<Date | null>(new Date(2026, 9, 14));
  protected readonly sundays = (date: Date) => date.getDay() === 0;
  protected readonly nav = 'rounded-md border px-2';
  protected readonly dayClass =
    'size-8 rounded-md data-[outside]:text-gray-500 data-[selected-single]:bg-black data-[selected-single]:text-white aria-disabled:opacity-40';
}
