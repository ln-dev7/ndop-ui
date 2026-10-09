import { Component, computed, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/ui/pagination/pagination';

/**
 * Pages kept in component state: buttons instead of links, with the
 * current page marked and the arrows disabled at either end.
 */
@Component({
  selector: 'example-pagination-state',
  imports: [
    NdIcon,
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
  ],
  template: `
    <div class="grid gap-4">
      <p class="text-center text-sm text-muted-foreground" aria-live="polite">
        Showing results {{ (page() - 1) * 10 + 1 }} to {{ page() * 10 }} of 50
      </p>
      <nav ndPagination label="Results pages">
        <ul ndPaginationContent>
          <li ndPaginationItem>
            <button
              ndPaginationPrevious
              [disabled]="page() === 1"
              (click)="page.set(page() - 1)"
            >
              <svg ndIcon="chevron-left"></svg>
              <span class="hidden sm:block">Previous</span>
            </button>
          </li>
          @for (number of pages(); track number) {
            <li ndPaginationItem>
              <button
                ndPaginationLink
                [active]="number === page()"
                (click)="page.set(number)"
              >
                {{ number }}
              </button>
            </li>
          }
          <li ndPaginationItem>
            <button
              ndPaginationNext
              [disabled]="page() === count"
              (click)="page.set(page() + 1)"
            >
              <span class="hidden sm:block">Next</span>
              <svg ndIcon="chevron-right"></svg>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  `,
})
export class PaginationStateExample {
  protected readonly count = 5;
  protected readonly page = signal(1);
  protected readonly pages = computed(() =>
    Array.from({ length: this.count }, (_, index) => index + 1),
  );
}
