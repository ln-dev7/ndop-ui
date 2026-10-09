# Input: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

No APG pattern: a native HTML `input`. Its accessible name comes from a
`label` (see Label's `spec.md`) or `aria-label`.

## Parts, roles and attributes

| Part  | Selector                              | Role   | ARIA attributes                    | Data attributes                 |
| ----- | ------------------------------------- | ------ | ---------------------------------- | ------------------------------- |
| Input | `input[ndInput]`, `textarea[ndInput]` | native | `aria-invalid`, `aria-describedby` | `data-disabled`, `data-invalid` |

- Forms own the value: Signal Forms (`[formField]`) and reactive or
  template-driven forms (`formControl`, `ngModel`) bind the native input
  directly. Ndop adds no value accessor, which would replace Angular's
  `DefaultValueAccessor` and its IME composition handling (ADR-0004
  amendment 1).
- Ndop reads state from whichever forms directive is on the element:
  `FormField` for Signal Forms, `NgControl` for the others.
- Input `invalid` (boolean, default `false`) marks the field invalid without
  a forms library. With one, the field's state decides; Signal Forms binds
  the field's raw validity into an `invalid` input (its `FormUiControl`
  contract), so that binding is not used.
- Invalid means: the `invalid` input is `true`, or the bound field is invalid
  **and** has been touched, so errors don't show before the user has
  interacted. While invalid: `aria-invalid="true"` and `data-invalid`.
- `data-disabled` while the native input is disabled.
- When the input has an `id`, it registers its state so a `label[ndLabel]`
  pointing at it can mirror it.
- Inside a form field (`[ndField]`, see Form Field's `spec.md`), its
  `aria-describedby` lists the field's description and, while invalid, its
  error, after any static `aria-describedby` it already has.

## Keyboard map

| Key | Action |
| --- | ------ |

No keyboard behavior beyond the native input's.

## Focus behavior

- Unchanged from the native input. Focusing it and leaving it marks the
  bound field touched, through the forms library.

## RTL behavior

Text direction follows the document or the element's `dir`; Ndop changes
nothing.
