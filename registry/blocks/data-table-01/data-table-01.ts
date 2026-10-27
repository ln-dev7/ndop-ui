import { Component, computed, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Badge } from '@/ui/badge/badge';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/ui/dropdown-menu/dropdown-menu';
import { Input } from '@/ui/input/input';
import { Label } from '@/ui/label/label';
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectTrigger,
} from '@/ui/select/select';
import { Skeleton } from '@/ui/skeleton/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/table/table';
import {
  type Task,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
  tasksResource,
} from './data';
import { NdMenuGroup as DropdownMenuGroup } from '@ndop/primitives/menu';
import { NdDropdownMenuTrigger as DropdownMenuTrigger } from '@ndop/primitives/dropdown-menu';
import {
  NdSelect as Select,
  NdSelectItemText as SelectItemText,
  NdSelectValue as SelectValue,
} from '@ndop/primitives/select';

/** Each status's name and icon. */
const STATUSES: Record<TaskStatus, { label: string; icon: string }> = {
  todo: { label: 'Todo', icon: 'circle-dashed' },
  'in-progress': { label: 'In progress', icon: 'timer' },
  done: { label: 'Done', icon: 'circle-check' },
  canceled: { label: 'Canceled', icon: 'circle-x' },
};

/** Each priority's name and icon. */
const PRIORITIES: Record<TaskPriority, { label: string; icon: string }> = {
  low: { label: 'Low', icon: 'arrow-down' },
  medium: { label: 'Medium', icon: 'arrow-right' },
  high: { label: 'High', icon: 'arrow-up' },
};

/** The page sizes to pick from. */
const PAGE_SIZES = ['10', '20', '30'] as const;

/**
 * Orders values by their place in a list, such as statuses by progress.
 *
 * @param order - The values, in order.
 * @returns A compare function for a data table column.
 */
const byOrder =
  (order: readonly string[]) =>
  (a: unknown, b: unknown): number =>
    order.indexOf(String(a)) - order.indexOf(String(b));

/**
 * A tasks page: a table to search by id or title, filter by status, sort
 * by any column, page through, and select rows in, with a menu of actions
 * per row and a menu to hide columns. The state is `createDataTable`; the
 * tasks come from `tasksResource()` in `./data`, with skeleton rows while
 * they load. Making a copy or deleting changes the loaded tasks locally.
 */
