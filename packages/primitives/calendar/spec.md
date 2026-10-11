# Calendar: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Date grid](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/),
the month grid of the APG date picker: a table with `role="grid"`, one
button per day, and arrow keys to move between days, on a roving tabindex
(ADR-0004, amendment 3). Date math uses `Date` and `Intl` only.

## Markup

The calendar's structure is the user's template: the primitive gives the
months, weekdays and weeks to show as signals, and the parts mark them up.

```html
<div ndCalendar #calendar="ndCalendar" [(value)]="date">
  <button ndCalendarPrevious aria-label="Previous month">‹</button>
  <button ndCalendarNext aria-label="Next month">›</button>
  @for (month of calendar.months(); track month.key) {
  <div ndCalendarMonth [month]="month">
    <div ndCalendarHeading>{{ month.label }}</div>
    <table ndCalendarGrid>
      <thead>
        <tr>
          @for (weekday of calendar.weekdays(); track weekday.long) {
          <th ndCalendarWeekday [weekday]="weekday">{{ weekday.short }}</th>
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
```

## Parts, roles and attributes

| Part             | Selector                     | Role       | ARIA attributes                                           | Data attributes                                                                                                                  |
| ---------------- | ---------------------------- | ---------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Calendar         | `[ndCalendar]`               |            |                                                           | `data-mode`                                                                                                                      |
| CalendarPrevious | `button[ndCalendarPrevious]` |            | `aria-disabled`                                           | `data-disabled`                                                                                                                  |
| CalendarNext     | `button[ndCalendarNext]`     |            | `aria-disabled`                                           | `data-disabled`                                                                                                                  |
| CalendarMonth    | `[ndCalendarMonth]`          |            |                                                           |                                                                                                                                  |
| CalendarHeading  | `[ndCalendarHeading]`        |            | `id`, `aria-live`                                         |                                                                                                                                  |
| CalendarGrid     | `table[ndCalendarGrid]`      | `grid`     | `aria-labelledby`, `aria-multiselectable`                 |                                                                                                                                  |
| CalendarWeekday  | `th[ndCalendarWeekday]`      |            | `abbr`, `scope`                                           |                                                                                                                                  |
| CalendarCell     | `td[ndCalendarCell]`         | `gridcell` | `aria-selected`                                           | `data-selected`, `data-today`, `data-outside`, `data-disabled`, `data-range-start`, `data-range-middle`, `data-range-end`        |
| CalendarDay      | `button[ndCalendarDay]`      |            | `aria-label`, `aria-current`, `aria-disabled`, `tabindex` | `data-selected-single`, `data-range-start`, `data-range-middle`, `data-range-end`, `data-today`, `data-outside`, `data-disabled` |

- **Calendar**: `mode` is `single` (default), `range` or `multiple`.
  `value` is a `model()` holding the chosen date in `single` mode, `range`
  one holding `{ from, to }` in `range` mode, and `values` one listing the
  chosen dates in `multiple` mode. `month` is a `model()` holding the
  first month shown, with `defaultMonth`; `numberOfMonths` (default `1`)
  shows several in a row. `min`, `max` and `disabledDates` (a function)
  disable dates. `weekStartsOn` (0 for Sunday to 6 for Saturday) defaults
  to the locale's first day of the week, from `Intl`; `locale` defaults to
  the app's `LOCALE_ID`. `showOutsideDays` (default `true`) shows the days
  of the neighboring months that fill the first and last weeks.
- **CalendarPrevious** and **CalendarNext** are native buttons that show
  the previous or next month. Name them with `aria-label`. They have
  `aria-disabled` when `min` or `max` keeps the month from changing, and
  stay focusable.
- **CalendarHeading** shows its month's name and year, and is a polite
  live region, so changing months is announced. Its grid is labelled by
  it.
- **CalendarGrid** is a native `table` with `role="grid"`; in `multiple`
  mode it has `aria-multiselectable="true"`.
- **CalendarWeekday** is a column header with the weekday's full name in
  `abbr`, so screen readers read "Monday" for "Mo".
- **CalendarCell** is a `gridcell` with `aria-selected` when its day is
  chosen. Outside days without `showOutsideDays` leave an empty cell.
- **CalendarDay** is a native button labelled with the full date in the
  locale ("Saturday, October 11, 2026"); today has
  `aria-current="date"`. Disabled days have `aria-disabled` and stay
  focusable, so the keyboard can move across them. Only one day is in the
  tab order: the focused one, or else the chosen date, or else today, or
  else the first day of the month. That day also has `cdkFocusInitial`,
  so a dialog or popover holding the calendar focuses it when it opens,
  as the APG date picker does.
- The month shown on the server is the chosen date's, or the
  `defaultMonth`, or the current one.

## Keyboard map

| Key                              | Action                                                               |
| -------------------------------- | -------------------------------------------------------------------- |
| `Tab`                            | Moves focus to the day in the tab order, then out of the grid.       |
| `ArrowRight`, `ArrowLeft`        | Moves focus to the next or previous day, changing month when needed. |
| `ArrowDown`, `ArrowUp`           | Moves focus to the same day of the next or previous week.            |
| `Home`, `End`                    | Moves focus to the first or last day of the week.                    |
| `PageDown`, `PageUp`             | Moves focus to the same day of the next or previous month.           |
| `Shift+PageDown`, `Shift+PageUp` | Moves focus to the same day of the next or previous year.            |
| `Enter`, `Space`                 | Chooses the focused day, unless it's disabled.                       |

## Focus behavior

- Focus never leaves the shown months on its own: moving past their edge
  shows the next or previous month and focuses the day there.
- `min` and `max` stop the keys at their bounds.
- Choosing a day keeps focus on it.

## RTL behavior

In right-to-left layouts, the days run from right to left, so
`ArrowLeft` moves to the next day and `ArrowRight` to the previous one.
Direction comes from the nearest `dir` attribute.
