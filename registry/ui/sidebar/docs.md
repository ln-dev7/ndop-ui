---
keywords: sidebar, side navigation, app shell, drawer, collapsible sidebar, nav rail
---

A sidebar holds an app's main navigation beside its content. On desktop
it collapses off-canvas or down to its icons, with its trigger, a rail
along its edge, or `Ctrl+B` (`⌘B` on a Mac); collapsed off-canvas, it's
inert, so its links leave the tab order. Below the `md` breakpoint it
opens as a modal dialog with a focus trap, closed by `Escape`, a backdrop
click or following a link.

## Do

- Put a `nav` with an `aria-label` in it, and name its container too.
- Mark the current page's link with `active`.
- Give each menu link an icon and a text label: collapsed to icons, the
  label is clipped but still names the link.

## Don't

- Don't put the page's only way to an action in a collapsed sidebar.
- Don't nest menus more than one level; use separate groups.
