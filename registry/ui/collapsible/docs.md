---
keywords: disclosure, expand, collapse, show more, toggle, details
---

A collapsible shows and hides a section of content with a button, the
WAI-ARIA disclosure pattern. The trigger says whether the content is
shown, with `aria-expanded`, and hidden content is out of the tab order.
It has no styles of its own: style the trigger as a Button and the
content as you like, and use `data-state` to rotate a chevron.

## Do

- Put `ndCollapsibleTrigger` on a native `button`, often with `ndButton`.
- Write a trigger label that says what it reveals, such as "Show 3 more
  repositories".
- Start it open with `defaultOpen`, or bind `[(open)]` to control it.

## Don't

- Don't use it for a set of headings that each show a section; use an
  Accordion.
- Don't hide content that most people need.
