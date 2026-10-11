---
keywords: data table, datatable, grid, sortable table, pagination, filter, row selection, columns
---

A data table shows rows you can sort, search, page through and select,
and whose columns you can hide. Its state is `createDataTable`, a few
signals in your component: it renders nothing, so you mark up a native
`table` with the Table item's parts, a Checkbox for selection, an Input
for search and a Dropdown Menu for columns. It's all copy-in code with no
dependency, renders on the server and needs no zone.

## Do

- Bind each sortable header's `aria-sort` to `table.ariaSort(id)`, and
  sort with a `DataTableSortButton` in it.
- Give rows a stable id with `rowId`, so selection survives sorting.
- Say how many rows are selected and which page is shown, in text.

## Don't

- Don't use it for a few static rows; use Table.
- Don't make whole rows clickable without a link or button in them.
