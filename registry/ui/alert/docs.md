---
keywords: callout, banner, notice, message, warning, error
---

An alert is a callout that draws attention to a message: a warning, an
error, a confirmation. It has an optional icon, a title and a
description, laid out in a grid. It's announced with the `alert` role by
default, which interrupts screen readers; set `role="status"` for news
that can wait, or `role="none"` for a callout that's part of the page.

## Do

- Write a short title that says what happened, and a description that
  says what to do.
- Use `variant="destructive"` for errors, and say it in the text too.
- Use `role="none"` for alerts rendered with the page, and keep `alert`
  for ones that appear after something the user did.

## Don't

- Don't use an alert for a notification that should disappear on its
  own; use a toast.
- Don't put several `role="alert"` messages on a page at once.
