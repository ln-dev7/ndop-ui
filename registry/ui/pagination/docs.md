---
keywords: pager, pages, paging, next, previous
---

Pagination moves between pages of results. It's a `nav` landmark named
"Pagination" with a list of links, styled as buttons: ghost for other
pages, outlined for the current one, which is marked
`aria-current="page"`. The previous and next links are named for screen
readers, and their chevrons turn around in right-to-left layouts.

## Do

- Use links with an `href` (or `routerLink`) when each page has a URL, so
  pages can be bookmarked and opened in a new tab.
- Use `button[ndPaginationLink]` when the page lives only in component
  state, and keep `active` in sync.
- Show the first, last and nearby pages, with `ndPaginationEllipsis` for
  the gaps.

## Don't

- Don't paginate a short list that fits on one page.
- Don't leave out the previous and next links on long ranges.
