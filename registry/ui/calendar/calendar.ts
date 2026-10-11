import { computed, Directive, inject, input } from '@angular/core';
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
import { buttonVariants } from '@/ui/button/button';
import { cn } from '@/lib/utils';

export type {
  NdCalendarDayView as CalendarDayView,
  NdCalendarMode as CalendarMode,
  NdCalendarMonthView as CalendarMonthView,
  NdCalendarWeekdayView as CalendarWeekdayView,
  NdCalendarWeekView as CalendarWeekView,
  NdDateRange as DateRange,
} from '@ndop/primitives/calendar';

/**
 * A calendar (`@ndop/primitives/calendar`): month grids to choose a date,
 * a range or several dates, with the arrow keys moving between days. Its
 * structure is your template: loop over `months()` and `weekdays()`.
 *
 * @example
 * ```html
 * <div ndCalendar #calendar="ndCalendar" [(value)]="date">
 *   <div ndCalendarMonths>
 *     <div ndCalendarNav>…</div>
 *     @for (month of calendar.months(); track month.key) {
 *       <div ndCalendarMonth [month]="month">…</div>
 *     }
 *   </div>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndCalendar]',
  exportAs: 'ndCalendar',
  hostDirectives: [
    {
      directive: NdCalendar,
      inputs: [
        'mode',
        'value',
        'range',
        'values',
        'month',
        'defaultMonth',
        'numberOfMonths',
        'min',
        'max',
        'disabledDates',
        'weekStartsOn',
        'locale',
        'showOutsideDays',
      ],
      outputs: ['valueChange', 'rangeChange', 'valuesChange', 'monthChange'],
    },
  ],
  host: { 'data-slot': 'calendar', '[class]': 'classes()' },
})
export class Calendar {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  private readonly calendar = inject(NdCalendar);

  /** The shown months, with their weeks and days. */
  readonly months = this.calendar.months;

  /** The weekdays, in the order the columns show them. */
  readonly weekdays = this.calendar.weekdays;

  protected readonly classes = computed(() =>
    cn(
      'group/calendar bg-background p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent',
      'w-fit rtl:**:[[data-slot=calendar-previous]>svg]:rotate-180 rtl:**:[[data-slot=calendar-next]>svg]:rotate-180',
      this.class(),
    ),
  );
}

/**
 * The row of shown months, which the navigation buttons sit above.
 *
 * @example
 * ```html
 * <div ndCalendarMonths>…</div>
 * ```
 */
@Directive({
  selector: '[ndCalendarMonths]',
  host: { 'data-slot': 'calendar-months', '[class]': 'classes()' },
})
export class CalendarMonths {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('relative flex flex-col gap-4 md:flex-row', this.class()),
  );
}

/**
 * The bar that holds the previous and next buttons, across the top of the
 * months.
 *
 * @example
 * ```html
 * <div ndCalendarNav>…</div>
 * ```
 */
@Directive({
  selector: '[ndCalendarNav]',
  host: { 'data-slot': 'calendar-nav', '[class]': 'classes()' },
})
export class CalendarNav {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1',
      this.class(),
    ),
  );
}

/** Classes of the previous and next buttons. */
const navButton = 'size-(--cell-size) p-0 select-none aria-disabled:opacity-50';

/**
 * The button that shows the previous month. Name it with `aria-label` and
 * put the chevron icon in it.
 *
 * @example
 * ```html
 * <button ndCalendarPrevious aria-label="Previous month">
 *   <svg ndIcon="chevron-left"></svg>
 * </button>
 * ```
 */
@Directive({
  selector: 'button[ndCalendarPrevious]',
  hostDirectives: [NdCalendarPrevious],
  host: { 'data-slot': 'calendar-previous', '[class]': 'classes()' },
})
export class CalendarPrevious {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(buttonVariants({ variant: 'ghost' }), navButton, this.class()),
  );
}

/**
 * The button that shows the next month. Name it with `aria-label` and put
 * the chevron icon in it.
 *
 * @example
 * ```html
 * <button ndCalendarNext aria-label="Next month">
 *   <svg ndIcon="chevron-right"></svg>
 * </button>
 * ```
 */
@Directive({
  selector: 'button[ndCalendarNext]',
  hostDirectives: [NdCalendarNext],
  host: { 'data-slot': 'calendar-next', '[class]': 'classes()' },
})
export class CalendarNext {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(buttonVariants({ variant: 'ghost' }), navButton, this.class()),
  );
}

/**
 * One shown month: its caption and grid.
 *
 * @example
 * ```html
 * <div ndCalendarMonth [month]="month">…</div>
 * ```
 */
@Directive({
  selector: '[ndCalendarMonth]',
  hostDirectives: [{ directive: NdCalendarMonth, inputs: ['month'] }],
  host: { 'data-slot': 'calendar-month', '[class]': 'classes()' },
})
export class CalendarMonth {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('flex w-full flex-col gap-4', this.class()),
  );
}

