# Toggle Group: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

A group of [toggle buttons](https://www.w3.org/WAI/ARIA/apg/patterns/button/)
with a roving tabindex, as in the
[Toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) pattern.

## Parts, roles and attributes

| Part            | Selector                    | Role    | ARIA attributes | Data attributes                                   |
| --------------- | --------------------------- | ------- | --------------- | ------------------------------------------------- |
| ToggleGroup     | `[ndToggleGroup]`           | `group` |                 | `data-orientation`, `data-disabled`               |
| ToggleGroupItem | `button[ndToggleGroupItem]` |         | `aria-pressed`  | `data-state`, `data-disabled`, `data-orientation` |

- **ToggleGroup** holds the pressed items: `value` is a `model()` (two-way
  `[(value)]`) of the pressed items' values, an array in both modes;
  unbound, it starts from `defaultValue` (default `[]`). It needs a name,
  from `aria-label` or `aria-labelledby`.
- `type` is `single` (default) or `multiple`. In `single` mode, pressing
  an item releases the others, and pressing the pressed item releases it,
  leaving none.
- `orientation` (`horizontal` by default, or `vertical`) decides which
  arrow keys move focus, and sets `data-orientation`.
- `disabled` (default `false`) disables every item.
- **Forms**: it implements `ControlValueAccessor` and Signal Forms'
  `FormValueControl` (the array of values), and every forms library binds
  it through its value accessor (ADR-0004, amendments 1 and 4).
- **ToggleGroupItem** is a native `button` with `type="button"` and a
  required `value` (a string). `aria-pressed` is `true` while its value is
  in the group's. `disabled` (default `false`) disables one item.
- Only one item is in the tab order: the last focused item, or else the
  first pressed one, or else the first enabled one.
- `data-state` is `on` or `off` on items.

## Keyboard map

| Key                       | Action                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| `Tab`                     | Moves focus into the group, to its tab stop; then out of it.                                        |
| `Space`, `Enter`          | Presses or releases the focused item.                                                               |
| `ArrowRight`, `ArrowLeft` | Horizontal groups: moves focus to the next or previous enabled item, wrapping, without pressing it. |
| `ArrowDown`, `ArrowUp`    | Vertical groups: moves focus to the next or previous enabled item, wrapping, without pressing it.   |
| `Home`, `End`             | Moves focus to the first or last enabled item.                                                      |

## Focus behavior

- Arrow keys, Home and End move focus only; pressing stays with Space and
  Enter. Disabled items are skipped.

## RTL behavior

In right-to-left layouts, `ArrowLeft` moves to the next item and
`ArrowRight` to the previous one. Direction comes from the nearest `dir`
attribute, on the item or an ancestor.
