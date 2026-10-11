import {
  afterNextRender,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  forwardRef,
  inject,
  InjectionToken,
  Injector,
  input,
  LOCALE_ID,
  model,
  numberAttribute,
  signal,
  type OnInit,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { injectId, isRtl } from '@ndop/primitives/internal';
import {
  addDays,
  addMonths,
  dayKey,
  isSameDay,
  isSameMonth,
  localeWeekStart,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from './dates';

/** How a calendar chooses dates. */
export type NdCalendarMode = 'single' | 'range' | 'multiple';

/** A span of days; `to` is `null` until the second day is chosen. */
export interface NdDateRange {
  /** The first day. */
  from: Date | null;
  /** The last day, included. */
  to: Date | null;
}

/** One day of a shown month's grid. */
export interface NdCalendarDayView {
  /** The day, at local midnight. */
  readonly date: Date;
  /** A stable key, such as `2026-10-11`. */
  readonly key: string;
  /** The day of the month, formatted for the locale. */
  readonly label: string;
  /** Whether it belongs to the month before or after. */
  readonly outside: boolean;
}

/** One row of a month's grid. */
export interface NdCalendarWeekView {
  /** A stable key: its first day's. */
  readonly key: string;
  /** Its seven days. */
  readonly days: readonly NdCalendarDayView[];
}

/** One shown month. */
export interface NdCalendarMonthView {
  /** A stable key, such as `2026-10`. */
  readonly key: string;
  /** Its first day. */
  readonly date: Date;
  /** Its name and year, formatted for the locale. */
  readonly label: string;
  /** Its weeks, from the one with its first day to the one with its last. */
  readonly weeks: readonly NdCalendarWeekView[];
}

/** A weekday's names, for column headers. */
export interface NdCalendarWeekdayView {
  /** The short name, such as `Mon`. */
  readonly short: string;
  /** The narrow name, such as `M`. */
  readonly narrow: string;
  /** The full name, such as `Monday`. */
  readonly long: string;
}

/** The enclosing {@link NdCalendar}, injected by its parts. */
export const ND_CALENDAR = new InjectionToken<NdCalendar>('ND_CALENDAR');

/** The enclosing {@link NdCalendarMonth}, injected by its parts. */
export const ND_CALENDAR_MONTH = new InjectionToken<NdCalendarMonth>(
  'ND_CALENDAR_MONTH',
);

/** The enclosing {@link NdCalendarCell}, injected by its day. */
const ND_CALENDAR_CELL = new InjectionToken<NdCalendarCell>('ND_CALENDAR_CELL');

/**
 * Turns a date input into a day at local midnight.
 *
 * @param value - A date, or nothing.
 * @returns The day, or `null`.
 */
function toDay(value: Date | null | undefined): Date | null {
  return value ? startOfDay(value) : null;
}

/**
 * A calendar: month grids to choose a date, a range or several dates, on
 * the WAI-ARIA date grid pattern with a roving tabindex. Its structure is
 * the user's template, looping over {@link NdCalendar.months} and
 * {@link NdCalendar.weekdays}; dates use `Date` and `Intl` only. It owns
 * its value, so it's a `ControlValueAccessor` that Signal Forms
 * (`[formField]`), reactive and template-driven forms bind (ADR-0004,
 * amendments 1 and 4): a `Date` in `single` mode, an {@link NdDateRange}
 * in `range` mode, a list of dates in `multiple` mode.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/
 *
 * @example
 * ```html
 * <div ndCalendar #calendar="ndCalendar" [(value)]="date">…</div>
 * ```
 */
@Directive({
  selector: '[ndCalendar]',
  exportAs: 'ndCalendar',
  providers: [
    { provide: ND_CALENDAR, useExisting: NdCalendar },
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NdCalendar),
      multi: true,
    },
  ],
  host: {
    '[attr.data-mode]': 'mode()',
    '(focusout)': 'leave($event)',
  },
})
export class NdCalendar implements ControlValueAccessor {
  /** How it chooses dates. */
  readonly mode = input<NdCalendarMode>('single');

