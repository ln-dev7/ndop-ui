---
keywords: date picker, datepicker, date input, pick a date, calendar popover, date range
---

A date picker is a button that opens a calendar in a popover, to pick a
date or a range of days. It composes Popover and Calendar: opening
focuses the chosen day, the arrow keys move between days, and choosing
one can close the popover and return focus to the button, which shows
the date formatted for the locale.

## Do

- Show the chosen date on the button, formatted with Angular's
  `DatePipe`, and a placeholder until then.
- Name the popover's content with `aria-label`, such as "Choose a date".
- Use `min`, `max` and `disabledDates` for dates that can't be chosen.

## Don't

- Don't use it for dates people know by heart, such as a birth date;
  separate fields for day, month and year are quicker to type.
- Don't hide the calendar's keyboard: keep it in a popover, not on hover.
