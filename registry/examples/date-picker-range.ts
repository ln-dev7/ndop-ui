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
  type DateRange,
} from '@/ui/calendar/calendar';
import { DatePickerTrigger } from '@/ui/date-picker/date-picker';
import { PopoverContent } from '@/ui/popover/popover';
import {
  NdPopover as Popover,
  NdPopoverPortal as PopoverPortal,
  NdPopoverTrigger as PopoverTrigger,
} from '@ndop/primitives/popover';

/**
 * A button that opens two months to pick a range of days; it shows both
 * ends once the range is complete.
 */
@Component({
  selector: 'example-date-picker-range',
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
      <button
        ndPopoverTrigger
        ndDatePickerTrigger
        [empty]="!range().from"
        class="w-[300px]"
      >
        <svg ndIcon="calendar"></svg>
        @if (range().from; as from) {
          {{ from | date: 'mediumDate' }}
          @if (range().to; as to) {
            – {{ to | date: 'mediumDate' }}
          }
        } @else {
          Pick a date range
        }
      </button>
      <ng-template ndPopoverPortal>
        <div
          ndPopoverContent
          align="start"
          aria-label="Choose a date range"
          class="w-auto p-0"
        >
          <div
            ndCalendar
            #calendar="ndCalendar"
            mode="range"
            [numberOfMonths]="2"
            [(range)]="range"
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
export class DatePickerRangeExample {
  protected readonly open = signal(false);
  protected readonly range = signal<DateRange>({ from: null, to: null });
}
