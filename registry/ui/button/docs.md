Buttons start actions: submitting a form, opening a dialog, saving a change.
`ndButton` styles a native `button`, or an `a` when the action navigates, so
both keep their native keyboard behavior and semantics. Six variants set the
emphasis, from `default` for the main action to `link` for an action that
reads like text, and eight sizes cover text and icon-only buttons.

## Do

- Use one `default` button for the main action of a view, and `outline`,
  `secondary` or `ghost` for the others.
- Put `ndButton` on an `a` with an `href` when the action navigates, so it
  opens in a new tab and shows its URL like any link.
- Give icon-only buttons (`size="icon"`) an `aria-label`.
- Use `destructive` for actions that delete or can't be undone, and confirm
  them in a dialog.

## Don't

- Don't put `ndButton` on a `div` or `span`; it only applies to `button` and
  `a`, which keyboard and screen reader users can operate.
- Don't disable a submit button to signal invalid input; keep it enabled and
  show the errors when it is pressed.
- Don't use `link` for a primary action; it is meant to read like text.