@Component({
  selector: 'block-data-table-01',
  imports: [
    Badge,
    Button,
    Checkbox,
    CheckboxIndicator,
    DataTableSortButton,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuItemIndicator,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Input,
    Label,
    NdIcon,
    Select,
    SelectContent,
    SelectItem,
    SelectItemIndicator,
    SelectItemText,
    SelectTrigger,
    SelectValue,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableHeader,
    TableRow,
  ],
  template: `
    <main
      class="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-6 bg-background p-4 text-foreground md:p-8"
    >
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="grid gap-1">
          <h1 class="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p class="text-muted-foreground">
            Here's a list of your tasks for this month.
          </p>
        </div>
        <button ndButton>
          <svg ndIcon="plus"></svg>
          New task
        </button>
      </div>

      <div class="flex flex-col gap-4" [attr.aria-busy]="tasks.isLoading()">
        <div class="flex flex-wrap items-center gap-2">
          <input
            ndInput
            type="search"
            aria-label="Filter tasks"
            placeholder="Filter tasks…"
            class="h-8 w-full sm:w-64"
            [value]="table.query()"
            (input)="table.search($any($event.target).value)"
          />
          <button
            ndButton
            variant="outline"
            size="sm"
            class="border-dashed"
            [ndDropdownMenuTrigger]="statusMenu"
          >
            <svg ndIcon="list-filter"></svg>
            Status
            @if (statusFilter().size > 0) {
              <span ndBadge variant="secondary" class="rounded-sm px-1">
                {{ statusFilter().size }}
                <span class="sr-only">selected</span>
              </span>
            }
          </button>
          <ng-template #statusMenu>
            <div ndDropdownMenuContent align="start" class="w-48">
              <div ndMenuGroup aria-labelledby="data-table-01-status">
                <div ndDropdownMenuLabel id="data-table-01-status">
                  Filter by status
                </div>
                @for (status of statuses; track status) {
                  <div
                    ndDropdownMenuCheckboxItem
                    [checked]="statusFilter().has(status)"
                    (checkedChange)="filterStatus(status, $event)"
                  >
                    <span ndDropdownMenuItemIndicator>
                      <svg ndIcon="check"></svg>
                    </span>
                    <svg [ndIcon]="statusInfo[status].icon"></svg>
                    {{ statusInfo[status].label }}
                    <span class="ms-auto font-mono text-xs tabular-nums">
                      {{ statusCounts()[status] }}
                    </span>
                  </div>
                }
              </div>
            </div>
          </ng-template>
          @if (statusFilter().size > 0) {
            <button
              ndButton
              variant="ghost"
              size="sm"
              (click)="clearStatusFilter()"
            >
              Reset
              <svg ndIcon="x"></svg>
            </button>
          }
          <button
            ndButton
            variant="outline"
            size="sm"
            class="ms-auto"
            [ndDropdownMenuTrigger]="columnsMenu"
          >
            <svg ndIcon="settings"></svg>
            View
          </button>
          <ng-template #columnsMenu>
            <div ndDropdownMenuContent align="end" class="w-44">
              <div ndMenuGroup aria-labelledby="data-table-01-columns">
                <div ndDropdownMenuLabel id="data-table-01-columns">
                  Toggle columns
                </div>
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
            </div>
          </ng-template>
        </div>

        <!-- Focusable, so keyboard users can scroll it sideways on a phone. -->
        <div
          ndTableContainer
          tabindex="0"
          role="region"
          aria-label="Tasks"
          class="rounded-md border"
        >
          <table ndTable>
            <caption class="sr-only">
              Tasks
            </caption>
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
                  <th
                    ndTableHead
                    scope="col"
                    [attr.aria-sort]="table.ariaSort(column.id)"
                  >
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
              @if (tasks.isLoading()) {
                @for (placeholder of [1, 2, 3, 4, 5]; track placeholder) {
                  <tr ndTableRow>
                    <td
                      ndTableCell
                      [attr.colspan]="table.visibleColumns().length + 2"
                    >
                      <div ndSkeleton class="h-6 w-full"></div>
                    </td>
                  </tr>
                }
              } @else {
                @for (row of table.rows(); track row.id) {
                  <tr
                    ndTableRow
                    [attr.data-state]="
                      table.isSelected(row.id) ? 'selected' : null
                    "
                  >
                    <td ndTableCell>
                      <button
                        ndCheckbox
                        [attr.aria-label]="'Select ' + row.data.id"
                        [checked]="table.isSelected(row.id)"
                        (checkedChange)="table.toggleRow(row.id, $event)"
                      >
                        <span ndCheckboxIndicator
                          ><svg ndIcon="check"></svg
                        ></span>
                      </button>
                    </td>
                    @for (column of table.visibleColumns(); track column.id) {
                      <td ndTableCell>
                        @switch (column.id) {
                          @case ('id') {
                            <span class="font-mono">{{ row.data.id }}</span>
                          }
                          @case ('title') {
                            <div class="flex items-center gap-2">
                              <span
                                ndBadge
                                variant="outline"
                                class="capitalize"
                                >{{ row.data.label }}</span
                              >
                              <span class="max-w-[28rem] truncate font-medium">
                                {{ row.data.title }}
                              </span>
                            </div>
                          }
                          @case ('status') {
                            <span class="flex items-center gap-2">
                              <svg
                                class="size-4 text-muted-foreground"
                                [ndIcon]="statusInfo[row.data.status].icon"
                              ></svg>
                              {{ statusInfo[row.data.status].label }}
                            </span>
                          }
                          @case ('priority') {
                            <span class="flex items-center gap-2">
                              <svg
                                class="size-4 text-muted-foreground"
                                [ndIcon]="priorityInfo[row.data.priority].icon"
                              ></svg>
                              {{ priorityInfo[row.data.priority].label }}
                            </span>
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
                          >Actions for {{ row.data.id }}</span
                        >
                      </button>
                      <ng-template #rowMenu>
                        <div ndDropdownMenuContent align="end" class="w-40">
                          <div ndDropdownMenuItem>Edit</div>
                          <div ndDropdownMenuItem (triggered)="copy(row.data)">
                            Make a copy
                          </div>
                          <div ndDropdownMenuSeparator></div>
                          <div
                            ndDropdownMenuItem
                            variant="destructive"
                            (triggered)="remove(row.data)"
                          >
                            <svg ndIcon="trash-2"></svg>
                            Delete
                          </div>
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
              }
            </tbody>
          </table>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-4 text-sm">
          <p class="text-muted-foreground" aria-live="polite">
            {{ table.selection().size }} of
            {{ table.matchingRows().length }} rows selected.
          </p>
          <div class="flex flex-wrap items-center gap-4 sm:gap-6">
            <div class="flex items-center gap-2">
              <label ndLabel for="data-table-01-page-size">Rows per page</label>
              <ng-container
                ndSelect
                [value]="'' + table.pageSize()"
                (valueChange)="setPageSize($event)"
              >
                <button
                  ndSelectTrigger
                  id="data-table-01-page-size"
                  size="sm"
                  class="w-20"
                >
                  <span ndSelectValue></span>
                  <svg ndIcon="chevron-down" class="size-4 opacity-50"></svg>
                </button>
                <div ndSelectContent>
                  @for (size of pageSizes; track size) {
                    <div ndSelectItem [value]="size">
                      <span ndSelectItemIndicator
                        ><svg ndIcon="check"></svg
                      ></span>
                      <span ndSelectItemText>{{ size }}</span>
                    </div>
                  }
                </div>
              </ng-container>
            </div>
            <p class="font-medium" aria-live="polite">
              Page {{ table.pageIndex() + 1 }} of {{ table.pageCount() }}
            </p>
            <div class="flex items-center gap-2">
              <button
                ndButton
                variant="outline"
                size="icon-sm"
                class="hidden sm:inline-flex"
                [disabled]="!table.canPrevious()"
                (click)="table.goTo(0)"
              >
                <svg ndIcon="chevrons-left" class="rtl:rotate-180"></svg>
                <span class="sr-only">First page</span>
              </button>
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
              <button
                ndButton
                variant="outline"
                size="icon-sm"
                class="hidden sm:inline-flex"
                [disabled]="!table.canNext()"
                (click)="table.goTo(table.pageCount() - 1)"
              >
                <svg ndIcon="chevrons-right" class="rtl:rotate-180"></svg>
                <span class="sr-only">Last page</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  `,
})
export class DataTable01Block {
  protected readonly statuses = TASK_STATUSES;
  protected readonly statusInfo = STATUSES;
  protected readonly priorityInfo = PRIORITIES;
  protected readonly pageSizes = PAGE_SIZES;

