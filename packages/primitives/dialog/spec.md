# Dialog: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

## Markup

This markup is the overlay convention Popover and Tooltip reuse (ADR-0004):
a root directive on an `ng-container`, so Ndop adds no element, and overlay
content inside an `ng-template` portal that is attached to the CDK overlay
while open.

```html
<ng-container ndDialog [(open)]="open">
  <button ndDialogTrigger>Edit profile</button>
  <ng-template ndDialogPortal>
    <div ndDialogOverlay></div>
    <div ndDialogContent>
      <h2 ndDialogTitle>Edit profile</h2>
      <p ndDialogDescription>Changes are saved when you close.</p>
      <button ndDialogClose>Close</button>
    </div>
  </ng-template>
</ng-container>
```

## Parts, roles and attributes

| Part              | Selector                      | Role     | ARIA attributes                                     | Data attributes |
| ----------------- | ----------------------------- | -------- | --------------------------------------------------- | --------------- |
| Dialog            | `[ndDialog]`                  |          |                                                     |                 |
| DialogTrigger     | `[ndDialogTrigger]`           |          | `aria-haspopup`, `aria-expanded`, `aria-controls`   | `data-state`    |
| DialogPortal      | `ng-template[ndDialogPortal]` |          |                                                     |                 |
| DialogOverlay     | `[ndDialogOverlay]`           |          | `aria-hidden`                                       | `data-state`    |
| DialogContent     | `[ndDialogContent]`           | `dialog` | `aria-modal`, `aria-labelledby`, `aria-describedby` | `data-state`    |
| DialogTitle       | `[ndDialogTitle]`             |          |                                                     |                 |
| DialogDescription | `[ndDialogDescription]`       |          |                                                     |                 |
| DialogClose       | `[ndDialogClose]`             |          |                                                     |                 |

- **Dialog**: `open` is a `model()` (two-way `[(open)]`); unbound, it starts
  from the `defaultOpen` input (default `false`). Inputs
  `closeOnEscape` and `closeOnOverlayClick` (both default `true`).
- **DialogTrigger** (a `button`): toggles `open` on click.
  `aria-haspopup="dialog"`; `aria-expanded` mirrors `open`;
  `aria-controls` points at the content id only while open, since the
  content doesn't exist when closed.
- **DialogOverlay**: optional backdrop element; `aria-hidden="true"`;
  clicking it closes the dialog when `closeOnOverlayClick` is `true`.
- **DialogContent**: `role="dialog"`, `aria-modal="true"`,
  `tabindex="-1"`; `aria-labelledby` and `aria-describedby` point at the
  title and description when present.
- **DialogTitle** and **DialogDescription**: get generated ids, stable
  across SSR and hydration, unless they already have one.
- **DialogClose** (a `button`): closes the dialog on click.
- `data-state` is `open` or `closed` on trigger, overlay and content.
- While open, page scroll is blocked.
- Server rendering: the dialog never renders open on the server. A
  `defaultOpen` or bound `open` of `true` opens it after hydration.

## Keyboard map

| Key           | Action                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| `Tab`         | Moves focus to the next focusable element inside the dialog; from the last one, wraps to the first.     |
| `Shift + Tab` | Moves focus to the previous focusable element inside the dialog; from the first one, wraps to the last. |
| `Escape`      | Closes the dialog, unless `closeOnEscape` is `false`.                                                   |

## Focus behavior

- On open: focus moves to the first focusable element in the content, or to
  the content element itself when it has none.
- While open: focus is trapped in the content.
- On close: focus returns to the element that had it before opening, usually
  the trigger.

## RTL behavior

Nothing mirrors: the dialog is centered, and Tab order follows the DOM.
