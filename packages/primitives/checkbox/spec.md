# Checkbox: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Checkbox](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/), dual-state
or, with `indeterminate`, mixed.

## Parts, roles and attributes

| Part              | Selector                | Role       | ARIA attributes                                 | Data attributes                               |
| ----------------- | ----------------------- | ---------- | ----------------------------------------------- | --------------------------------------------- |
| Checkbox          | `button[ndCheckbox]`    | `checkbox` | `aria-checked`, `aria-required`, `aria-invalid` | `data-state`, `data-disabled`, `data-invalid` |
| CheckboxIndicator | `[ndCheckboxIndicator]` |            |                                                 | `data-state`                                  |

- **Checkbox** is a native `button` with `role="checkbox"` and
  `type="button"`, so it never submits a form. `checked` is a `model()`
  (two-way `[(checked)]`); unbound, it starts from `defaultChecked`
  (default `false`). `indeterminate` is a `model()` too (default `false`):
  while it's `true`, `aria-checked` is `mixed` whatever `checked` is, as
  for a native checkbox. Otherwise `aria-checked` is `true` or `false`.
- Activating it clears `indeterminate` and flips `checked`, so a mixed
  checkbox becomes checked.
- `disabled` (default `false`) sets the native `disabled` attribute, which
  removes it from the tab order and ignores clicks, and `data-disabled`.
- `required` (default `false`) sets `aria-required="true"`.
- `data-state` is `checked`, `unchecked` or `indeterminate` on both parts.
- **Forms**: it owns its value, so it implements `ControlValueAccessor`
  (a boolean) and Signal Forms' `FormCheckboxControl` (ADR-0004,
  amendments 1 and 4). Signal Forms (`[formField]`), reactive forms and
  template-driven forms all bind it through its value accessor. A
  disabled field disables it; leaving it marks the field touched.
- Invalid means: the `invalid` input is `true` without a forms library, or
  the bound field is invalid **and** touched. While invalid:
  `aria-invalid="true"` and `data-invalid`.
- With an `id`, it publishes its state for a `label[ndLabel]` pointing at
  it. A label's `for` works natively: clicking the label toggles it.
- Inside a form field (`[ndField]`), its `aria-describedby` lists the
  field's description and, while invalid, its error.
- **CheckboxIndicator** has the `hidden` attribute while unchecked, so its
  icon shows only while checked or indeterminate.

## Keyboard map

| Key     | Action                                                                  |
| ------- | ----------------------------------------------------------------------- |
| `Space` | Checks or unchecks it; a mixed checkbox becomes checked.                |
| `Enter` | Does nothing, as for a native checkbox (APG); the default is prevented. |

## Focus behavior

- Unchanged from a native button: activating it keeps focus on it.
- Leaving it marks a bound field touched.

## RTL behavior

Nothing mirrors.
