---
keywords: resizable, split view, splitter, panes, panels, drag to resize, sidebar
---

Resizable panels share a row or column, with a handle between each pair
that a pointer drags or the arrow keys move: a window splitter, such as a
sidebar next to an editor. Each panel can have a default, minimum and
maximum size, in percent of the group, and `[(sizes)]` reads or restores
the layout.

## Do

- Name each handle with `aria-label`, such as "Resize sidebar".
- Set a `minSize` that keeps each panel usable.
- Show a grip with `ResizableHandleGrip` when the handle is hard to see.

## Don't

- Don't nest so many groups that the handles are hard to tell apart.
- Don't put the only way to reach content in a panel that can shrink to
  nothing.
