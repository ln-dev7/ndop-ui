---
keywords: calendar, date grid, month view, date, range, dates, day picker
---

A calendar shows month grids to choose a date, a range of days or several
dates. Only one day is in the tab order; the arrow keys move between days,
Page Up and Page Down between months, and Enter or Space chooses a day.
Month names, weekdays and day labels come from `Intl` in the app's
locale, and weeks start on the locale's first day. It binds forms like any
control.

## Do

- Name the previous and next buttons with `aria-label`.
- Use `min`, `max` and `disabledDates` for days that can't be chosen;
  they stay reachable with the keyboard.
- Show two months with `numberOfMonths="2"` for ranges.

## Don't

- Don't use it for dates far from today, such as a birth date; use a text
  field.
- Don't put it in a narrow space; put it in a Date Picker's popover.
