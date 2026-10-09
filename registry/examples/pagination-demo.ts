import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/ui/pagination/pagination';

/** Links to pages, with the current one marked. */
@Component({
  selector: 'example-pagination-demo',
  imports: [
    NdIcon,
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
  ],
  template: `
    <nav ndPagination>
      <ul ndPaginationContent>
        <li ndPaginationItem>
          <a ndPaginationPrevious href="#page-1">
            <svg ndIcon="chevron-left"></svg>
            <span class="hidden sm:block">Previous</span>
          </a>
        </li>
        <li ndPaginationItem><a ndPaginationLink href="#page-1">1</a></li>
        <li ndPaginationItem>
          <a ndPaginationLink href="#page-2" active>2</a>
        </li>
        <li ndPaginationItem><a ndPaginationLink href="#page-3">3</a></li>
        <li ndPaginationItem>
          <span ndPaginationEllipsis><svg ndIcon="ellipsis"></svg></span>
        </li>
        <li ndPaginationItem>
          <a ndPaginationNext href="#page-3">
            <span class="hidden sm:block">Next</span>
            <svg ndIcon="chevron-right"></svg>
          </a>
        </li>
      </ul>
    </nav>
  `,
})
export class PaginationDemoExample {}
