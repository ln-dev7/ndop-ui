# Toast: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

No APG pattern. Toasts are brief messages in a
[live region](https://www.w3.org/TR/wai-aria-1.2/#aria-live), announced
without moving focus, in a landmark region that `F8` reaches.

## Markup

`NdToaster` is an injectable service that holds the toasts; the app puts
one region in its shell, inside an `ng-template` the primitive renders
into a CDK global overlay, above everything else.

```html
<ng-template ndToaster>
  <section ndToastRegion>
    <ol>
      @for (toast of toaster.toasts(); track toast.id) {
      <li [ndToast]="toast">
        <p ndToastTitle>{{ toast.title }}</p>
        <button ndToastClose aria-label="Close">×</button>
      </li>
      }
    </ol>
  </section>
</ng-template>
```

```ts
inject(NdToaster).show({ title: 'Saved', description: 'Your changes are live.' });
```

## Parts, roles and attributes

| Part             | Selector                 | Role     | ARIA attributes                            | Data attributes                                         |
| ---------------- | ------------------------ | -------- | ------------------------------------------ | ------------------------------------------------------- |
| Toaster          | `ng-template[ndToaster]` |          |                                            |                                                         |
| ToastRegion      | `[ndToastRegion]`        | `region` | `aria-label`, `aria-live`, `aria-relevant` | `data-expanded`                                         |
| Toast            | `[ndToast]`              |          | `aria-atomic`                              | `data-type`, `data-index`, `data-front`, `data-swiping` |
| ToastTitle       | `[ndToastTitle]`         |          |                                            |                                                         |
| ToastDescription | `[ndToastDescription]`   |          |                                            |                                                         |
| ToastAction      | `button[ndToastAction]`  |          |                                            |                                                         |
| ToastClose       | `button[ndToastClose]`   |          |                                            |                                                         |

- **NdToaster** (`providedIn: 'root'`): `show(options)` adds a toast
  and returns its id; `dismiss(id)` removes one, `dismiss()` all. A
  toast has a `title`, an optional `description`, a `type`
  (`default`, `success`, `info`, `warning`, `error`, or
  `loading`), an optional `action` (`label` and `onClick`) and a
  `duration` (default `4000` ms; `Infinity` stays until dismissed).
  `toasts` lists them, newest first. Toasts exist in the browser only.
- **Toaster** renders its template into a global overlay once the app
  has hydrated, so the region exists before the first toast and its
  announcements are heard.
- **ToastRegion**: `role="region"`, labelled "Notifications" plus the
  shortcut ("Notifications (F8)") unless it has its own `aria-label`;
  `aria-live="polite"` and `aria-relevant="additions text"`, so new
  toasts are announced and removed ones aren't. `tabindex="-1"` so F8
  can focus it. While the pointer is over it or focus is inside it,
  timers pause and `data-expanded` is set, for the styled layer to
  spread the stack out.
- **Toast** takes its record as its value: `aria-atomic="true"`, so it's
  read whole. `data-type` is its type, `data-index` its position (0 is
  newest), `data-front` marks the newest; `--nd-toast-index` and
  `--nd-toast-swipe` (the swipe distance) are custom properties for
  stacking and swiping. Swiping it toward the end side past 50 pixels
  dismisses it; less springs back.
- **ToastAction** runs the toast's action, then dismisses it.
  **ToastClose** dismisses it; give it a name such as
  `aria-label="Close"`.
- An error toast's message must not be the only place an error is shown:
  it disappears.

## Keyboard map

| Key      | Action                                                  |
| -------- | ------------------------------------------------------- |
| `F8`     | Focuses the toast region from anywhere on the page.     |
| `Tab`    | Moves through the toasts' buttons, then on to the page. |
| `Escape` | With focus in a toast, dismisses it.                    |

## Focus behavior

- Toasts never take focus. F8 moves focus to the region; while it's
  there, nothing times out.
- When a toast with focus inside is dismissed, focus moves to the region.

## RTL behavior

Toasts swipe toward the end side, so to the left in right-to-left
layouts. Direction comes from the nearest `dir` attribute.
