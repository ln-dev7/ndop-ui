A text input collects a single line of text. `ndInput` styles a native
`input` and adds no value accessor, so forms bind it directly: Signal Forms
with `[formField]`, reactive forms with `formControlName`, or plain
attributes. It reads the bound field's state and shows the input as invalid
once the field is invalid and touched, with `aria-invalid` and
`data-invalid`.

## Do

- Pair every input with an `ndLabel` whose `for` matches the input's `id`.
- Bind it with Signal Forms (`[formField]`) or reactive forms, and let the
  field's validity drive the invalid state.
- Set the right `type` (`email`, `password`, `search`, `tel`) so devices show
  the matching keyboard and browsers can autofill.

## Don't

- Don't set `invalid` while a forms library is bound; the field's state
  decides.
- Don't rely on color alone for errors; describe them in text linked with
  `aria-describedby`.
