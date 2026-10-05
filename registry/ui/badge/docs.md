---
keywords: tag, chip, pill, status, count
---

A badge marks something with a short status, count or label, such as
"Beta", "3 new" or a version. `ndBadge` only styles its host, so a badge is
as accessible as the element it's on: plain text in a `span`, a link in an
`a`, an item in a list. Six variants set the emphasis, from `default` to
`link`.

## Do

- Keep the text to a word or two, or a number.
- Put `ndBadge` on an `a` with an `href` when the badge leads somewhere; it
  then gets a hover style.
- When a badge's meaning depends on its color, also say it in the text, such
  as "Failed" rather than a red dot.
- Give a group of badges a list (`ul` with `li[ndBadge]`) and a label when
  they belong together.

## Don't

- Don't put a click handler on a `span[ndBadge]`; use a button for actions
  so keyboard and screen reader users can operate it.
- Don't use a badge for long text or sentences; use an alert or plain text.
