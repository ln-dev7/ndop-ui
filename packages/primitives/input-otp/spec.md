# Input OTP: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

No APG pattern: one native text `input` holds the whole code, so screen
readers, autofill (`autocomplete="one-time-code"`) and password managers
see a single field. The slots are a visual rendering of its value, hidden
from assistive technology.

## Parts, roles and attributes

| Part              | Selector                 | Role        | ARIA attributes | Data attributes                                            |
| ----------------- | ------------------------ | ----------- | --------------- | ---------------------------------------------------------- |
| InputOtp          | `[ndInputOtp]`           |             |                 | `data-complete`, `data-disabled`, `data-invalid`           |
| InputOtpInput     | `input[ndInputOtpInput]` | native      | `aria-invalid`  | `data-invalid`                                             |
| InputOtpGroup     | `[ndInputOtpGroup]`      |             | `aria-hidden`   |                                                            |
| InputOtpSlot      | `[ndInputOtpSlot]`       |             | `aria-hidden`   | `data-active`, `data-filled`, `data-caret`, `data-invalid` |
| InputOtpSeparator | `[ndInputOtpSeparator]`  | `separator` | `aria-hidden`   |                                                            |

- **InputOtp** holds the code: `value` is a `model()` (two-way
  `[(value)]`, a string); unbound, it starts from `defaultValue` (default
  `''`). `length` (required) is the code's length. `allow` is a
  regular expression one character must match to be kept (default
  `/\d/`, digits). `disabled` (default `false`) disables the input.
  `data-complete` is set once the code has `length` characters.
- `completed` is an output that emits the code when the user's typing
  or pasting makes it `length` characters long, for submitting it
  straight away.
- **InputOtpInput** is the native input inside it: it gets
  `autocomplete="one-time-code"`, `inputmode` (`numeric` by default, set
  by `inputMode` on the root), `spellcheck="false"` and the value. It
  needs a name, from a `label` or `aria-label`. Typed or pasted
  characters that `allow` rejects are dropped, and the value is cut to
  `length`. It has no `maxlength`, which would cut a pasted code such as
  `123-456` before its separators are dropped. Pasting is never
  prevented: the paste replaces the whole code. The caret always sits at
  the end of the code.
- **Forms**: the root owns its value, so it implements
  `ControlValueAccessor` and Signal Forms' `FormValueControl` (a string),
  and every forms library binds it through its value accessor, on the
  root element (ADR-0004, amendments 1 and 4). Invalid means the
  `invalid` input without a forms library, or a bound field that is
  invalid and touched: `aria-invalid="true"` on the input, and
  `data-invalid` on the root, the input and the slots. Leaving the input
  marks the field touched.
- With an `id` on the input, it publishes its state for a
  `label[ndLabel]`; inside a form field, the input's `aria-describedby`
  lists the field's description and error.
- **InputOtpSlot** shows one character: `index` (required) is its
  position. Its text is that character. `data-filled` is set when it has
  one; `data-active` while the input is focused and this slot is where
  the next character goes (the last slot once the code is complete);
  `data-caret` while it is active and empty, to draw a fake caret.
- **InputOtpGroup** and **InputOtpSlot** are `aria-hidden="true"`; the
  input is what assistive technology reads. **InputOtpSeparator** is a
  hidden `role="separator"` between groups.

## Keyboard map

| Key         | Action                      |
| ----------- | --------------------------- |
| `Backspace` | Deletes the last character. |

Typing an allowed character fills the next slot; others are ignored.
Pasting fills the slots from the start, keeping only allowed characters.

## Focus behavior

- Clicking any slot focuses the input, with the caret at the end of the
  code.
- Focus stays on the input as the code fills; the `completed` output lets
  the app move on.
- Leaving the input marks a bound field touched.

## RTL behavior

The root has `dir="ltr"`: a code's characters read left to right in every
language, as phone numbers do, so the slots don't mirror.
