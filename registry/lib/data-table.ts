import { computed, signal, type Signal } from '@angular/core';

/** One column of a {@link DataTable}. */
export interface DataTableColumn<T> {
  /** A unique id, used for sorting, visibility and `aria-sort`. */
  readonly id: string;
  /** The header's text, also shown where columns are listed. */
  readonly header: string;
  /** The cell's value, for sorting and filtering; defaults to `row[id]`. */
  readonly value?: (row: T) => unknown;
  /** Whether the header can sort by it. */
  readonly sortable?: boolean;
  /** Whether it can be hidden; defaults to `true`. */
  readonly hideable?: boolean;
  /** Orders two values; defaults to numbers, dates, then text. */
  readonly compare?: (a: unknown, b: unknown) => number;
}

/** Which way a column sorts. */
export type DataTableDirection = 'ascending' | 'descending';

/** The column the rows are sorted by. */
export interface DataTableSort {
  /** The column's id. */
  readonly id: string;
  /** Which way it sorts. */
  readonly direction: DataTableDirection;
}

/** A row shown on the current page, with its id. */
export interface DataTableRow<T> {
  /** The row's id, for selection and `track`. */
  readonly id: string;
  /** The row's data. */
  readonly data: T;
}

/** What {@link createDataTable} needs. */
export interface DataTableOptions<T> {
  /** The rows, such as a signal or an input. */
  readonly data: () => readonly T[];
  /** The columns, in order. */
  readonly columns: readonly DataTableColumn<T>[];
  /** A row's id; defaults to its index in `data`. */
  readonly rowId?: (row: T, index: number) => string;
  /** Rows per page; defaults to 10. */
  readonly pageSize?: number;
  /**
   * Whether a row matches the search; defaults to any column's value
   * containing it, ignoring case.
   */
  readonly filter?: (row: T, query: string) => boolean;
}

/**
 * A data table's state, on signals: sorting, searching, pages, selected
 * rows and hidden columns, with the rows to show. It renders nothing:
 * mark up a `table` with the Table item's parts and loop over `rows()`
 * and `visibleColumns()`.
 */
export interface DataTable<T> {
  /** The columns, in order. */
  readonly columns: readonly DataTableColumn<T>[];
  /** The search text. */
  readonly query: Signal<string>;
  /** The sort, or `null` for the data's order. */
  readonly sort: Signal<DataTableSort | null>;
  /** The current page, from 0. */
  readonly pageIndex: Signal<number>;
  /** Rows per page. */
  readonly pageSize: Signal<number>;
  /** How many pages the matching rows fill, at least 1. */
  readonly pageCount: Signal<number>;
  /** The rows matching the search, sorted, on every page. */
  readonly matchingRows: Signal<readonly DataTableRow<T>[]>;
  /** The rows to show: the current page of {@link DataTable.matchingRows}. */
  readonly rows: Signal<readonly DataTableRow<T>[]>;
  /** The columns not hidden. */
  readonly visibleColumns: Signal<readonly DataTableColumn<T>[]>;
  /** The selected rows' ids. */
  readonly selection: Signal<ReadonlySet<string>>;
  /** Whether every row on the page is selected. */
  readonly pageSelected: Signal<boolean>;
  /** Whether some, but not all, rows on the page are selected. */
  readonly pagePartlySelected: Signal<boolean>;
  /** Whether there is a previous page. */
  readonly canPrevious: Signal<boolean>;
  /** Whether there is a next page. */
  readonly canNext: Signal<boolean>;
  /**
   * Sets the search text and goes back to the first page.
   *
   * @param query - What to search for.
   */
  search(query: string): void;
  /**
   * Sorts by a column: ascending, then descending, then not at all.
   *
   * @param id - The column's id.
   */
  toggleSort(id: string): void;
  /**
   * The `aria-sort` value for a column's header.
   *
   * @param id - The column's id.
   * @returns `ascending`, `descending`, or `none` for a sortable column
   *   that isn't sorted, `null` otherwise.
   */
  ariaSort(id: string): DataTableDirection | 'none' | null;
  /**
   * Shows a page.
   *
   * @param index - The page, from 0; kept within the pages there are.
   */
  goTo(index: number): void;
  /** Shows the previous page, if any. */
  previous(): void;
  /** Shows the next page, if any. */
  next(): void;
  /**
   * Sets how many rows a page shows, and goes back to the first page.
   *
   * @param size - Rows per page.
   */
  setPageSize(size: number): void;
  /**
   * Whether a row is selected.
   *
   * @param id - The row's id.
   * @returns `true` when it is.
   */
  isSelected(id: string): boolean;
  /**
   * Selects or unselects a row.
   *
   * @param id - The row's id.
   * @param selected - Whether to select it; defaults to the opposite.
   */
  toggleRow(id: string, selected?: boolean): void;
  /**
   * Selects or unselects every row on the page.
   *
   * @param selected - Whether to select them; defaults to the opposite of
   *   {@link DataTable.pageSelected}.
   */
  togglePage(selected?: boolean): void;
  /**
   * Whether a column is shown.
   *
   * @param id - The column's id.
   * @returns `true` unless it's hidden.
   */
  isVisible(id: string): boolean;
  /**
   * Shows or hides a column, if it's hideable.
   *
   * @param id - The column's id.
   * @param visible - Whether to show it; defaults to the opposite.
   */
  toggleColumn(id: string, visible?: boolean): void;
}

