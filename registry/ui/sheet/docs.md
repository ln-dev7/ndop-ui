---
keywords: sheet, side panel, slide over, drawer, off canvas, panel, settings, filters
---

A sheet is a dialog that slides in from an edge of the screen, for
content that goes with the page without replacing it, such as settings,
filters or a cart. It's a modal dialog: focus is trapped inside while
it's open and returns when it closes, and Escape or the backdrop closes
it. It comes from the end side by default; `start` and `end` are logical,
so they swap in right-to-left layouts.

## Do

- Give it a title, which names it.
- Put a close button in it, with a visible or visually hidden name.
- Use the end side for secondary panels and the bottom on small screens.

## Don't

- Don't use it for your main navigation on large screens; use a Sidebar.
- Don't stack sheets on top of each other.
