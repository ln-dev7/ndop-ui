# Button: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/), on a native
`button`; a native `a` keeps link semantics.

## Parts, roles and attributes

| Part   | Selector                          | Role                       | ARIA attributes | Data attributes |
| ------ | --------------------------------- | -------------------------- | --------------- | --------------- |
| Button | `button[ndButton]`, `a[ndButton]` | native (`button` / `link`) | `aria-disabled` | `data-disabled` |

- Input: `disabled` (boolean, default `false`).
- On `button`: `disabled` sets the native `disabled` attribute.
- A `button` without a static `type` attribute gets `type="button"`, so it
  never submits a form by accident; `type="submit"` or `type="reset"`
  written in the template is kept.
- On `a`: anchors can't be natively disabled, so `disabled` sets
  `aria-disabled="true"` and `tabindex="-1"`, and cancels clicks
  (`preventDefault` and `stopImmediatePropagation`).
- `data-disabled` is present while disabled, on both elements.

## Keyboard map

| Key     | Action                                                                         |
| ------- | ------------------------------------------------------------------------------ |
| `Enter` | Activates the button, or follows the link; does nothing while disabled.        |
| `Space` | Activates a `button`; does nothing while disabled. Links don't react to Space. |

## Focus behavior

- A disabled `button` and a disabled `a` are removed from the tab order.
- Activation does not move focus.

## RTL behavior

Nothing mirrors.
