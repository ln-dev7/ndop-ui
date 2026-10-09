# Toggle: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/), as a toggle
button.

## Parts, roles and attributes

| Part   | Selector           | Role | ARIA attributes | Data attributes               |
| ------ | ------------------ | ---- | --------------- | ----------------------------- |
| Toggle | `button[ndToggle]` |      | `aria-pressed`  | `data-state`, `data-disabled` |

- **Toggle** is a native `button` with `type="button"`. `pressed` is a
  `model()` (two-way `[(pressed)]`); unbound, it starts from
  `defaultPressed` (default `false`). `aria-pressed` is `true` or `false`.
  Activating it flips `pressed`.
- Its label must not change with its state: "Bold", not "Bold on".
- `disabled` (default `false`) sets the native `disabled` attribute and
  `data-disabled`.
- `data-state` is `on` or `off`.
- **Forms**: it implements `ControlValueAccessor` (a boolean), which every
  forms library binds, Signal Forms included (ADR-0004, amendments 1
  and 4).

## Keyboard map

| Key     | Action                  |
| ------- | ----------------------- |
| `Space` | Presses or releases it. |
| `Enter` | Presses or releases it. |

## Focus behavior

- Unchanged from a native button: activating it keeps focus on it.

## RTL behavior

Nothing mirrors.
