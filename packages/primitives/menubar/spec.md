# Menubar: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Menubar](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)

## Markup

A horizontal bar of menu triggers, like a desktop app's File and Edit
menus. Each trigger opens a menu built from `@ndop/primitives/menu`'s
parts, in an `ng-template`.

```html
<div ndMenubar aria-label="Editor">
  <div [ndMenubarTrigger]="file">File</div>
  <div [ndMenubarTrigger]="edit">Edit</div>
</div>
<ng-template #file>
  <div ndMenuContent>
    <div ndMenuItem>New tab</div>
  </div>
</ng-template>
```

## Parts, roles and attributes

| Part           | Selector             | Role       | ARIA attributes                                   | Data attributes |
| -------------- | -------------------- | ---------- | ------------------------------------------------- | --------------- |
| Menubar        | `[ndMenubar]`        | `menubar`  | `aria-orientation`, `tabindex`                    |                 |
| MenubarTrigger | `[ndMenubarTrigger]` | `menuitem` | `aria-haspopup`, `aria-expanded`, `aria-controls` | `data-state`    |

- **Menubar** composes the CDK's `CdkMenuBar`. Name it with `aria-label`
  or `aria-labelledby`. It is the tab stop: focusing it focuses its first
  trigger, and its triggers have `tabindex="-1"`.
- **MenubarTrigger** composes `CdkMenuItem` and `CdkMenuTrigger`. Its value
  is the `ng-template` of the menu it opens, which opens below it,
  aligned to its start, flipping to fit the viewport. Use a `div`: on a
  `button`, browsers turn `Space` into a click, which would close the menu
  right after opening it. `data-state` is `open` or `closed`.
- The menus' parts, their roles and keys are Menu's, as in Dropdown Menu.

## Keyboard map

| Key                       | Action                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `Tab`                     | Moves focus into the menubar, to its first trigger; from a trigger, out of the menubar.                      |
| `ArrowRight`, `ArrowLeft` | Moves focus to the next or previous trigger, wrapping; if a menu is open, opens that trigger's menu instead. |
| `ArrowDown`               | On a trigger, opens its menu and focuses its first item.                                                     |
| `Enter`, `Space`          | On a trigger, opens its menu and focuses its first item.                                                     |
| `Escape`                  | Closes the open menu and returns focus to its trigger.                                                       |

## Focus behavior

- The menubar is one tab stop, whose focus goes to its first trigger.
- Closing a menu returns focus to its trigger.
- While one menu is open, hovering another trigger opens its menu.

## RTL behavior

In right-to-left layouts, the bar runs from right to left: `ArrowLeft` moves
to the next trigger and `ArrowRight` to the previous one, and menus align
to the trigger's right edge. Direction comes from the app's
`Directionality`: the document's `dir`, or a CDK `[dir]` directive.