/**
 * The default order for two values: numbers and dates numerically, the
 * rest as text in the user's locale, with empty values last.
 *
 * @param a - A value.
 * @param b - Another value.
 * @returns Negative, zero or positive, as for `Array.sort`.
 */
export function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined || a === '') return 1;
  if (b === null || b === undefined || b === '') return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

/**
 * Creates a data table's state, usually in a component's field
 * initializer. It's all signals, so it renders on the server and needs no
 * zone.
 *
 * @param options - The rows, columns and defaults.
 * @returns The table's state.
 *
 * @example
 * ```ts
 * readonly table = createDataTable({
 *   data: this.payments,
 *   columns: [
 *     { id: 'email', header: 'Email', sortable: true },
 *     { id: 'amount', header: 'Amount', sortable: true },
 *   ],
 *   rowId: (payment) => payment.id,
 * });
 * ```
 */
export function createDataTable<T>(options: DataTableOptions<T>): DataTable<T> {
  const { columns } = options;
  const valueOf = (column: DataTableColumn<T>, row: T): unknown =>
    column.value
      ? column.value(row)
      : (row as Record<string, unknown>)[column.id];
  const filter =
    options.filter ??
    ((row: T, query: string) => {
      const needle = query.toLowerCase();
      return columns.some((column) =>
        String(valueOf(column, row) ?? '')
          .toLowerCase()
          .includes(needle),
      );
    });

  const query = signal('');
  const sort = signal<DataTableSort | null>(null);
  const pageIndex = signal(0);
  const pageSize = signal(options.pageSize ?? 10);
  const selection = signal<ReadonlySet<string>>(new Set());
  const hidden = signal<ReadonlySet<string>>(new Set());

  const allRows = computed(() =>
    options.data().map((data, index) => ({
      id: options.rowId ? options.rowId(data, index) : String(index),
      data,
    })),
  );

  const matchingRows = computed(() => {
    const text = query().trim();
    const matching = text
      ? allRows().filter((row) => filter(row.data, text))
      : allRows();
    const current = sort();
    const column = current && columns.find((other) => other.id === current.id);
    if (!current || !column) {
      return matching;
    }
    const compare = column.compare ?? compareValues;
    const sign = current.direction === 'ascending' ? 1 : -1;
    return [...matching].sort(
      (a, b) =>
        sign * compare(valueOf(column, a.data), valueOf(column, b.data)),
    );
  });

  const pageCount = computed(() =>
    Math.max(1, Math.ceil(matchingRows().length / pageSize())),
  );

  // The page stays within the pages there are as rows come and go.
  const page = computed(() => Math.min(pageIndex(), pageCount() - 1));

  const rows = computed(() =>
    matchingRows().slice(page() * pageSize(), (page() + 1) * pageSize()),
  );

  const pageSelected = computed(
    () => rows().length > 0 && rows().every((row) => selection().has(row.id)),
  );

  const pagePartlySelected = computed(
    () => !pageSelected() && rows().some((row) => selection().has(row.id)),
  );

  const goTo = (index: number) =>
    pageIndex.set(Math.max(0, Math.min(index, pageCount() - 1)));

  return {
    columns,
    query: query.asReadonly(),
    sort: sort.asReadonly(),
    pageIndex: page,
    pageSize: pageSize.asReadonly(),
    pageCount,
    matchingRows,
    rows,
    visibleColumns: computed(() =>
      columns.filter((column) => !hidden().has(column.id)),
    ),
    selection: selection.asReadonly(),
    pageSelected,
    pagePartlySelected,
    canPrevious: computed(() => page() > 0),
    canNext: computed(() => page() < pageCount() - 1),
    search(text) {
      query.set(text);
      pageIndex.set(0);
    },
    toggleSort(id) {
      const current = sort();
      if (current?.id !== id) {
        sort.set({ id, direction: 'ascending' });
      } else if (current.direction === 'ascending') {
        sort.set({ id, direction: 'descending' });
      } else {
        sort.set(null);
      }
    },
    ariaSort(id) {
      const column = columns.find((other) => other.id === id);
      if (!column?.sortable) {
        return null;
      }
      const current = sort();
      return current?.id === id ? current.direction : 'none';
    },
    goTo,
    previous: () => goTo(page() - 1),
    next: () => goTo(page() + 1),
    setPageSize(size) {
      pageSize.set(Math.max(1, size));
      pageIndex.set(0);
    },
    isSelected: (id) => selection().has(id),
    toggleRow(id, selected) {
      selection.update((current) => {
        const next = new Set(current);
        if (selected ?? !current.has(id)) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
    },
    togglePage(selected) {
      const select = selected ?? !pageSelected();
      selection.update((current) => {
        const next = new Set(current);
        for (const row of rows()) {
          if (select) {
            next.add(row.id);
          } else {
            next.delete(row.id);
          }
        }
        return next;
      });
    },
    isVisible: (id) => !hidden().has(id),
    toggleColumn(id, visible) {
      const column = columns.find((other) => other.id === id);
      if (column?.hideable === false) {
        return;
      }
      hidden.update((current) => {
        const next = new Set(current);
        if (visible ?? current.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
  };
}