  /** The chosen date in `single` mode. Two-way bindable with `[(value)]`. */
  readonly value = model<Date | null>(null);

  /** The chosen days in `range` mode. Two-way bindable with `[(range)]`. */
  readonly range = model<NdDateRange>({ from: null, to: null });

  /** The chosen dates in `multiple` mode. Two-way bindable with `[(values)]`. */
  readonly values = model<readonly Date[]>([]);

  /** The first month shown. Two-way bindable with `[(month)]`. */
  readonly month = model<Date | null>(null);

  /** The first month shown when `month` isn't bound. */
  readonly defaultMonth = input<Date | null>(null);

  /** How many months show side by side. */
  readonly numberOfMonths = input(1, { transform: numberAttribute });

  /** The earliest day that can be chosen. */
  readonly min = input<Date | null>(null);

  /** The latest day that can be chosen. */
  readonly max = input<Date | null>(null);

  /** Disables days it returns `true` for, such as weekends. */
  readonly disabledDates = input<((date: Date) => boolean) | null>(null);

  /** The first weekday, 0 for Sunday; defaults to the locale's. */
  readonly weekStartsOn = input<number | null, unknown>(null, {
    transform: (value: unknown) =>
      value === null || value === undefined || value === ''
        ? null
        : numberAttribute(value),
  });

  /** The locale for names and labels; defaults to the app's `LOCALE_ID`. */
  readonly locale = input(inject(LOCALE_ID));

  /** Shows the neighboring months' days that fill the first and last weeks. */
  readonly showOutsideDays = input(true, { transform: booleanAttribute });

  /** Today, at local midnight. */
  readonly today = startOfDay(new Date());

  private readonly focusedDate = signal<Date | null>(null);
  private readonly dayElements = new Map<string, HTMLElement>();
  private readonly injector = inject(Injector);
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private onChange: (value: unknown) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  /** The first weekday in use. */
  readonly firstWeekday = computed(
    () => this.weekStartsOn() ?? localeWeekStart(this.locale()),
  );

  /** The first shown month's first day. */
  readonly firstMonth = computed(() =>
    startOfMonth(
      this.month() ??
        this.defaultMonth() ??
        this.selectedAnchor() ??
        this.today,
    ),
  );

