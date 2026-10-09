# Progress: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

No APG pattern covers a progress bar; this follows the WAI-ARIA
[progressbar role](https://www.w3.org/TR/wai-aria-1.2/#progressbar).

## Parts, roles and attributes

| Part              | Selector                | Role          | ARIA attributes                                                     | Data attributes                        |
| ----------------- | ----------------------- | ------------- | ------------------------------------------------------------------- | -------------------------------------- |
| Progress          | `[ndProgress]`          | `progressbar` | `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext` | `data-state`, `data-value`, `data-max` |
| ProgressIndicator | `[ndProgressIndicator]` |               |                                                                     | `data-state`                           |

- **Progress**: `value` (a number from 0 to `max`, or `null` while
  indeterminate, default `null`) and `max` (default `100`). Values are
  clamped to that range. `aria-valuemin` is `0` and `aria-valuemax` is
  `max`; `aria-valuenow` is the value, and is absent while indeterminate,
  as the role requires. `aria-valuetext` reads the percentage, such as
  "60%". It needs a name, from `aria-label` or `aria-labelledby`.
- `data-state` is `indeterminate`, `loading` or `complete` on both parts.
- **ProgressIndicator** is presentational; the root exposes the
  percentage, for styling its width.

## Keyboard map

| Key | Action |
| --- | ------ |

A progress bar is not focusable and has no keyboard behavior.

## Focus behavior

- The progress bar never receives focus and never changes focus.

## RTL behavior

The indicator fills from the start side: from the right in right-to-left
layouts.
