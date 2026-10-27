---
keywords: menubar, menu bar, app menu, file menu, edit menu, desktop menu
---

A menubar is a row of menus, like a desktop app's File, Edit and View
menus. It's one tab stop: the arrow keys move between its menus, and
open the next one while a menu is open. Its menus have the same items as
Dropdown Menu: checkboxes, radios, submenus, labels, separators and
shortcuts.

Behavior-only parts now come directly from `@ndop/primitives`; styled parts
remain in your local item file. See [Migrating native overlays](/docs/getting-started/native-overlays)
for the imports, selectors and customization changes.

The popup uses the native Popover API for top-layer rendering and dismissal.
Positioning retains a JavaScript fallback where CSS anchors are unavailable.
Content remains in its view after close; native `beforetoggle` updates
`data-state` before the discrete exit transition, so root and submenu exit
animations finish before display changes where CSS `overlay` transitions are
supported. Engines without that feature close immediately while preserving
state, focus restoration and reopening.

## Do

- Use it in app-like screens, such as an editor's toolbar.
- Name it with `aria-label`.
- Show keyboard shortcuts the app really binds.

## Don't

- Don't use it for site navigation; use Navigation Menu.
- Don't use it for one menu; use Dropdown Menu.
