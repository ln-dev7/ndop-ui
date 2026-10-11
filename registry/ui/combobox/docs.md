---
keywords: combobox, autocomplete, typeahead, search select, filter, multiselect, tags, chips
---

A combobox is a text field that filters a list of options below it as
the user types, for picking from many options, such as a country or a
framework. Focus stays in the field while the arrow keys move through
the options and Enter picks one. With `multiple`, the chosen options
show as chips beside the field, and Backspace removes the last one. Bind
forms on its field.

## Do

- Name the field with a label, as any form field.
- Show an empty state for when nothing matches.
- Pass `[filter]="null"` and filter yourself when options come from a
  server.

## Don't

- Don't use it for a handful of options; use a Select or a Radio Group.
- Don't use it to run commands; use Command.
