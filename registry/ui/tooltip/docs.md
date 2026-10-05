---
keywords: hint, help text, info, title
---

A tooltip shows a short text label for an element when it is hovered or
focused, after a short delay. It describes the trigger through
`aria-describedby`, stays open while the pointer is over it, and closes on
Escape, as WCAG 1.4.13 requires. It never takes focus, so it can't hold
links or buttons.

## Do

- Use tooltips for brief, supplementary text, such as the name of an
  icon-only button that also has an `aria-label`.
- Keep the text to a few words.

## Don't

- Don't put essential information only in a tooltip; touch devices can't
  hover.
- Don't put interactive content in a tooltip; use a popover.
- Don't add a tooltip to a disabled button; it can't receive focus.
