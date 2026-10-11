import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
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
  type NdCalendarMode,
  type NdDateRange,
} from './calendar';
import { addMonths, localeWeekStart, startOfWeek } from './dates';

const PARTS = [
  NdCalendar,
  NdCalendarPrevious,
  NdCalendarNext,
  NdCalendarMonth,
  NdCalendarHeading,
  NdCalendarGrid,
  NdCalendarWeekday,
  NdCalendarCell,
  NdCalendarDay,
];

@Component({
  imports: PARTS,
  template: `
    <div
      [attr.dir]="dir()"
      ndCalendar
      #calendar="ndCalendar"
      [mode]="mode()"
      [(value)]="value"
      [(range)]="range"
      [(values)]="values"
      [defaultMonth]="start"
      [weekStartsOn]="1"
      [numberOfMonths]="months()"
      [min]="min()"
      [disabledDates]="weekends"
      locale="en-US"
    >
      <button ndCalendarPrevious aria-label="Previous month">‹</button>
      <button ndCalendarNext aria-label="Next month">›</button>
      @for (month of calendar.months(); track month.key) {
        <div ndCalendarMonth [month]="month">
          <div ndCalendarHeading>{{ month.label }}</div>
          <table ndCalendarGrid>
            <thead>
              <tr>
                @for (weekday of calendar.weekdays(); track weekday.long) {
                  <th ndCalendarWeekday [weekday]="weekday">
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
                      <button ndCalendarDay [day]="day">{{ day.label }}</button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
class Host {
  readonly start = new Date(2026, 9, 1);
  readonly mode = signal<NdCalendarMode>('single');
  readonly value = signal<Date | null>(null);
  readonly range = signal<NdDateRange>({ from: null, to: null });
  readonly values = signal<readonly Date[]>([]);
  readonly months = signal(1);
  readonly min = signal<Date | null>(null);
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly weekends = (date: Date) => date.getDay() === 0;
}

async function setup() {
  const view = await render(Host);
  const host = view.fixture.componentInstance;
  const settle = async () => {
    await view.fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await view.fixture.whenStable();
  };
  // Outside days repeat a neighboring month's dates; tests use the month's.
  const day = (label: string, year = 2026) => {
    const matches = screen
      .getAllByRole('button', { name: new RegExp(`^\\w+, ${label}, ${year}$`) })
      .filter((button) => !button.hasAttribute('data-outside'));
    if (matches.length !== 1) {
      throw new Error(`${matches.length} buttons for ${label}, ${year}`);
    }
    return matches[0] as HTMLElement;
  };
  const press = async (key: string, init: KeyboardEventInit = {}) => {
    fireEvent.keyDown(document.activeElement as HTMLElement, { key, ...init });
    await settle();
  };
  return { view, host, settle, day, press };
}

describe('NdCalendar', () => {
  // Today would otherwise take the tab stop when the tests run in October
  // 2026; faking only the date leaves timers alone.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 15));
  });
  afterEach(() => vi.useRealTimers());

  it('renders a labelled grid of the month with full-date day buttons', async () => {
    const { day } = await setup();
    const grid = screen.getByRole('grid', { name: 'October 2026' });
    expect(grid.hasAttribute('aria-multiselectable')).toBe(false);
    const headers = screen.getAllByRole('columnheader');
    expect(headers[0]?.getAttribute('abbr')).toBe('Monday');
    expect(headers[0]?.textContent?.trim()).toBe('Mon');
    const first = day('October 1');
    expect(first.getAttribute('aria-label')).toBe('Thursday, October 1, 2026');
    expect(first.getAttribute('tabindex')).toBe('0');
    expect(
      screen
        .getAllByRole('button')
        .filter((button) => button.getAttribute('tabindex') === '0'),
    ).toHaveLength(1);
  });

  it('chooses a day on click and marks its cell selected', async () => {
    const { host, day, settle } = await setup();
    fireEvent.click(day('October 14'));
    await settle();
    expect(host.value()).toEqual(new Date(2026, 9, 14));
    const cell = day('October 14').closest('td');
    expect(cell?.getAttribute('aria-selected')).toBe('true');
    expect(day('October 14').hasAttribute('data-selected-single')).toBe(true);
    expect(day('October 14').getAttribute('tabindex')).toBe('0');
  });

  it('keeps disabled days focusable but unchoosable', async () => {
    const { host, day, settle } = await setup();
    const sunday = day('October 4');
    expect(sunday.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(sunday);
    await settle();
    expect(host.value()).toBeNull();
  });

  it('moves focus with the date grid keys, across months', async () => {
    const { host, day, press, settle } = await setup();
    fireEvent.click(day('October 14'));
    await settle();
    day('October 14').focus();
    await press('ArrowRight');
    expect(document.activeElement).toBe(day('October 15'));
    await press('ArrowDown');
    expect(document.activeElement).toBe(day('October 22'));
    await press('Home');
    expect(document.activeElement).toBe(day('October 19'));
    await press('End');
    expect(document.activeElement).toBe(day('October 25'));
    await press('PageDown');
    expect(screen.getByRole('grid', { name: 'November 2026' })).toBeTruthy();
    expect(document.activeElement).toBe(day('November 25'));
    await press('PageUp', { shiftKey: true });
    expect(screen.getByRole('grid', { name: 'November 2025' })).toBeTruthy();
    expect(document.activeElement).toBe(day('November 25', 2025));
    expect(host.value()).toEqual(new Date(2026, 9, 14));
  });

  it('chooses the focused day with Enter', async () => {
    const { host, day, press } = await setup();
    day('October 1').focus();
    await press('Enter');
    expect(host.value()).toEqual(new Date(2026, 9, 1));
  });

  it('mirrors the horizontal arrows in right-to-left layouts', async () => {
    const { host, day, press, settle } = await setup();
    host.dir.set('rtl');
    await settle();
    day('October 14').focus();
    await press('ArrowLeft');
    expect(document.activeElement).toBe(day('October 15'));
  });

  it('pages months and stops at min', async () => {
    const { host, settle } = await setup();
    host.min.set(new Date(2026, 9, 5));
    await settle();
    const previous = screen.getByRole('button', { name: 'Previous month' });
    expect(previous.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(previous);
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    await settle();
    expect(screen.getByRole('grid', { name: 'November 2026' })).toBeTruthy();
  });

  it('chooses a range across two months without moving the view', async () => {
    const { host, day, settle } = await setup();
    host.mode.set('range');
    host.months.set(2);
    await settle();
    fireEvent.click(day('October 28'));
    await settle();
    fireEvent.click(day('November 3'));
    await settle();
    expect(host.range()).toEqual({
      from: new Date(2026, 9, 28),
      to: new Date(2026, 10, 3),
    });
    expect(screen.getByRole('grid', { name: 'October 2026' })).toBeTruthy();
    const middle = day('October 30').closest('td');
    expect(middle?.hasAttribute('data-range-middle')).toBe(true);
    expect(day('October 28').hasAttribute('data-range-start')).toBe(true);
    expect(day('November 3').hasAttribute('data-range-end')).toBe(true);
  });

  it('toggles dates in multiple mode', async () => {
    const { host, day, settle } = await setup();
    host.mode.set('multiple');
    await settle();
    expect(screen.getByRole('grid').getAttribute('aria-multiselectable')).toBe(
      'true',
    );
    fireEvent.click(day('October 6'));
    fireEvent.click(day('October 8'));
    fireEvent.click(day('October 6'));
    await settle();
    expect(host.values()).toEqual([new Date(2026, 9, 8)]);
  });

  it('binds reactive forms', async () => {
    @Component({
      imports: [...PARTS, ReactiveFormsModule],
      template: `
        <div
          ndCalendar
          #calendar="ndCalendar"
          [formControl]="control"
          locale="en-US"
        >
          @for (month of calendar.months(); track month.key) {
            <div ndCalendarMonth [month]="month">
              <div ndCalendarHeading>{{ month.label }}</div>
              <table ndCalendarGrid>
                <tbody>
                  @for (week of month.weeks; track week.key) {
                    <tr>
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
      `,
    })
    class FormHost {
      readonly control = new FormControl<Date | null>(new Date(2026, 1, 10));
    }
    const view = await render(FormHost);
    await view.fixture.whenStable();
    expect(screen.getByRole('grid', { name: 'February 2026' })).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Thursday, February 12, 2026' }),
    );
    expect(view.fixture.componentInstance.control.value).toEqual(
      new Date(2026, 1, 12),
    );
  });
});

describe('dates', () => {
  it('reads the week start from the locale', () => {
    expect([0, 1]).toContain(localeWeekStart('en-GB'));
    expect(localeWeekStart('not a locale')).toBe(0);
  });

  it('keeps the day within shorter months', () => {
    expect(addMonths(new Date(2026, 0, 31), 1)).toEqual(new Date(2026, 1, 28));
    expect(startOfWeek(new Date(2026, 9, 11), 1)).toEqual(new Date(2026, 9, 5));
  });
});
