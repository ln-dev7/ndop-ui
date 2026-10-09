# Radio Group: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)

## Parts, roles and attributes

| Part                | Selector                   | Role         | ARIA attributes                                                      | Data attributes                                     |
| ------------------- | -------------------------- | ------------ | -------------------------------------------------------------------- | --------------------------------------------------- |
| RadioGroup          | `[ndRadioGroup]`           | `radiogroup` | `aria-orientation`, `aria-required`, `aria-invalid`, `aria-disabled` | `data-orientation`, `data-disabled`, `data-invalid` |
| RadioGroupItem      | `button[ndRadioGroupItem]` | `radio`      | `aria-checked`                                                       | `data-state`, `data-disabled`, `data-orientation`   |
| RadioGroupIndicator | `[ndRadioGroupIndicator]`  |              |                                                                      | `data-state`                                        |

- **RadioGroup** holds the selection: `value` is a `model()` (two-way
  `[(value)]`) of the checked item's value, or `null` when none is
  checked; unbound, it starts from `defaultValue` (default `null`). It
  needs a name, from `aria-label` or `aria-labelledby`.
- `orientation` (`vertical` by default, or `horizontal`) sets
  `aria-orientation` and `data-orientation`. It describes the layout; all
  four arrow keys work either way, as the APG pattern says.
- `disabled` (default `false`) disables every item and sets
  `aria-disabled="true"`. `required` (default `false`) sets
  `aria-required="true"`.
- **Forms**: the group owns its value, so it implements
  `ControlValueAccessor` and Signal Forms' `FormValueControl` (the value,
  or `null`), and every forms library binds it through its value accessor
  (ADR-0004, amendments 1 and 4). Invalid means the `invalid` input
  without a forms library, or a bound field that is invalid and touched:
  `aria-invalid="true"` and `data-invalid`. Focus leaving the group marks
  the field touched.
- Inside a form field, the group's `aria-describedby` lists the field's
  description and error.
- **RadioGroupItem** is a native `button` with `role="radio"` and
  `type="button"`, and a required `value` (a string). `aria-checked` is
  `true` for the item whose value is the group's. `disabled` (default
  `false`) disables one item.
- Only one item is in the tab order (`tabindex="0"`, the others `-1`): the
  checked item, or, when none is checked, the first enabled one; after an
  item has had focus, that item.
- `data-state` is `checked` or `unchecked` on items and indicators.
- **RadioGroupIndicator** has the `hidden` attribute while its item is
  unchecked.

## Keyboard map

| Key                       | Action                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `Tab`                     | Moves focus into the group, to the checked item or, if none, the first; then out of it.    |
| `Space`                   | Checks the focused item, if it isn't checked.                                              |
| `Enter`                   | Does nothing, as for native radio buttons; the default is prevented.                       |
| `ArrowDown`, `ArrowRight` | Moves focus to the next enabled item and checks it; from the last, wraps to the first.     |
| `ArrowUp`, `ArrowLeft`    | Moves focus to the previous enabled item and checks it; from the first, wraps to the last. |

## Focus behavior

- Arrow keys move focus and the selection together; disabled items are
  skipped.
- Clicking an item focuses and checks it.
- Focus leaving the group marks a bound field touched.

## RTL behavior

In right-to-left layouts, `ArrowLeft` moves to the next item and
`ArrowRight` to the previous one. Direction comes from the nearest `dir`
attribute, on the item or an ancestor.
