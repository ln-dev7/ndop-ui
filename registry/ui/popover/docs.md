---
keywords: popup, flyout, dropdown panel, overlay, floating panel
---

A popover shows rich, interactive content next to the element that opens
it, such as a small form or a list of filters. It is non-modal: the rest of
the page stays usable, and clicking outside or pressing Escape closes it,
returning focus to the trigger. `side` and `align` place it, using logical
`start` and `end` so it mirrors in right-to-left layouts.

## Do

- Name the content with `aria-labelledby` pointing at a heading inside it,
  or with `aria-label`.
- Keep the content short and related to its trigger.
- Use `start` and `end` rather than left and right, so the placement follows
  the text direction.

## Don't

- Don't use a popover for a decision that must block the page; use a dialog.
- Don't put a popover's only copy of important information behind it; keep
  it reachable on the page too.
