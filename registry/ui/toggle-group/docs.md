---
keywords: toggle group, segmented control, button group, alignment, formatting, toolbar, view switcher
---

A toggle group is a set of toggle buttons: one pressed at most, such as
text alignment, or any number, such as bold, italic and underline. Only
one of its buttons is in the tab order, and the arrow keys move between
them. Its value is always an array of the pressed buttons' values. With
`spacing` 0, the default, its buttons join into one bar; the outline
variant draws a border around each.

## Do

- Name the group with `aria-label`, such as "Text alignment", and every
  icon-only button too.
- Use `type="multiple"` when the options combine.

## Don't

- Don't use it for navigation between views of a page; use Tabs.
- Don't use a single toggle group for unrelated options.
