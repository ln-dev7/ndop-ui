# Label: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

No APG pattern: a native HTML `label`, whose `for` attribute gives the
associated control its accessible name.

## Parts, roles and attributes

| Part  | Selector         | Role | ARIA attributes | Data attributes                 |
| ----- | ---------------- | ---- | --------------- | ------------------------------- |
| Label | `label[ndLabel]` |      |                 | `data-disabled`, `data-invalid` |

- The accessible name comes from native `label` semantics; Ndop adds no ARIA.
- When `for` names an `input[ndInput]` in the same app, the label mirrors
  that input's state: `data-disabled` while it is disabled and
  `data-invalid` while it is invalid (see Input's `spec.md`). The two find
  each other through a signal-based registry keyed by id, with no DOM
  queries, so it works during SSR and without zone.js.
- Double-clicking the label's own text doesn't select it (`mousedown` with
  `detail > 1` is prevented), unless the target is inside an interactive
  element nested in the label.

## Keyboard map

| Key | Action |
| --- | ------ |

A label is not focusable; activating it (click) focuses its control
natively.

## Focus behavior

- Clicking the label moves focus to the associated control (native
  behavior, unchanged).

## RTL behavior

Nothing mirrors.