/**
 * The row of a month's name, between the navigation buttons.
 *
 * @example
 * ```html
 * <div ndCalendarCaption><div ndCalendarHeading>…</div></div>
 * ```
 */
@Directive({
  selector: '[ndCalendarCaption]',
  host: { 'data-slot': 'calendar-caption', '[class]': 'classes()' },
})
export class CalendarCaption {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)',
      this.class(),
    ),
  );
}

/**
 * A month's name and year, which labels its grid and is announced when the
 * month changes.
 *
 * @example
 * ```html
 * <div ndCalendarHeading>{{ month.label }}</div>
 * ```
 */
@Directive({
  selector: '[ndCalendarHeading]',
  hostDirectives: [NdCalendarHeading],
  host: { 'data-slot': 'calendar-heading', '[class]': 'classes()' },
})
export class CalendarHeading {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('font-medium select-none', 'text-sm', this.class()),
  );
}

/**
 * A month's grid of days, on a `table`.
 *
 * @example
 * ```html
 * <table ndCalendarGrid>…</table>
 * ```
 */
@Directive({
  selector: 'table[ndCalendarGrid]',
  hostDirectives: [NdCalendarGrid],
  host: { 'data-slot': 'calendar-grid', '[class]': 'classes()' },
})
export class CalendarGrid {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('w-full border-collapse', this.class()),
  );
}

/**
 * The row of weekday headers, on a `tr` in the grid's `thead`.
 *
 * @example
 * ```html
 * <tr ndCalendarWeekdays>…</tr>
 * ```
 */
@Directive({
  selector: 'tr[ndCalendarWeekdays]',
  host: { 'data-slot': 'calendar-weekdays', '[class]': 'classes()' },
})
export class CalendarWeekdays {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() => cn('flex', this.class()));
}

/**
 * A weekday's column header, with its full name for screen readers.
 *
 * @example
 * ```html
 * <th ndCalendarWeekday [weekday]="weekday">{{ weekday.short }}</th>
 * ```
 */
@Directive({
  selector: 'th[ndCalendarWeekday]',
  hostDirectives: [{ directive: NdCalendarWeekday, inputs: ['weekday'] }],
  host: { 'data-slot': 'calendar-weekday', '[class]': 'classes()' },
})
export class CalendarWeekday {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex-1 rounded-md text-[0.8rem] font-normal text-muted-foreground select-none',
      this.class(),
    ),
  );
}

/**
 * A week's row of days, on a `tr` in the grid's `tbody`.
 *
 * @example
 * ```html
 * <tr ndCalendarWeek>…</tr>
 * ```
 */
@Directive({
  selector: 'tr[ndCalendarWeek]',
  host: { 'data-slot': 'calendar-week', '[class]': 'classes()' },
})
export class CalendarWeek {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('mt-2 flex w-full', this.class()),
  );
}

/**
 * A day's cell, which shapes the band of a chosen range.
 *
 * @example
 * ```html
 * <td ndCalendarCell [day]="day">…</td>
 * ```
 */
@Directive({
  selector: 'td[ndCalendarCell]',
  hostDirectives: [{ directive: NdCalendarCell, inputs: ['day'] }],
  host: { 'data-slot': 'calendar-cell', '[class]': 'classes()' },
})
export class CalendarCell {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'group/day relative aspect-square h-full w-full p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-e-md',
      '[&:first-child[data-selected=true]_button]:rounded-s-md',
      'data-range-start:rounded-s-md data-range-start:bg-accent',
      'data-range-middle:rounded-none',
      'data-range-end:rounded-e-md data-range-end:bg-accent',
      'data-today:rounded-md data-today:bg-accent data-today:text-accent-foreground data-today:data-[selected=true]:rounded-none',
      'data-outside:text-muted-foreground data-outside:aria-selected:text-muted-foreground',
      'data-disabled:text-muted-foreground data-disabled:opacity-50',
      'data-hidden:invisible',
      this.class(),
    ),
  );
}

/**
 * A day's button: chosen days fill with the primary color, and a range's
 * ends round off its band.
 *
 * @example
 * ```html
 * <button ndCalendarDay [day]="day">{{ day.label }}</button>
 * ```
 */
@Directive({
  selector: 'button[ndCalendarDay]',
  hostDirectives: [{ directive: NdCalendarDay, inputs: ['day'] }],
  host: { 'data-slot': 'calendar-day', '[class]': 'classes()' },
})
export class CalendarDay {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      buttonVariants({ variant: 'ghost', size: 'icon' }),
      'flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal focus-visible:relative focus-visible:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[range-end=true]:rounded-md data-[range-end=true]:rounded-e-md data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:rounded-md data-[range-start=true]:rounded-s-md data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground dark:hover:text-accent-foreground [&>span]:text-xs [&>span]:opacity-70',
      this.class(),
    ),
  );
}
