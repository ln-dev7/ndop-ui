---
keywords: progress bar, loading, upload, percentage, meter
---

A progress bar shows how far a task has got: an upload, an installation,
the steps of a form. It's announced as a `progressbar` with its value and
percentage, and fills from the start side, so from the right in
right-to-left layouts. Leave `value` empty while you can't say how far
it has got, and it pulses instead.

## Do

- Name it with `aria-label` or `aria-labelledby`, such as "Upload".
- Show the percentage or what's left in text next to it, too.
- Use a Spinner instead when there's no measure of progress at all.

## Don't

- Don't use it to show a static quantity, such as storage used; that's a
  meter.
- Don't move it backwards.