  /** The weekdays, in the order the columns show them. */
  readonly weekdays = computed<readonly NdCalendarWeekdayView[]>(() => {
    const locale = this.locale();
    const format = (weekday: 'short' | 'narrow' | 'long') =>
      new Intl.DateTimeFormat(locale, { weekday });
    const start = startOfWeek(this.today, this.firstWeekday());
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index);
      return {
        short: format('short').format(date),
        narrow: format('narrow').format(date),
        long: format('long').format(date),
      };
    });
  });

  /** The shown months, with their weeks and days. */
  readonly months = computed<readonly NdCalendarMonthView[]>(() => {
    const locale = this.locale();
    const monthLabel = new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    });
    const dayLabel = new Intl.DateTimeFormat(locale, { day: 'numeric' });
    const firstWeekday = this.firstWeekday();
    return Array.from({ length: this.numberOfMonths() }, (_, index) => {
      const first = addMonths(this.firstMonth(), index);
      const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
      const weeks: NdCalendarWeekView[] = [];
      for (
        let start = startOfWeek(first, firstWeekday);
        start <= last;
        start = addDays(start, 7)
      ) {
        const days = Array.from({ length: 7 }, (_, offset) => {
          const date = addDays(start, offset);
          return {
            date,
            key: dayKey(date),
            label: dayLabel.format(date),
            outside: !isSameMonth(date, first),
          };
        });
        weeks.push({ key: dayKey(start), days });
      }
      return {
        key: dayKey(first).slice(0, 7),
        date: first,
        label: monthLabel.format(first),
        weeks,
      };
    });
  });

  /** The day in the tab order. */
  readonly tabStop = computed(() => {
    const shown = (date: Date | null) =>
      date && this.months().some((month) => isSameMonth(month.date, date))
        ? date
        : null;
    return (
      shown(this.focusedDate()) ??
      shown(this.selectedAnchor()) ??
      shown(this.today) ??
      this.firstMonth()
    );
  });

  /** Whether the month before the first shown can be shown. */
  readonly canGoBack = computed(() => {
    const min = toDay(this.min());
    return !min || addDays(this.firstMonth(), -1) >= min;
  });

  /** Whether the month after the last shown can be shown. */
  readonly canGoForward = computed(() => {
    const max = toDay(this.max());
    const next = addMonths(this.firstMonth(), this.numberOfMonths());
    return !max || next <= max;
  });

  /**
   * Whether a day is chosen.
   *
   * @param date - The day.
   * @returns `true` when it is.
   */
  isSelected(date: Date): boolean {
    switch (this.mode()) {
      case 'single':
        return isSameDay(this.value(), date);
      case 'multiple':
        return this.values().some((other) => isSameDay(other, date));
      case 'range': {
        const { from, to } = this.range();
        if (from && to) {
          const day = date.getTime();
          return (
            day >= startOfDay(from).getTime() && day <= startOfDay(to).getTime()
          );
        }
        return isSameDay(from, date);
      }
    }
  }

  /**
   * Where a day sits in the chosen range, in `range` mode.
   *
   * @param date - The day.
   * @returns `start`, `middle`, `end`, or `null` outside the range.
   */
  rangePosition(date: Date): 'start' | 'middle' | 'end' | null {
    if (this.mode() !== 'range' || !this.isSelected(date)) {
      return null;
    }
    const { from, to } = this.range();
    if (isSameDay(from, date)) {
      return 'start';
    }
    return isSameDay(to, date) ? 'end' : 'middle';
  }

  /**
   * Whether a day can't be chosen: before `min`, after `max`, or one
   * `disabledDates` rules out.
   *
   * @param date - The day.
   * @returns `true` when it can't.
   */
  isDisabled(date: Date): boolean {
    const min = toDay(this.min());
    const max = toDay(this.max());
    return (
      (!!min && date < min) ||
      (!!max && date > max) ||
      !!this.disabledDates()?.(date)
    );
  }

  /**
   * Chooses a day, as the mode says: replaces the date, extends or
   * restarts the range, or adds or removes the date. Choosing an outside
   * day shows its month.
   *
   * @param date - The day.
   */
  choose(date: Date): void {
    if (this.isDisabled(date)) {
      return;
    }
    this.focusedDate.set(date);
    this.show(date);
    switch (this.mode()) {
      case 'single':
        this.value.set(date);
        this.onChange(date);
        break;
      case 'multiple': {
        const values = this.values();
        const next = values.some((other) => isSameDay(other, date))
          ? values.filter((other) => !isSameDay(other, date))
          : [...values, date];
        this.values.set(next);
        this.onChange(next);
        break;
      }
      case 'range': {
        const { from, to } = this.range();
        const next: NdDateRange =
          !from || to || date < startOfDay(from)
            ? { from: date, to: null }
            : { from, to: date };
        this.range.set(next);
        this.onChange(next);
        break;
      }
    }
  }

  /**
   * Shows the months before or after.
   *
   * @param step - `-1` for the previous month, `1` for the next.
   */
  page(step: -1 | 1): void {
    if (step < 0 ? this.canGoBack() : this.canGoForward()) {
      this.month.set(addMonths(this.firstMonth(), step));
    }
  }

  /**
   * Adds a day button, so the keyboard can focus it.
   *
   * @param key - The day's key.
   * @param element - The button.
   * @returns A function that removes it.
   */
  registerDay(key: string, element: HTMLElement): () => void {
    this.dayElements.set(key, element);
    return () => {
      if (this.dayElements.get(key) === element) {
        this.dayElements.delete(key);
      }
    };
  }

  /**
   * Records that a day received focus, so it stays the tab stop.
   *
   * @param date - The day.
   */
  focused(date: Date): void {
    this.focusedDate.set(date);
  }

  /**
   * Moves focus for the date grid keys, changing months when the new day
   * isn't shown, and chooses the focused day for `Enter` and `Space`.
   *
   * @param event - The keydown event.
   * @param from - The day it was pressed on.
   */
  keydown(event: KeyboardEvent, from: Date): void {
    const forward = isRtl(this.element) ? -1 : 1;
    let target: Date;
    switch (event.key) {
      case 'ArrowRight':
        target = addDays(from, forward);
        break;
      case 'ArrowLeft':
        target = addDays(from, -forward);
        break;
      case 'ArrowDown':
        target = addDays(from, 7);
        break;
      case 'ArrowUp':
        target = addDays(from, -7);
        break;
      case 'Home':
        target = startOfWeek(from, this.firstWeekday());
        break;
      case 'End':
        target = addDays(startOfWeek(from, this.firstWeekday()), 6);
        break;
      case 'PageDown':
        target = addMonths(from, event.shiftKey ? 12 : 1);
        break;
      case 'PageUp':
        target = addMonths(from, event.shiftKey ? -12 : -1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.choose(from);
        return;
      default:
        return;
    }
    event.preventDefault();
    this.moveFocus(this.clamp(target));
  }

  /**
   * Sets the chosen value from a forms library.
   *
   * @param value - A date, a range or a list of dates, by mode.
   */
  writeValue(value: unknown): void {
    switch (this.mode()) {
      case 'single':
        this.value.set(value instanceof Date ? startOfDay(value) : null);
        break;
      case 'multiple':
        this.values.set(
          Array.isArray(value)
            ? value.filter((date) => date instanceof Date).map(startOfDay)
            : [],
        );
        break;
      case 'range': {
        const range = (value ?? {}) as Partial<NdDateRange>;
        this.range.set({ from: toDay(range.from), to: toDay(range.to) });
        break;
      }
    }
  }

  /**
   * Registers the forms library's change callback.
   *
   * @param fn - Called with the new value on user changes.
   */
  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  /**
   * Registers the forms library's touched callback.
   *
   * @param fn - Called when focus leaves the calendar.
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * Marks a bound field touched when focus leaves the calendar.
   *
   * @param event - The focusout event.
   */
  protected leave(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (!(next instanceof Node && this.element.contains(next))) {
      this.onTouched();
    }
  }

  /**
   * The chosen day that decides the month shown first.
   *
   * @returns The day, or `null` when nothing is chosen.
   */
  private selectedAnchor(): Date | null {
    switch (this.mode()) {
      case 'single':
        return toDay(this.value());
      case 'multiple':
        return toDay(this.values()[0]);
      case 'range':
        return toDay(this.range().from);
    }
  }

  /**
   * Keeps a day within `min` and `max`.
   *
   * @param date - The day.
   * @returns The day, or the bound it passed.
   */
  private clamp(date: Date): Date {
    const min = toDay(this.min());
    const max = toDay(this.max());
    if (min && date < min) {
      return min;
    }
    return max && date > max ? max : date;
  }

  /**
   * Shows a day's month if it isn't shown, and otherwise keeps the shown
   * months where they are, even when `month` was never set: choosing a
   * day must not move the view.
   *
   * @param date - The day.
   */
  private show(date: Date): void {
    const first = this.firstMonth();
    const count = this.numberOfMonths();
    const index = (day: Date) => day.getFullYear() * 12 + day.getMonth();
    const offset = index(date) - index(first);
    if (offset < 0) {
      this.month.set(startOfMonth(date));
    } else if (offset >= count) {
      this.month.set(addMonths(startOfMonth(date), 1 - count));
    } else if (this.month() === null) {
      this.month.set(first);
    }
  }

  /**
   * Focuses a day, showing its month first if needed.
   *
   * @param date - The day.
   */
  private moveFocus(date: Date): void {
    this.show(date);
    this.focusedDate.set(date);
    const key = dayKey(date);
    const element = this.dayElements.get(key);
    if (element) {
      element.focus();
      return;
    }
    // A new month's buttons exist only after the next render.
    afterNextRender(() => this.dayElements.get(key)?.focus(), {
      injector: this.injector,
    });
  }
}

