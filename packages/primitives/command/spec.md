# Command: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) with an
always-visible listbox: a search field filters a list of commands, and
focus stays in the field while `aria-activedescendant` points at the
highlighted command, on the CDK's `ActiveDescendantKeyManager` (ADR-0004,
amendment 3). Put it in a Dialog for a command palette.

## Markup

```html
<div ndCommand label="Commands">
  <input ndCommandInput placeholder="Type a command…" />
  <div ndCommandList>
    <div ndCommandEmpty>No results.</div>
    <div ndCommandGroup>
      <div ndCommandGroupHeading>Suggestions</div>
      <div ndCommandItem (triggered)="openCalendar()">Calendar</div>
      <div ndCommandItem keywords="emoji smiley">Search emoji</div>
    </div>
    <div ndCommandSeparator></div>
    <div ndCommandItem disabled>Calculator</div>
  </div>
</div>
```

## Parts, roles and attributes

| Part                | Selector                  | Role       | ARIA attributes                                                                              | Data attributes                  |
| ------------------- | ------------------------- | ---------- | -------------------------------------------------------------------------------------------- | -------------------------------- |
| Command             | `[ndCommand]`             |            |                                                                                              |                                  |
| CommandInput        | `input[ndCommandInput]`   | `combobox` | `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-autocomplete`, `aria-label` |                                  |
| CommandList         | `[ndCommandList]`         | `listbox`  | `aria-label`, `id`                                                                           |                                  |
| CommandItem         | `[ndCommandItem]`         | `option`   | `aria-selected`, `aria-disabled`, `id`, `hidden`                                             | `data-selected`, `data-disabled` |
| CommandEmpty        | `[ndCommandEmpty]`        |            | `hidden`                                                                                     |                                  |
| CommandGroup        | `[ndCommandGroup]`        | `group`    | `aria-labelledby`, `hidden`                                                                  |                                  |
| CommandGroupHeading | `[ndCommandGroupHeading]` |            | `id`, `aria-hidden`                                                                          |                                  |
| CommandSeparator    | `[ndCommandSeparator]`    |            | `aria-hidden`, `hidden`                                                                      |                                  |

- **Command**: `label` names the field and the list for assistive
  technology. `search` is a `model()` holding the field's text. Items whose
  text and `keywords` don't contain every word typed (ignoring case and
  accents) are hidden; `filter` replaces that test, and `shouldFilter`
  `false` shows every item, for lists filtered elsewhere. `loop` makes the
  arrow keys wrap.
- **CommandInput** is a text field, `role="combobox"` with
  `aria-expanded="true"`, since its list is always shown. Typing filters
  the list; the first shown item becomes the highlighted one.
- **CommandList** is the `listbox` the field controls.
- **CommandItem**: `value` (default: its text) identifies it, `keywords`
  match it too, `disabled` skips it, and `triggered` emits when it's run.
  The highlighted item has `aria-selected="true"` and `data-selected`; the
  pointer moving over an item highlights it.
- **CommandEmpty** shows only while no item is.
- **CommandGroup** has `role="group"`, named by its
  **CommandGroupHeading**, and is hidden while none of its items is shown.
  The heading is hidden from assistive technology itself, which reads it
  as the group's name.
- **CommandSeparator** is decorative and hidden while searching.

## Keyboard map

| Key                    | Action                                               |
| ---------------------- | ---------------------------------------------------- |
| `ArrowDown`, `ArrowUp` | Highlights the next or previous shown, enabled item. |
| `Home`, `End`          | Moves the caret in the field, as in any text field.  |
| `Enter`                | Runs the highlighted item.                           |
| `a`                    | Types into the field, filtering the list.            |

## Focus behavior

- Focus stays in the field; `aria-activedescendant` points at the
  highlighted item, which scrolls into view.
- Clicking an item runs it.

## RTL behavior

Nothing mirrors: the list is vertical, and the field follows the text
direction.
