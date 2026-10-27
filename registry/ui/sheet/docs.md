---
keywords: sheet, side panel, slide over, drawer, off canvas, panel, settings, filters
---

A sheet is a dialog that slides in from an edge of the screen, for
content that goes with the page without replacing it, such as settings,
filters or a cart. Native modality makes the background inert while
it's open and restores focus when it closes. Escape or the backdrop closes
it. It comes from the end side by default; `start` and `end` are logical,
so they swap in right-to-left layouts.

Behavior-only parts now come directly from `@ndop/primitives`; styled parts
remain in your local item file. See [Migrating native overlays](/docs/getting-started/native-overlays)
for the imports, selectors and customization changes.

Content must be a native `dialog`. Style its `::backdrop` with `backdrop:`
utilities; a separate overlay element is unnecessary.

## Do

- Give it a title, which names it.
- Put a close button in it, with a visible or visually hidden name.
- Use the end side for secondary panels and the bottom on small screens.

## Don't

- Don't use it for your main navigation on large screens; use a Sidebar.
- Don't stack sheets on top of each other.