/**
 * The button that shows the previous month. Name it with `aria-label`.
 *
 * @example
 * ```html
 * <button ndCalendarPrevious aria-label="Previous month">‹</button>
 * ```
 */
@Directive({
  selector: 'button[ndCalendarPrevious]',
  host: {
    type: 'button',
    '[attr.aria-disabled]': 'calendar.canGoBack() ? null : "true"',
    '[attr.data-disabled]': 'calendar.canGoBack() ? null : ""',
    '(click)': 'calendar.page(-1)',
  },
})
export class NdCalendarPrevious {
  protected readonly calendar = inject(ND_CALENDAR);
}

/**
 * The button that shows the next month. Name it with `aria-label`.
 *
 * @example
 * ```html
 * <button ndCalendarNext aria-label="Next month">›</button>
 * ```
 */
@Directive({
  selector: 'button[ndCalendarNext]',
  host: {
    type: 'button',
    '[attr.aria-disabled]': 'calendar.canGoForward() ? null : "true"',
    '[attr.data-disabled]': 'calendar.canGoForward() ? null : ""',
    '(click)': 'calendar.page(1)',
  },
})
export class NdCalendarNext {
  protected readonly calendar = inject(ND_CALENDAR);
}

/**
 * One shown month: wraps its heading and grid.
 *
 * @example
 * ```html
 * <div ndCalendarMonth [month]="month">…</div>
 * ```
 */
