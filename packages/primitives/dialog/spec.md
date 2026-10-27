# Dialog: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

## Markup

Content is a native `<dialog>` in the declaring Angular view (ADR-0032).
The browser supplies modal top-layer rendering, inertness, focus containment
and Escape cancellation. `ng-template[ndDialogPortal]` remains a compatibility
adapter for lazy local views; it no longer uses a CDK overlay or portal.

```html
<ng-container ndDialog [(open)]="open">
  <button ndDialogTrigger>Edit profile</button>
  <dialog ndDialogContent>
    <h2 ndDialogTitle>Edit profile</h2>
    <p ndDialogDescription>Changes are saved when you close.</p>
    <button ndDialogClose>Close</button>
  </dialog>
</ng-container>
```

## Parts, roles and attributes

| Part              | Selector                      | Role     | ARIA attributes                                     | Data attributes |
| ----------------- | ----------------------------- | -------- | --------------------------------------------------- | --------------- |
| Dialog            | `[ndDialog]`                  |          |                                                     |                 |
| DialogTrigger     | `[ndDialogTrigger]`           |          | `aria-haspopup`, `aria-expanded`, `aria-controls`   | `data-state`    |
| DialogPortal      | `ng-template[ndDialogPortal]` |          |                                                     |                 |
| DialogContent     | `dialog[ndDialogContent]`     | `dialog` | `aria-modal`, `aria-labelledby`, `aria-describedby` | `data-state`    |
| DialogTitle       | `[ndDialogTitle]`             |          |                                                     |                 |
| DialogDescription | `[ndDialogDescription]`       |          |                                                     |                 |
| DialogClose       | `[ndDialogClose]`             |          |                                                     |                 |

- **Dialog**: `open` is a `model()` (two-way `[(open)]`); unbound, it starts
  from the `defaultOpen` input (default `false`). Inputs
  `closeOnEscape` and `closeOnOverlayClick` (both default `true`).
- **DialogTrigger** (a `button`): toggles `open` on click.
  `aria-haspopup="dialog"`; `aria-expanded` mirrors `open`;
  `aria-controls` points at the content id only while open, so the trigger only controls an active dialog.
- **Backdrop**: use `::backdrop` on the native dialog. Clicking outside the
  panel closes it when `closeOnOverlayClick` is `true`; clicking panel padding
  or dragging from inside to outside does not. Separate overlay elements are
  no longer needed.
- **DialogContent**: `role="dialog"`, `aria-modal="true"`,
  `tabindex="-1"`; `aria-labelledby` and `aria-describedby` point at the
  title and description when present.
- **DialogTitle** and **DialogDescription**: get generated ids, stable
  across SSR and hydration, unless they already have one.
- **DialogClose** (a `button`): closes the dialog on click.
- `data-state` is `open` or `closed` on trigger and content. Legacy overlay directives are compatibility-only;
  new markup uses the native `::backdrop`.
- While open, a reference-counted fixed-body lock preserves the document position; native inertness alone does not block scrolling. A passive viewport-only guard covers WebKit scrolling through the fixed body; scrolling inside modal content remains available.
- Server rendering: the dialog never renders open on the server. A
  `defaultOpen` or bound `open` of `true` opens it after hydration.

## Keyboard map

| Key           | Action                                                                                                            |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| `Tab`         | Moves forward through native focusable controls. Browser controls remain reachable; the background page is inert. |
| `Shift + Tab` | Moves backward through native focusable controls; browser controls remain reachable.                              |
| `Escape`      | Closes the dialog, unless `closeOnEscape` is `false`.                                                             |

## Focus behavior

- On open: native dialog focusing steps honor `autofocus`, then choose the
  first focusable descendant, or the dialog itself.
- While open: the background page is inert. Native Tab navigation may visit
  browser controls before returning to the dialog; Ndop does not trap browser UI.
- On close: focus returns to the element that had it before opening, usually
  the trigger.

## RTL behavior

Nothing mirrors: the dialog is centered, and Tab order follows the DOM.

## Native state, lifecycle and animation

`cancel` honors `closeOnEscape`; `close` synchronizes `[(open)]`, including
`method="dialog"` forms and calls to `HTMLDialogElement.close()`. A queued close
event from a previous opening cannot reset a dialog that has already reopened.
The content stays in its declaring view while closed, so user form state and
exit animations survive. Core styles use discrete `display` / `overlay`
transitions, `@starting-style` for the backdrop and reduced-motion handling.
A disconnected focus return target is ignored.
