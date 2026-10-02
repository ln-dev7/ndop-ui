# Separator: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

No APG pattern covers a static separator; this follows the WAI-ARIA
[separator role](https://www.w3.org/TR/wai-aria-1.2/#separator) for a
non-focusable separator.

## Parts, roles and attributes

| Part      | Selector        | Role                  | ARIA attributes    | Data attributes    |
| --------- | --------------- | --------------------- | ------------------ | ------------------ |
| Separator | `[ndSeparator]` | `separator` or `none` | `aria-orientation` | `data-orientation` |

- Inputs: `orientation` (`'horizontal' | 'vertical'`, default
  `'horizontal'`) and `decorative` (boolean, default `false`).
- Not decorative: `role="separator"`; `aria-orientation="vertical"` only when
  vertical, since horizontal is the role's default.
- Decorative: `role="none"` and no `aria-orientation`, so assistive
  technology skips it.
- `data-orientation` always reflects `orientation`, for styling.

## Keyboard map

| Key | Action |
| --- | ------ |

A static separator is not focusable and has no keyboard behavior.

## Focus behavior

- The separator never receives focus and never changes focus.

## RTL behavior

Nothing mirrors: orientation is the same in both directions.
