---
keywords: combobox, autocomplete, typeahead, search select, filter, multiselect, tags, chips
---

A combobox is a text field that filters a list of options below it as
the user types, for picking from many options, such as a country or a
framework. Focus stays in the field while the arrow keys move through
the options and Enter picks one. With `multiple`, the chosen options
show as chips beside the field, and Backspace removes the last one. Bind
forms on its field.

Behavior-only parts now come directly from `@ndop/primitives`; styled parts
remain in your local item file. See [Migrating native overlays](/docs/getting-started/native-overlays)
for the imports, selectors and customization changes.

The popup uses the native Popover API for top-layer rendering and dismissal.
Positioning retains a JavaScript fallback where CSS anchors are unavailable.

## Do

- Name the field with a label, as any form field.
- Show an empty state for when nothing matches.
- Pass `[filter]="null"` and filter yourself when options come from a
  server.

## Don't

- Don't use it for a handful of options; use a Select or a Radio Group.
- Don't use it to run commands; use Command.
