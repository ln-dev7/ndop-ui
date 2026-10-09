---
keywords: text area, multiline, comment, message, field
---

A textarea takes longer text than an input: a comment, a message, a bio.
`ndTextarea` styles a native `textarea` and grows with its content. It
reflects the bound field's invalid and disabled states like Input does, so
forms bind the `textarea` directly.

## Do

- Give it a visible `label[ndLabel]` with a matching `for` and `id`.
- Bind the form field to the `textarea` itself, with `[formField]`,
  `formControlName` or `ngModel`.
- Say the expected length or format in a description under it, linked with
  `aria-describedby`.

## Don't

- Don't use it for a single line of text; use Input.
- Don't rely on the placeholder as the label; it disappears as soon as the
  user types.
