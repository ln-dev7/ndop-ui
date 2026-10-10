# Context Menu: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Menu](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/), opened at the
pointer by a right click or long press on an area. The menu's own parts
are Menu's (see its `spec.md`).

## Markup

```html
<div [ndContextMenuTrigger]="actions" tabindex="0" aria-label="Canvas">…</div>
<ng-template #actions>
  <div ndMenuContent>…</div>
</ng-template>
```

## Parts, roles and attributes

| Part               | Selector                 | Role | ARIA attributes | Data attributes               |
| ------------------ | ------------------------ | ---- | --------------- | ----------------------------- |
| ContextMenuTrigger | `[ndContextMenuTrigger]` |      |                 | `data-state`, `data-disabled` |

- **ContextMenuTrigger** composes `CdkContextMenuTrigger`: its value is
  the menu's template. The `contextmenu` event (right click, long press,
  or the keyboard's context-menu key) opens it at the pointer, or at the
  trigger's corner when opened from the keyboard. `disabled` (default
  `false`) leaves the browser's own menu.
- `data-state` is `open` or `closed`.
- The area is the user's element. Give it a way in for keyboard users:
  focusable with a name, so the context-menu key and `Shift + F10` reach
  it, and offer the same actions elsewhere, such as a toolbar.

## Keyboard map

| Key           | Action                                                          |
| ------------- | --------------------------------------------------------------- |
| `Shift + F10` | On the focused area, opens the menu and focuses its first item. |

Inside the menu, Menu's keyboard map applies.

## Focus behavior

- Opening focuses the menu; closing returns focus to the area.

## RTL behavior

Submenus follow Menu's RTL behavior.