@Directive({
  selector: '[ndCalendarMonth]',
  providers: [{ provide: ND_CALENDAR_MONTH, useExisting: NdCalendarMonth }],
})
export class NdCalendarMonth {
  /** The month, from {@link NdCalendar.months}. */
  readonly month = input.required<NdCalendarMonthView>();

  /** Id of its heading, which labels its grid. */
  readonly headingId = injectId('nd-calendar-heading');
}

/**
 * Its month's name and year: a polite live region, so changing months is
 * announced, and the label of its grid.
 *
 * @example
 * ```html
 * <div ndCalendarHeading>{{ month.label }}</div>
 * ```
 */
@Directive({
  selector: '[ndCalendarHeading]',
  host: { '[id]': 'month.headingId', 'aria-live': 'polite' },
})
export class NdCalendarHeading {
  protected readonly month = inject(ND_CALENDAR_MONTH);
}

/**
 * Its month's grid of days (`role="grid"`), on a native `table`.
 *
 * @example
 * ```html
 * <table ndCalendarGrid>…</table>
 * ```
 */
@Directive({
  selector: 'table[ndCalendarGrid]',
  host: {
    role: 'grid',
    '[attr.aria-labelledby]': 'month.headingId',
    '[attr.aria-multiselectable]':
      'calendar.mode() === "single" ? null : "true"',
  },
})
export class NdCalendarGrid {
  protected readonly month = inject(ND_CALENDAR_MONTH);
  protected readonly calendar = inject(ND_CALENDAR);
}

/**
 * A weekday's column header, with the full name in `abbr`.
 *
 * @example
 * ```html
 * <th ndCalendarWeekday [weekday]="weekday">{{ weekday.short }}</th>
 * ```
 */
@Directive({
  selector: 'th[ndCalendarWeekday]',
  host: { scope: 'col', '[attr.abbr]': 'weekday().long' },
})
export class NdCalendarWeekday {
  /** The weekday, from {@link NdCalendar.weekdays}. */
  readonly weekday = input.required<NdCalendarWeekdayView>();
}

/**
 * A day's cell (`role="gridcell"`), on a native `td`, with
 * `aria-selected` when the day is chosen. Its data attributes repeat its
 * day's state, for styling.
 *
 * @example
 * ```html
 * <td ndCalendarCell [day]="day">…</td>
 * ```
 */
