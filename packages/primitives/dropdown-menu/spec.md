# Dropdown Menu: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Menu Button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/). The
menu's own parts are Menu's (see its `spec.md`).

## Markup

```html
<button [ndDropdownMenuTrigger]="actions" [(open)]="open">Actions</button>
<ng-template #actions>
  <div ndMenuContent>…</div>
</ng-template>
```

## Parts, roles and attributes

| Part                | Selector                  | Role | ARIA attributes                                   | Data attributes |
| ------------------- | ------------------------- | ---- | ------------------------------------------------- | --------------- |
| DropdownMenuTrigger | `[ndDropdownMenuTrigger]` |      | `aria-haspopup`, `aria-expanded`, `aria-controls` | `data-state`    |

- **DropdownMenuTrigger**, a `button`, composes `CdkMenuTrigger`: its
  value is the menu's template. `aria-haspopup="menu"`,
  `aria-expanded` while open, `aria-controls` the open menu.
- `open` is a `model()` (two-way `[(open)]`); unbound, it starts from
  `defaultOpen` after hydration. Menus never render on the server.
- `side` (`bottom` by default, `top`, `start`, `end`), `align`
  (`start` by default, `center`, `end`) and `sideOffset` (default
  `4`) place the menu, flipping to fit the viewport.
- `data-state` is `open` or `closed`.

## Keyboard map

| Key              | Action                                     |
| ---------------- | ------------------------------------------ |
| `Enter`, `Space` | Opens the menu and focuses its first item. |
| `ArrowDown`      | Opens the menu and focuses its first item. |
| `ArrowUp`        | Opens the menu and focuses its last item.  |

Inside the menu, Menu's keyboard map applies.

## Focus behavior

- Closing the menu returns focus to the trigger.

## RTL behavior

`start` and `end` sides are logical and swap in right-to-left layouts.
