---
keywords: command, command palette, command menu, cmdk, search, ctrl k, cmd k, launcher
---

A command menu is a search field over a list of commands, filtered as the
user types, such as a ⌘K palette. Focus stays in the field; the arrow
keys move the highlight and Enter runs the highlighted command. Commands
can be grouped, have keywords that match them too, and show their
keyboard shortcuts. Put it in a Dialog to open it as a palette.

## Do

- Name it with `label`.
- Add `keywords` for the words people may search a command by.
- Group commands and show an empty state.

## Don't

- Don't use it for picking a form value; use a Combobox.
- Don't show shortcuts the app doesn't bind.
