import { Component } from '@angular/core';
import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
  shadcnClassStrings,
} from '../../testing/shadcn-parity';
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
} from './calendar';

/**
 * shadcn's react-day-picker classes as Ndop writes them. Its class map
 * becomes one directive per part; modifiers (`range_start`, `today`…)
 * become the cell's data attributes; sides are logical; focus shows with
 * `focus-visible` instead of react-day-picker's `focused` modifier. Week
 * numbers and the month and year dropdowns aren't parts: a template can
 * add them from the calendar's signals. Icons are the user's markup.
 *
 * @param classes - A shadcn class string.
 * @returns The Ndop string, or `null` when dropped.
 */
function ndopClasses(classes: string): string | null {
  const map: Record<string, string | null> = {
    'w-fit':
      'w-fit rtl:**:[[data-slot=calendar-previous]>svg]:rotate-180 rtl:**:[[data-slot=calendar-next]>svg]:rotate-180',
    'rtl:**:[.rdp-button\\_next>svg]:rotate-180': null,
    'rtl:**:[.rdp-button\\_previous>svg]:rotate-180': null,
    'flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium':
      null,
    'relative rounded-md border border-input shadow-xs has-focus:border-ring has-focus:ring-[3px] has-focus:ring-ring/50':
      null,
    'absolute inset-0 bg-popover opacity-0': null,
    'flex h-8 items-center gap-1 rounded-md pr-1 pl-2 text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground':
      null,
    'w-(--cell-size) select-none': null,
    'text-[0.8rem] text-muted-foreground select-none': null,
    'flex size-(--cell-size) items-center justify-center text-center': null,
    'size-4': null,
    '[&:nth-child(2)[data-selected=true]_button]:rounded-l-md': null,
    'group/day relative aspect-square h-full w-full p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-md':
      'group/day relative aspect-square h-full w-full p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-e-md',
    '[&:first-child[data-selected=true]_button]:rounded-l-md':
      '[&:first-child[data-selected=true]_button]:rounded-s-md',
    'rounded-l-md bg-accent':
      'data-range-start:rounded-s-md data-range-start:bg-accent',
    // Kept as `data-range-middle:rounded-none`; mapping this short string
    // would rewrite the longer ones that contain it.
    'rounded-none': null,
    'rounded-r-md bg-accent':
      'data-range-end:rounded-e-md data-range-end:bg-accent',
    'rounded-md bg-accent text-accent-foreground data-[selected=true]:rounded-none':
      'data-today:rounded-md data-today:bg-accent data-today:text-accent-foreground data-today:data-[selected=true]:rounded-none',
    'text-muted-foreground aria-selected:text-muted-foreground':
      'data-outside:text-muted-foreground data-outside:aria-selected:text-muted-foreground',
    'text-muted-foreground opacity-50':
      'data-disabled:text-muted-foreground data-disabled:opacity-50',
    invisible: 'data-hidden:invisible',
  };
  if (classes in map) {
    return map[classes] ?? null;
  }
  if (classes.startsWith('flex aspect-square size-auto')) {
    return classes
      .replace(
        'group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50',
        'focus-visible:relative focus-visible:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
      )
      .replace(
        'data-[range-end=true]:rounded-r-md',
        'data-[range-end=true]:rounded-e-md',
      )
      .replace(
        'data-[range-start=true]:rounded-l-md',
        'data-[range-start=true]:rounded-s-md',
      );
  }
  return classes;
}

describe('Calendar', () => {
  it('matches shadcn new-york-v4 classes, except its documented changes', () => {
    const exceptions = Object.fromEntries(
      shadcnClassStrings('calendar').map((classes) => [
        classes,
        ndopClasses(classes),
      ]),
    );
    expect(
      missingShadcnClasses(
        'calendar',
        registrySource('ui/calendar/calendar.ts'),
        exceptions,
      ),
    ).toEqual([]);
  });

  it('styles its parts and exposes the months to the template', async () => {
    @Component({
      imports: [
        Calendar,
        CalendarMonths,
        CalendarNav,
        CalendarPrevious,
        CalendarNext,
        CalendarMonth,
        CalendarCaption,
        CalendarHeading,
        CalendarGrid,
        CalendarWeekdays,
        CalendarWeekday,
        CalendarWeek,
        CalendarCell,
        CalendarDay,
      ],
      template: `<div
        ndCalendar
        #calendar="ndCalendar"
        [defaultMonth]="start"
        locale="en-US"
      >
        <div ndCalendarMonths>
          <div ndCalendarNav>
            <button ndCalendarPrevious aria-label="Previous month"></button>
            <button ndCalendarNext aria-label="Next month"></button>
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
      </div>`,
    })
    class Host {
      readonly start = new Date(2026, 9, 1);
    }
    await render(Host);
    expect(screen.getByRole('grid', { name: 'October 2026' })).toBeTruthy();
    const day = screen.getByRole('button', {
      name: 'Thursday, October 1, 2026',
    });
    expect(day.getAttribute('data-slot')).toBe('calendar-day');
    expect(day.closest('td')?.getAttribute('data-slot')).toBe('calendar-cell');
  });
});
