---
keywords: card, panel, tile, dashboard
---

A widget holds one piece of a dashboard: a heading, a line or two of text
and an action, stacked in a card. `sampleWidget` only styles its host, so a
widget is as accessible as the element it's on. Its action,
`sampleWidgetAction`, is Ndop's Button, which comes with it.

## Do

- Put `sampleWidget` on a `section` with `aria-labelledby` pointing at its
  heading, or on an `li` in a list of widgets.
- Use one action per widget, a `sampleWidgetAction` button with a verb
  such as "Upgrade".
- Use `tone="muted"` for widgets that sit inside another card.

## Don't

- Don't put a click handler on the widget itself; put the action on its
  button so keyboard and screen reader users can reach it.
- Don't nest widgets.
