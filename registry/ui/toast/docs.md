---
keywords: toast, sonner, notification, snackbar, message, saved, undo, alert
---

A toast is a brief message about something that just happened, such as
"Saved" or "Message sent", in a corner of the screen. Toasts stack, newest
in front, and spread out while hovered or focused; they're announced
politely by screen readers, without moving focus, and go away after four
seconds unless the pointer or focus is on them. F8 jumps to them. Show
one with `inject(Toaster).show({ title: 'Saved' })`, and put the
region in your app's shell once, with `toaster = inject(Toaster)`:

```html
<ng-template ndToaster>
  <section ndToastRegion>
    <ol ndToastList>
      @for (toast of toaster.toasts(); track toast.id) {
      <li [ndToast]="toast">
        <div ndToastContent>
          <p ndToastTitle>{{ toast.title }}</p>
          @if (toast.description) {
          <p ndToastDescription>{{ toast.description }}</p>
          }
        </div>
        @if (toast.action; as action) {
        <button ndToastAction>{{ action.label }}</button>
        }
        <button ndToastClose aria-label="Close"><svg ndIcon="x"></svg></button>
      </li>
      }
    </ol>
  </section>
</ng-template>
```

## Do

- Keep it short, and say what happened: "Event created".
- Offer Undo as its action for things that can be undone.
- Use `duration: Infinity` for toasts people must act on.

## Don't

- Don't use a toast as the only place an error is shown: it disappears.
- Don't show several at once for one action.
