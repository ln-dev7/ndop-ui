import { computed, Directive, input } from '@angular/core';
import { type DataTable } from '@/lib/data-table';
import { buttonVariants } from '@/ui/button/button';
import { cn } from '@/lib/utils';

export {
  compareValues,
  createDataTable,
  type DataTable,
  type DataTableColumn,
  type DataTableDirection,
  type DataTableOptions,
  type DataTableRow,
  type DataTableSort,
} from '@/lib/data-table';

/**
 * A column header's sort button: a click sorts by its column, ascending,
 * then descending, then not at all. Bind the header cell's `aria-sort` to
 * `table.ariaSort(column)`, so screen readers hear the order; the button
 * has `data-sort` for its icon.
 *
 * @example
 * ```html
 * <th ndTableHead [attr.aria-sort]="table.ariaSort('email')">
 *   <button ndDataTableSortButton [table]="table" column="email">
 *     Email <svg ndIcon="arrow-up-down"></svg>
 *   </button>
 * </th>
 * ```
 */
@Directive({
  selector: 'button[ndDataTableSortButton]',
  host: {
    type: 'button',
    'data-slot': 'data-table-sort-button',
    '[attr.data-sort]': 'table().ariaSort(column())',
    '[class]': 'classes()',
    '(click)': 'table().toggleSort(column())',
  },
})
export class DataTableSortButton {
  /** The table it sorts, from `createDataTable`. */
  readonly table =
    input.required<Pick<DataTable<unknown>, 'ariaSort' | 'toggleSort'>>();

  /** The id of the column it sorts by. */
  readonly column = input.required<string>();

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      buttonVariants({ variant: 'ghost', size: 'sm' }),
      '-ms-3 h-8 data-[sort=none]:[&>svg]:opacity-50',
      this.class(),
    ),
  );
}
