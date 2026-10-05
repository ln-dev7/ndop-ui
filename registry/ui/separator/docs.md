---
keywords: divider, rule, hr, line
---

A separator divides content, horizontally or vertically. By default it is
semantic, with `role="separator"` and `aria-orientation`, so assistive
technology announces the division. Set `decorative` when the separation is
only visual, for example between sections that headings already divide; it
then gets `role="none"`.

## Do

- Use `orientation="vertical"` between items in a row, inside a container
  with a height.
- Set `decorative` when headings or landmarks already separate the content.

## Don't

- Don't use a separator to add spacing; use margin or gap.
- Don't stack separators next to borders that already divide the same
  content.
