---
keywords: table, grid, rows, columns, data, invoice, list
---

Table styles a native HTML table: its caption, header, body, footer, rows
and cells. Because each part is the table's own element, screen readers
announce rows, columns and headers as they should. Wrap it in
`ndTableContainer` so a wide table scrolls sideways instead of the page.

## Do

- Name the table with `caption[ndTableCaption]`, or `aria-label` when a
  visible caption doesn't fit the design.
- Give header cells a `scope`: `col` for column headers, `row` for row
  headers.
- Use Data Table for sorting, filtering, selection and pagination.

## Don't

- Don't use a table for layout; use flex or grid.
- Don't put interactive controls in every cell without labels that say
  which row they act on.
