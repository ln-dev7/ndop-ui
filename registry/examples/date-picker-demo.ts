import { DatePipe } from '@angular/common';
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
import { DatePickerTrigger } from '@/ui/date-picker/date-picker';
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from '@/ui/popover/popover';

/**
 * A button that opens a calendar to pick a date. Opening focuses the chosen
 * day; picking one closes the popover and returns focus to the button.
 */
@Component({
  selector: 'example-date-picker-demo',
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
    DatePickerTrigger,
    DatePipe,
    NdIcon,
    Popover,
    PopoverContent,
    PopoverPortal,
    PopoverTrigger,
  ],
  template: `
    <ng-container ndPopover [(open)]="open">
      <button ndPopoverTrigger ndDatePickerTrigger [empty]="!date()">
        <svg ndIcon="calendar"></svg>
        {{ date() ? (date() | date: 'longDate') : 'Pick a date' }}
      </button>
      <ng-template ndPopoverPortal>
        <div
          ndPopoverContent
          align="start"
          aria-label="Choose a date"
          class="w-auto p-0"
        >
          <div
            ndCalendar
            #calendar="ndCalendar"
            [(value)]="date"
            (valueChange)="open.set(false)"
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
                        @for (
                          weekday of calendar.weekdays();
                          track weekday.long
                        ) {
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
        </div>
      </ng-template>
    </ng-container>
  `,
})
export class DatePickerDemoExample {
  protected readonly open = signal(false);
  protected readonly date = signal<Date | null>(null);
}