  protected readonly tasks = tasksResource();

  protected readonly statusFilter = signal<ReadonlySet<TaskStatus>>(new Set());

  /** How many tasks have each status, for the filter menu. */
  protected readonly statusCounts = computed(() => {
    const counts: Record<TaskStatus, number> = {
      todo: 0,
      'in-progress': 0,
      done: 0,
      canceled: 0,
    };
    for (const task of this.tasks.value()) {
      counts[task.status] += 1;
    }
    return counts;
  });

  // The data table searches and sorts; filtering by status happens here,
  // before it, since its options take one search text only.
  protected readonly filteredTasks = computed(() => {
    const statuses = this.statusFilter();
    const tasks = this.tasks.value();
    return statuses.size === 0
      ? tasks
      : tasks.filter((task) => statuses.has(task.status));
  });

  protected readonly table = createDataTable<Task>({
    data: this.filteredTasks,
    columns: [
      { id: 'id', header: 'Task', hideable: false },
      { id: 'title', header: 'Title', sortable: true, hideable: false },
      {
        id: 'status',
        header: 'Status',
        sortable: true,
        compare: byOrder(TASK_STATUSES),
      },
      {
        id: 'priority',
        header: 'Priority',
        sortable: true,
        compare: byOrder(TASK_PRIORITIES),
      },
    ],
    rowId: (task) => task.id,
    filter: (task, query) => {
      const needle = query.toLowerCase();
      return (
        task.id.toLowerCase().includes(needle) ||
        task.title.toLowerCase().includes(needle)
      );
    },
  });

  /**
   * Adds or removes a status from the filter, and goes back to the first
   * page.
   *
   * @param status - The status.
   * @param checked - Whether to show tasks with it.
   */
  protected filterStatus(status: TaskStatus, checked: boolean): void {
    this.statusFilter.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(status);
      } else {
        next.delete(status);
      }
      return next;
    });
    this.table.goTo(0);
  }

  /** Shows tasks of every status again. */
  protected clearStatusFilter(): void {
    this.statusFilter.set(new Set());
    this.table.goTo(0);
  }

  /**
   * Sets how many rows a page shows.
   *
   * @param size - The picked size, as text.
   */
  protected setPageSize(size: string | null): void {
    if (size) {
      this.table.setPageSize(Number(size));
    }
  }

  /**
   * Adds a copy of a task right after it, with a new id.
   *
   * @param task - The task to copy.
   */
  protected copy(task: Task): void {
    const tasks = this.tasks.value();
    const highest = Math.max(
      ...tasks.map((other) => Number(other.id.replace(/\D/g, '')) || 0),
    );
    const index = tasks.indexOf(task);
    this.tasks.value.set([
      ...tasks.slice(0, index + 1),
      { ...task, id: `TASK-${highest + 1}`, title: `${task.title} (copy)` },
      ...tasks.slice(index + 1),
    ]);
  }

  /**
   * Deletes a task, and unselects it.
   *
   * @param task - The task to delete.
   */
  protected remove(task: Task): void {
    this.table.toggleRow(task.id, false);
    this.tasks.value.update((tasks) =>
      tasks.filter((other) => other.id !== task.id),
    );
  }
}
