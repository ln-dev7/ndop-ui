# Drawer: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/):
a drawer is a modal dialog that slides in from an edge of the screen and
can be dragged back out.

## Markup

The Dialog convention (see Dialog's `spec.md`). Each part composes the
matching Dialog part.

```html
<ng-container ndDrawer [(open)]="open">
  <button ndDrawerTrigger>Open</button>
  <ng-template ndDrawerPortal>
    <div ndDrawerOverlay></div>
    <div ndDrawerContent>
      <div ndDrawerHandle></div>
      <h2 ndDrawerTitle>Move goal</h2>
      <button ndDrawerClose>Done</button>
    </div>
  </ng-template>
</ng-container>
```

## Parts, roles and attributes

| Part              | Selector                      | Role     | ARIA attributes                                     | Data attributes                                 |
| ----------------- | ----------------------------- | -------- | --------------------------------------------------- | ----------------------------------------------- |
| Drawer            | `[ndDrawer]`                  |          |                                                     |                                                 |
| DrawerTrigger     | `[ndDrawerTrigger]`           |          | `aria-haspopup`, `aria-expanded`, `aria-controls`   | `data-state`                                    |
| DrawerPortal      | `ng-template[ndDrawerPortal]` |          |                                                     |                                                 |
| DrawerOverlay     | `[ndDrawerOverlay]`           |          | `aria-hidden`                                       | `data-state`                                    |
| DrawerContent     | `[ndDrawerContent]`           | `dialog` | `aria-modal`, `aria-labelledby`, `aria-describedby` | `data-state`, `data-direction`, `data-dragging` |
| DrawerHandle      | `[ndDrawerHandle]`            |          | `aria-hidden`                                       |                                                 |
| DrawerTitle       | `[ndDrawerTitle]`             |          |                                                     |                                                 |
| DrawerDescription | `[ndDrawerDescription]`       |          |                                                     |                                                 |
| DrawerClose       | `[ndDrawerClose]`             |          |                                                     |                                                 |

- **Drawer**: as Dialog, `open` is a `model()` with `defaultOpen`, plus
  `closeOnEscape` and `closeOnOverlayClick`.
- **DrawerContent**: Dialog's content (`role="dialog"`, `aria-modal`,
  labelled and described). `direction` is the edge it comes from:
  `bottom` (default), `top`, `start` or `end`, set as `data-direction`;
  `start` and `end` are logical, so they swap in right-to-left layouts.
- **Dragging**: a pointer pressed on the content, outside form fields,
  editable text and elements marked `data-no-drag`, drags it toward its
  edge once it has moved 4 pixels, so presses on buttons stay clicks. While dragging, the content
  has `data-dragging` and the distance in the `--nd-drawer-drag` custom
  property (a length, `0px` at rest), for the styled layer to translate
  it; the primitive sets no styles. Released past a quarter of its size,
  or flicked quickly toward the edge, it closes; otherwise it returns.
  Dragging away from the edge does nothing. Dragging is a pointer-only
  shortcut: Escape, DrawerClose and the overlay close it too.
- **DrawerHandle** is a decorative grip, `aria-hidden="true"`.
- Reduced motion: the drawer moves with the pointer either way; the
  styled layer turns its transitions off under
  `prefers-reduced-motion`.

## Keyboard map

| Key           | Action                                                                          |
| ------------- | ------------------------------------------------------------------------------- |
| `Tab`         | Moves focus to the next focusable element inside; wraps from last to first.     |
| `Shift + Tab` | Moves focus to the previous focusable element inside; wraps from first to last. |
| `Escape`      | Closes the drawer, unless `closeOnEscape` is `false`.                           |

## Focus behavior

As Dialog: focus moves into the content on open, is trapped while open,
and returns on close.

## RTL behavior

`start` and `end` drawers come from the right and left in right-to-left
layouts, and are dragged toward those edges. Direction comes from the
nearest `dir` attribute.
