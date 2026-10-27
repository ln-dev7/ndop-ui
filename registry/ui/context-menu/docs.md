---
keywords: context menu, right click, long press, menu, actions, shortcuts
---

A context menu lists actions for an area, opened at the pointer with a
right click or a long press, or at the area's corner with Shift + F10 or
the keyboard's menu key. Inside, it works like any menu: arrow keys,
typing, Enter and Escape, which returns focus to the area. Items can be
checkboxes, radios or submenus.

Behavior-only parts now come directly from `@ndop/primitives`; styled parts
remain in your local item file. See [Migrating native overlays](/docs/getting-started/native-overlays)
for the imports, selectors and customization changes.

The popup uses the native Popover API for top-layer rendering and dismissal.
Positioning retains a JavaScript fallback where CSS anchors are unavailable.

## Do

- Make the area focusable and give it a name, so keyboard users can open
  the menu.
- Offer the same actions somewhere visible too, such as a toolbar or a
  Dropdown Menu.

## Don't

- Don't hide actions people need only in a context menu.
- Don't replace the browser's menu on text people may want to copy.
