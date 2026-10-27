---
keywords: select, dropdown, picker, choose, options, listbox, combobox
---

A select shows the chosen value on a button that opens a list of options
below it. Typing on the closed button picks the next option starting with
those letters, as on a native `select`; open, the arrow keys and typing
move through the options and Enter picks one. The options are written in
place, so the button shows the chosen option's text on the server. Bind
forms on its trigger.

Behavior-only parts now come directly from `@ndop/primitives`; styled parts
remain in your local item file. See [Migrating native overlays](/docs/getting-started/native-overlays)
for the imports, selectors and customization changes.

The popup uses the native Popover API for top-layer rendering and dismissal.
Positioning retains a JavaScript fallback where CSS anchors are unavailable.

## Do

- Name the trigger with a label, as any form field.
- Group long lists, with labels.
- Use `size="sm"` in dense layouts.

## Don't

- Don't use it for more than a few dozen options, or when people know what
  they want to type; use a Combobox.
- Don't use it for actions; use Dropdown Menu.
