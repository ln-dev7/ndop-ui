---
keywords: panel, tile, container, surface, box
---

A card groups related content and actions on a bordered surface: a
summary, a form, a setting. `ndCard` and its parts only style the
elements they're on, so you choose the semantics: a `section` with a
heading, an `article` in a feed, or a plain `div`.

## Do

- Give each card a heading with `ndCardTitle`, at the right level for the
  page.
- Use `section` with `aria-labelledby` pointing at the title when the
  card is a meaningful region, or `article` when it stands alone.
- Put the card's main action in `ndCardFooter` or `ndCardAction`.

## Don't

- Don't make a whole card clickable with a handler on the `div`; put a
  link or button inside it.
- Don't nest cards; use separators or headings inside one card.
