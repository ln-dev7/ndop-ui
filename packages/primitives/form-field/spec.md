# Form Field: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

No APG pattern. A field ties a control to its description and error with
[`aria-describedby`](https://www.w3.org/TR/wai-aria-1.2/#aria-describedby),
and announces the error with the
[`alert` role](https://www.w3.org/TR/wai-aria-1.2/#alert). The label stays
a native `label` (see Label's `spec.md`).

## Parts, roles and attributes

| Part             | Selector               | Role    | ARIA attributes | Data attributes                 |
| ---------------- | ---------------------- | ------- | --------------- | ------------------------------- |
| Field            | `[ndField]`            | `group` |                 | `data-invalid`, `data-disabled` |
| FieldDescription | `[ndFieldDescription]` |         |                 |                                 |
| FieldError       | `[ndFieldError]`       | `alert` |                 |                                 |

- **Field** wraps one control and its label, description and error. It
  groups them (`role="group"`) and mirrors its control's state:
  `data-invalid` while the control is invalid, `data-disabled` while it's
  disabled. `invalid` (default `false`) marks the field invalid by hand,
  for errors that don't come from a control.
- The controls that join a field are Ndop's: `input[ndInput]` and
  `textarea[ndInput]`, Checkbox, Switch, Radio Group, Slider thumbs and
  Input OTP's input. A control is invalid when its bound forms field is
  invalid and touched, or its `invalid` input is set (see each control's
  `spec.md`).
- Each joined control's `aria-describedby` lists the field's descriptions
  and, while the field is invalid, its errors, after any
  `aria-describedby` the control already has.
- **FieldDescription** has an id, its own or a generated one. Outside a
  field, such as under a field set's legend, it describes nothing.
- **FieldError** has an id and `role="alert"`, and the `hidden` attribute
  while the field is valid, so it's announced when it appears and stays
  out of the accessibility tree until then. Put the messages inside it,
  such as each of a Signal Forms field's `errors()`.

## Keyboard map

| Key | Action |
| --- | ------ |

A field has no keyboard behavior; its control keeps its own.

## Focus behavior

- A field never moves focus. An error appearing doesn't take focus; it's
  announced.

## RTL behavior

Nothing mirrors.
