---
keywords: drawer, bottom sheet, mobile, swipe, drag, panel, vaul
---

A drawer is a panel that slides up from the bottom of the screen, the
way phone apps show options, and can be dragged back down to close. It's
a modal dialog underneath, so it's labelled by its title, traps focus
while open, and closes with Escape, its backdrop or a close button too.
Dragging past a quarter of its height, or flicking it, closes it; a
shorter drag springs back. Reduced-motion users get no animation.

## Do

- Use it on small screens, and a Dialog or Sheet on large ones.
- Keep a close or done button in it: dragging is a shortcut, not the only
  way out.
- Show the handle on bottom drawers, so people know they can drag.

## Don't

- Don't put content that scrolls sideways or sliders in it without
  `data-no-drag`, or dragging them would move the drawer.
- Don't use it for content people read for long; use a page.
