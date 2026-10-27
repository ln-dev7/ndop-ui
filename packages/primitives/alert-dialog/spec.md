# Alert Dialog: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Alert and Message Dialogs](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/)

## Markup

The Dialog convention (see Dialog's `spec.md`): a root on an
`ng-container` and native `dialog` content in its declaring view. Each part
composes the matching Dialog part.

```html
<ng-container ndAlertDialog [(open)]="open">
  <button ndAlertDialogTrigger>Delete project</button>
  <dialog ndAlertDialogContent>
    <h2 ndAlertDialogTitle>Delete this project?</h2>
    <p ndAlertDialogDescription>This can't be undone.</p>
    <button ndAlertDialogCancel>Cancel</button>
    <button ndAlertDialogAction (click)="delete()">Delete</button>
  </dialog>
</ng-container>
```

## Parts, roles and attributes

| Part                   | Selector                           | Role          | ARIA attributes                                     | Data attributes |
| ---------------------- | ---------------------------------- | ------------- | --------------------------------------------------- | --------------- |
| AlertDialog            | `[ndAlertDialog]`                  |               |                                                     |                 |
| AlertDialogTrigger     | `[ndAlertDialogTrigger]`           |               | `aria-haspopup`, `aria-expanded`, `aria-controls`   | `data-state`    |
| AlertDialogPortal      | `ng-template[ndAlertDialogPortal]` |               |                                                     |                 |
| AlertDialogContent     | `dialog[ndAlertDialogContent]`     | `alertdialog` | `aria-modal`, `aria-labelledby`, `aria-describedby` | `data-state`    |
| AlertDialogTitle       | `[ndAlertDialogTitle]`             |               |                                                     |                 |
| AlertDialogDescription | `[ndAlertDialogDescription]`       |               |                                                     |                 |
| AlertDialogCancel      | `button[ndAlertDialogCancel]`      |               |                                                     |                 |
| AlertDialogAction      | `button[ndAlertDialogAction]`      |               |                                                     |                 |

- **AlertDialog**: as Dialog, `open` is a `model()` with `defaultOpen`.
  It asks the user to confirm or cancel, so it can't be dismissed by
  clicking outside: the overlay doesn't close it. Escape cancels it, as
  the APG pattern says.
- **AlertDialogContent**: `role="alertdialog"`, `aria-modal="true"`,
  `tabindex="-1"`, labelled by the title and described by the
  description, which every alert dialog should have.
- **AlertDialogCancel** and **AlertDialogAction** close the dialog on
  click; the action's own `(click)` handler runs first. When the dialog
  opens, focus goes to Cancel, the least destructive choice.
- Everything else is Dialog's: the background page inert while open and focus returned on
  close, page scroll blocked, never rendered open on the server.

## Keyboard map

| Key           | Action                                                                                                            |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| `Tab`         | Moves forward through native focusable controls. Browser controls remain reachable; the background page is inert. |
| `Shift + Tab` | Moves backward through native focusable controls; browser controls remain reachable.                              |
| `Escape`      | Closes the dialog, as Cancel does.                                                                                |

## Focus behavior

- On open: focus moves to AlertDialogCancel.
- While open: the background page is inert. Native Tab navigation may visit
  browser controls before returning to the dialog; Ndop does not trap browser UI.
- On close: focus returns to the element that had it before opening,
  usually the trigger.

## RTL behavior

Nothing mirrors.

## Native rendering

The panel is a native `<dialog>` opened with `showModal()` (ADR-0032).
The browser owns modal inertness and focus containment. Browser `close` and
`cancel` events keep the open model synchronized; content never opens on the
server. Use the dialog's `::backdrop` instead of a separate overlay element.
The legacy portal directive is an optional local-view compatibility adapter.
