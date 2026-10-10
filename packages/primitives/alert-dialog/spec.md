# Alert Dialog: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Alert and Message Dialogs](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/)

## Markup

The Dialog convention (see Dialog's `spec.md`): a root on an
`ng-container` and the content in an `ng-template` portal. Each part
composes the matching Dialog part.

```html
<ng-container ndAlertDialog [(open)]="open">
  <button ndAlertDialogTrigger>Delete project</button>
  <ng-template ndAlertDialogPortal>
    <div ndAlertDialogOverlay></div>
    <div ndAlertDialogContent>
      <h2 ndAlertDialogTitle>Delete this project?</h2>
      <p ndAlertDialogDescription>This can't be undone.</p>
      <button ndAlertDialogCancel>Cancel</button>
      <button ndAlertDialogAction (click)="delete()">Delete</button>
    </div>
  </ng-template>
</ng-container>
```

## Parts, roles and attributes

| Part                   | Selector                           | Role          | ARIA attributes                                     | Data attributes |
| ---------------------- | ---------------------------------- | ------------- | --------------------------------------------------- | --------------- |
| AlertDialog            | `[ndAlertDialog]`                  |               |                                                     |                 |
| AlertDialogTrigger     | `[ndAlertDialogTrigger]`           |               | `aria-haspopup`, `aria-expanded`, `aria-controls`   | `data-state`    |
| AlertDialogPortal      | `ng-template[ndAlertDialogPortal]` |               |                                                     |                 |
| AlertDialogOverlay     | `[ndAlertDialogOverlay]`           |               | `aria-hidden`                                       | `data-state`    |
| AlertDialogContent     | `[ndAlertDialogContent]`           | `alertdialog` | `aria-modal`, `aria-labelledby`, `aria-describedby` | `data-state`    |
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
- Everything else is Dialog's: focus trapped while open and returned on
  close, page scroll blocked, never rendered open on the server.

## Keyboard map

| Key           | Action                                                                          |
| ------------- | ------------------------------------------------------------------------------- |
| `Tab`         | Moves focus to the next focusable element inside; wraps from last to first.     |
| `Shift + Tab` | Moves focus to the previous focusable element inside; wraps from first to last. |
| `Escape`      | Closes the dialog, as Cancel does.                                              |

## Focus behavior

- On open: focus moves to AlertDialogCancel.
- While open: focus is trapped in the content.
- On close: focus returns to the element that had it before opening,
  usually the trigger.

## RTL behavior

Nothing mirrors.
