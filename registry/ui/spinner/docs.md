---
keywords: loader, loading, busy, progress, activity indicator
---

A spinner shows that something is loading when you can't say how far it
has got. `ndSpinner` spins what's inside it, usually the `loader-circle`
icon, and announces itself as a status named "Loading", or what its
`label` says.

## Do

- Say what's loading with `label`, such as "Saving changes".
- Put it in a disabled button while that button's action runs, next to
  the button's text.
- Use Progress instead when you know how far the task has got.

## Don't

- Don't show several spinners for one task.
- Don't use it for anything that takes more than a few seconds without
  saying what's happening.
