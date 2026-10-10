# Menu: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Menu](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/), on
`@angular/cdk/menu` (ADR-0004, amendment 3). These are the parts every
menu shares; Dropdown Menu and Context Menu add the trigger that opens
one, each with its own `spec.md`.

## Markup

A menu is an `ng-template` its trigger renders into a CDK overlay.

```html
<ng-template #actions>
  <div ndMenuContent>
    <div ndMenuGroup>
      <div ndMenuItem (triggered)="edit()">Edit</div>
      <div ndMenuItem disabled>Share</div>
    </div>
    <div ndMenuSeparator></div>
    <div ndMenuItemCheckbox [(checked)]="pinned">Pinned</div>
    <div ndMenuRadioGroup [(value)]="sort">
      <div ndMenuItemRadio value="name">Name</div>
      <div ndMenuItemRadio value="date">Date</div>
    </div>
    <div [ndMenuSubTrigger]="more">More</div>
  </div>
</ng-template>
```

## Parts, roles and attributes

| Part              | Selector                | Role               | ARIA attributes                                   | Data attributes               |
| ----------------- | ----------------------- | ------------------ | ------------------------------------------------- | ----------------------------- |
| MenuContent       | `[ndMenuContent]`       | `menu`             | `aria-orientation`                                | `data-state`, `data-side`     |
| MenuItem          | `[ndMenuItem]`          | `menuitem`         | `aria-disabled`                                   | `data-disabled`               |
| MenuItemCheckbox  | `[ndMenuItemCheckbox]`  | `menuitemcheckbox` | `aria-checked`, `aria-disabled`                   | `data-state`, `data-disabled` |
| MenuRadioGroup    | `[ndMenuRadioGroup]`    | `group`            |                                                   |                               |
| MenuItemRadio     | `[ndMenuItemRadio]`     | `menuitemradio`    | `aria-checked`, `aria-disabled`                   | `data-state`, `data-disabled` |
| MenuItemIndicator | `[ndMenuItemIndicator]` |                    |                                                   | `data-state`                  |
| MenuGroup         | `[ndMenuGroup]`         | `group`            |                                                   |                               |
| MenuLabel         | `[ndMenuLabel]`         |                    |                                                   |                               |
| MenuSeparator     | `[ndMenuSeparator]`     | `separator`        |                                                   |                               |
| MenuSubTrigger    | `[ndMenuSubTrigger]`    | `menuitem`         | `aria-haspopup`, `aria-expanded`, `aria-controls` | `data-state`, `data-disabled` |

- **MenuContent** composes `CdkMenu`. `data-state` is `open`;
  `data-side` is the side of its trigger it was asked to open on.
- Items are `div`s, as in the APG examples: on a `button`, browsers turn
  Space and Enter into a click, which always closes the menu.
- **MenuItem** composes `CdkMenuItem`: activating it emits `triggered`
  and closes every open menu. `disabled` (default `false`) sets
  `aria-disabled` and removes any native `disabled` attribute: disabled
  items stay focusable, as the APG allows, and do nothing.
- **MenuItemCheckbox**: `checked` is a `model()` (two-way
  `[(checked)]`); activating it flips `checked`.
- **MenuRadioGroup** holds the value of its radios: `value` is a
  `model()` (two-way `[(value)]`), `null` when none is checked.
  **MenuItemRadio** has a required `value`; activating it makes it the
  group's.
- **MenuItemIndicator**, inside a checkbox or radio item, has the
  `hidden` attribute while its item is unchecked.
- **MenuGroup** and **MenuRadioGroup** have `role="group"`; name them
  with `aria-labelledby` pointing at a **MenuLabel**, which is otherwise
  plain text.
- **MenuSubTrigger** is an item that opens the menu in the template it's
  given, beside its own.
- `data-state` is `checked` or `unchecked` on checkbox and radio items,
  `open` or `closed` on sub-triggers. `data-disabled` marks disabled
  items.

## Keyboard map

| Key                    | Action                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `ArrowDown`, `ArrowUp` | Moves focus to the next or previous item, wrapping.                                |
| `Home`, `End`          | Moves focus to the first or last item.                                             |
| `Enter`                | Activates the focused item and closes the menu.                                    |
| `Space`                | Activates the focused item; checkbox and radio items keep the menu open.           |
| `ArrowRight`           | On a sub-trigger, opens its menu and focuses the first item.                       |
| `ArrowLeft`            | In a submenu, closes it and focuses its sub-trigger.                               |
| `Escape`               | Closes the current menu and returns focus to what opened it.                       |
| `Tab`                  | Closes every open menu and moves focus on from the trigger.                        |
| `a`                    | Typeahead: moves focus to the next item whose label starts with the typed letters. |

## Focus behavior

- Opened from the keyboard, a menu focuses its first item (its last with
  `ArrowUp` on a Dropdown Menu trigger); opened with the pointer, the
  menu itself.
- Closing returns focus to the trigger or sub-trigger.

## RTL behavior

`ArrowLeft` opens submenus and `ArrowRight` closes them, and submenus
open on the left. Direction comes from the app's `Directionality`: the
document's `dir`, or a CDK `[dir]` directive.
