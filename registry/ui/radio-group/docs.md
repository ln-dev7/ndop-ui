---
keywords: radio, radio button, option, choice, single choice, plan, select one
---

A radio group offers a few options of which one is chosen, such as a
plan or a delivery speed. It's announced as a radio group: Tab moves into
it, to the chosen option, and the arrow keys move between options and
choose them, mirrored in right-to-left layouts. Its value is the chosen
option's `value`, bound with `[(value)]` or any forms library.

## Do

- Name the group with `aria-labelledby` pointing at its heading or
  legend, and each option with a label.
- Start with an option chosen when there's a sensible default.
- Keep the options short, and few.

## Don't

- Don't use a radio group for more than about seven options; use a
  Select.
- Don't use it for options that can be combined; use checkboxes.
