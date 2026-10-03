A label names a form control. `ndLabel` styles a native `label`, which names
the control its `for` attribute points at and moves focus to it when
clicked. When the control is an `input[ndInput]`, the label also mirrors its
state with `data-invalid` and `data-disabled`, so the two style together.

## Do

- Give every input a visible label, and point its `for` at the input's `id`.
- Keep labels short: name the value, and put instructions in a description
  linked with `aria-describedby`.

## Don't

- Don't use placeholder text instead of a label; it disappears as soon as
  someone types.
- Don't style a `div` or `span` as a label; only a native `label` names its
  control.