@Directive({
  selector: 'td[ndCalendarCell]',
  providers: [{ provide: ND_CALENDAR_CELL, useExisting: NdCalendarCell }],
  host: {
    role: 'gridcell',
    '[attr.aria-selected]': 'hidden() ? null : selected()',
    '[attr.data-selected]': 'selected() || null',
    '[attr.data-today]': 'today() || null',
    '[attr.data-outside]': 'day().outside || null',
    '[attr.data-hidden]': 'hidden() || null',
    '[attr.data-disabled]': 'disabled() || null',
    '[attr.data-range-start]': 'range() === "start" || null',
    '[attr.data-range-middle]': 'range() === "middle" || null',
    '[attr.data-range-end]': 'range() === "end" || null',
  },
})
export class NdCalendarCell {
  /** The day, from a week of {@link NdCalendar.months}. */
  readonly day = input.required<NdCalendarDayView>();

  /** The calendar it belongs to. */
  readonly calendar = inject(ND_CALENDAR);

  /** Whether its day is chosen. */
  readonly selected = computed(() => this.calendar.isSelected(this.day().date));

  /** Whether its day is today. */
  readonly today = computed(() =>
    isSameDay(this.day().date, this.calendar.today),
  );

  /** Whether its day can't be chosen. */
  readonly disabled = computed(() => this.calendar.isDisabled(this.day().date));

  /** Its day's place in the chosen range. */
  readonly range = computed(() => this.calendar.rangePosition(this.day().date));

  /** Whether it's an outside day that isn't shown. */
  readonly hidden = computed(
    () => this.day().outside && !this.calendar.showOutsideDays(),
  );
}

/**
 * A day's button, labelled with the full date. Only one day is in the tab
 * order; the date grid keys move focus. Hidden outside days render nothing
 * clickable: the button gets `hidden`.
 *
 * @example
 * ```html
 * <button ndCalendarDay [day]="day">{{ day.label }}</button>
 * ```
 */
@Directive({
  selector: 'button[ndCalendarDay]',
  host: {
    type: 'button',
    '[attr.aria-label]': 'label()',
    '[attr.aria-current]': 'cell.today() ? "date" : null',
    '[attr.aria-disabled]': 'cell.disabled() || null',
    '[attr.tabindex]': 'tabIndex()',
    // An overlay holding the calendar, such as a date picker's popover,
    // focuses this day first.
    '[attr.cdkFocusInitial]': 'tabIndex() === 0 ? "" : null',
    '[attr.hidden]': 'cell.hidden() ? "" : null',
    '[attr.data-day]': 'day().key',
    '[attr.data-selected-single]': 'selectedSingle() || null',
    '[attr.data-range-start]': 'cell.range() === "start" || null',
    '[attr.data-range-middle]': 'cell.range() === "middle" || null',
    '[attr.data-range-end]': 'cell.range() === "end" || null',
    '[attr.data-today]': 'cell.today() || null',
    '[attr.data-outside]': 'day().outside || null',
    '[attr.data-disabled]': 'cell.disabled() || null',
    '(click)': 'calendar.choose(day().date)',
    '(focus)': 'calendar.focused(day().date)',
    '(keydown)': 'calendar.keydown($event, day().date)',
  },
})
export class NdCalendarDay implements OnInit {
  /** The day, from a week of {@link NdCalendar.months}. */
  readonly day = input.required<NdCalendarDayView>();

  protected readonly cell = inject(ND_CALENDAR_CELL);
  protected readonly calendar = inject(ND_CALENDAR);
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  protected readonly label = computed(() =>
    new Intl.DateTimeFormat(this.calendar.locale(), {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(this.day().date),
  );

  protected readonly tabIndex = computed(() =>
    !this.day().outside && isSameDay(this.calendar.tabStop(), this.day().date)
      ? 0
      : -1,
  );

  /** Whether it's the chosen day of a single date, not part of a range. */
  protected readonly selectedSingle = computed(
    () => this.cell.selected() && this.cell.range() === null,
  );

  ngOnInit(): void {
    // Outside days repeat a neighboring month's dates; the keyboard focuses
    // the month's own.
    if (!this.day().outside) {
      this.destroyRef.onDestroy(
        this.calendar.registerDay(this.day().key, this.element),
      );
    }
  }
}
