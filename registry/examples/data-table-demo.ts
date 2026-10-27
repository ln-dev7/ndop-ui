import { CurrencyPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import { Checkbox, CheckboxIndicator } from '@/ui/checkbox/checkbox';
import {
  createDataTable,
  DataTableSortButton,
} from '@/ui/data-table/data-table';
import {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemIndicator,
} from '@/ui/dropdown-menu/dropdown-menu';
import { Input } from '@/ui/input/input';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/table/table';
import { NdDropdownMenuTrigger as DropdownMenuTrigger } from '@ndop/primitives/dropdown-menu';

interface Payment {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  email: string;
}

/**
 * Payments to sort by email or amount, search, select and page through,
 * with columns to hide and a menu of actions per row. The state is
 * `createDataTable`; the markup is the Table item's.
 */
@Component({
  selector: 'example-data-table-demo',
  imports: [
    Button,
    Checkbox,
    CheckboxIndicator,
    CurrencyPipe,
    DataTableSortButton,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuItemIndicator,
    DropdownMenuTrigger,
    Input,
    NdIcon,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableHeader,
    TableRow,
  ],
  template: `
    <div class="w-2xl max-w-full">
      <div class="flex items-center gap-2 py-4">
        <input
          ndInput
          aria-label="Filter payments"
          placeholder="Filter payments…"
          class="max-w-sm"
          [value]="table.query()"
          (input)="table.search($any($event.target).value)"
        />
        <button
          ndButton
          variant="outline"
          class="ms-auto"
          [ndDropdownMenuTrigger]="columnsMenu"
        >
          Columns <svg ndIcon="chevron-down"></svg>
        </button>
        <ng-template #columnsMenu>
          <div ndDropdownMenuContent align="end">
            @for (column of table.columns; track column.id) {
              @if (column.hideable !== false) {
                <div
                  ndDropdownMenuCheckboxItem
                  [checked]="table.isVisible(column.id)"
                  (checkedChange)="table.toggleColumn(column.id, $event)"
                >
                  <span ndDropdownMenuItemIndicator>
                    <svg ndIcon="check"></svg>
                  </span>
                  {{ column.header }}
                </div>
              }
            }
          </div>
        </ng-template>
      </div>
      <div ndTableContainer class="rounded-md border">
        <table ndTable>
          <thead ndTableHeader>
            <tr ndTableRow>
              <th ndTableHead class="w-10">
                <button
                  ndCheckbox
                  aria-label="Select all on this page"
                  [checked]="table.pageSelected()"
                  [indeterminate]="table.pagePartlySelected()"
                  (checkedChange)="table.togglePage($event)"
                >
                  <span ndCheckboxIndicator><svg ndIcon="check"></svg></span>
                </button>
              </th>
              @for (column of table.visibleColumns(); track column.id) {
                <th ndTableHead [attr.aria-sort]="table.ariaSort(column.id)">
                  @if (column.sortable) {
                    <button
                      ndDataTableSortButton
                      [table]="table"
                      [column]="column.id"
                    >
                      {{ column.header }}
                      <svg ndIcon="arrow-up-down"></svg>
                    </button>
                  } @else {
                    {{ column.header }}
                  }
                </th>
              }
              <th ndTableHead class="w-10">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody ndTableBody>
            @for (row of table.rows(); track row.id) {
              <tr
                ndTableRow
                [attr.data-state]="table.isSelected(row.id) ? 'selected' : null"
              >
                <td ndTableCell>
                  <button
                    ndCheckbox
                    [attr.aria-label]="'Select ' + row.data.email"
                    [checked]="table.isSelected(row.id)"
                    (checkedChange)="table.toggleRow(row.id, $event)"
                  >
                    <span ndCheckboxIndicator><svg ndIcon="check"></svg></span>
                  </button>
                </td>
                @for (column of table.visibleColumns(); track column.id) {
                  <td ndTableCell>
                    @switch (column.id) {
                      @case ('amount') {
                        {{ row.data.amount | currency: 'USD' }}
                      }
                      @case ('status') {
                        <span class="capitalize">{{ row.data.status }}</span>
                      }
                      @default {
                        {{ row.data.email }}
                      }
                    }
                  </td>
                }
                <td ndTableCell>
                  <button
                    ndButton
                    variant="ghost"
                    size="icon-sm"
                    [ndDropdownMenuTrigger]="rowMenu"
                  >
                    <svg ndIcon="ellipsis"></svg>
                    <span class="sr-only"
                      >Actions for {{ row.data.email }}</span
                    >
                  </button>
                  <ng-template #rowMenu>
                    <div ndDropdownMenuContent align="end">
                      <div ndDropdownMenuItem (triggered)="copy(row.data.id)">
                        Copy payment ID
                      </div>
                      <div ndDropdownMenuItem>View customer</div>
                    </div>
                  </ng-template>
                </td>
              </tr>
            } @empty {
              <tr ndTableRow>
                <td
                  ndTableCell
                  [attr.colspan]="table.visibleColumns().length + 2"
                  class="h-24 text-center"
                >
                  No results.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="flex items-center justify-between gap-2 py-4 text-sm">
        <p class="text-muted-foreground" aria-live="polite">
          {{ table.selection().size }} of {{ table.matchingRows().length }}
          rows selected.
        </p>
        <div class="flex items-center gap-2">
          <span
            >Page {{ table.pageIndex() + 1 }} of {{ table.pageCount() }}</span
          >
          <button
            ndButton
            variant="outline"
            size="sm"
            [disabled]="!table.canPrevious()"
            (click)="table.previous()"
          >
            Previous
          </button>
          <button
            ndButton
            variant="outline"
            size="sm"
            [disabled]="!table.canNext()"
            (click)="table.next()"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  `,
})
export class DataTableDemoExample {
  protected readonly payments = signal<readonly Payment[]>([
    {
      id: 'm5gr84i9',
      amount: 316,
      status: 'success',
      email: 'ken99@example.com',
    },
    {
      id: '3u1reuv4',
      amount: 242,
      status: 'success',
      email: 'abe45@example.com',
    },
    {
      id: 'derv1ws0',
      amount: 837,
      status: 'processing',
      email: 'monserrat44@example.com',
    },
    {
      id: '5kma53ae',
      amount: 874,
      status: 'success',
      email: 'silas22@example.com',
    },
    {
      id: 'bhqecj4p',
      amount: 721,
      status: 'failed',
      email: 'carmella@example.com',
    },
    {
      id: 'p0r8sd1k',
      amount: 129,
      status: 'pending',
      email: 'nadia@example.com',
    },
    {
      id: 'x7v2kq9m',
      amount: 560,
      status: 'success',
      email: 'tomas@example.com',
    },
  ]);

  protected readonly table = createDataTable({
    data: this.payments,
    columns: [
      { id: 'status', header: 'Status' },
      { id: 'email', header: 'Email', sortable: true },
      { id: 'amount', header: 'Amount', sortable: true },
    ],
    rowId: (payment) => payment.id,
    pageSize: 5,
  });

  /**
   * Copies a payment's id to the clipboard.
   *
   * @param id - The payment's id.
   */
  protected copy(id: string): void {
    void navigator.clipboard?.writeText(id);
  }
}
