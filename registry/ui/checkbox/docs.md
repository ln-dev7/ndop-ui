---
keywords: checkbox, check, tick, agree, terms, select all, indeterminate, mixed, multiple choice
---

A checkbox turns one option on or off, on its own, such as accepting the
terms, or as one of several in a list. It's a native button announced as a
checkbox, so it works with a keyboard, screen readers and any forms
library: Signal Forms, reactive or template-driven. Set `indeterminate`
for a "select all" box when only some items are selected; activating it
checks it. A label whose `for` is its `id` names it and toggles it too.

## Do

- Name every checkbox with a `label`, even inside a table row.
- Use `indeterminate` for a parent box whose children are partly checked.
- Put related checkboxes in a fieldset with a legend.

## Don't

- Don't use a checkbox for a setting that applies right away; use a
  Switch.
- Don't use checkboxes for options that exclude each other; use a Radio
  Group.
