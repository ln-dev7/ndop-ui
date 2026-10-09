# Switch: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/)

## Parts, roles and attributes

| Part        | Selector           | Role     | ARIA attributes                                 | Data attributes                               |
| ----------- | ------------------ | -------- | ----------------------------------------------- | --------------------------------------------- |
| Switch      | `button[ndSwitch]` | `switch` | `aria-checked`, `aria-required`, `aria-invalid` | `data-state`, `data-disabled`, `data-invalid` |
| SwitchThumb | `[ndSwitchThumb]`  |          |                                                 | `data-state`                                  |

- **Switch** is a native `button` with `role="switch"` and `type="button"`.
  `checked` is a `model()` (two-way `[(checked)]`); unbound, it starts from
  `defaultChecked` (default `false`). `aria-checked` is `true` or `false`.
  Activating it flips `checked`.
- `disabled` (default `false`) sets the native `disabled` attribute and
  `data-disabled`. `required` (default `false`) sets
  `aria-required="true"`.
- `data-state` is `checked` or `unchecked` on both parts.
- **Forms**: as Checkbox. It implements `ControlValueAccessor` (a boolean)
  and Signal Forms' `FormCheckboxControl`, and every forms library binds
  it through its value accessor (ADR-0004, amendments 1 and 4). Invalid
  means the `invalid` input without a forms library, or a bound field that
  is invalid and touched: `aria-invalid="true"` and `data-invalid`.
- With an `id`, it publishes its state for a `label[ndLabel]`; inside a
  form field, its `aria-describedby` lists the field's description and
  error.
- **SwitchThumb** is presentational.

## Keyboard map

| Key     | Action              |
| ------- | ------------------- |
| `Space` | Turns it on or off. |
| `Enter` | Turns it on or off. |

## Focus behavior

- Unchanged from a native button: activating it keeps focus on it.
- Leaving it marks a bound field touched.

## RTL behavior

The thumb's position is styling: the styled item moves it toward the end
side, so it mirrors in right-to-left layouts.
