import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/ui/empty/empty';

/**
 * No search results, which says what was searched and offers to clear
 * the search.
 */
@Component({
  selector: 'example-empty-search',
  imports: [
    Button,
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    NdIcon,
  ],
  template: `
    <div ndEmpty role="status">
      <div ndEmptyHeader>
        <div ndEmptyMedia variant="icon"><svg ndIcon="search"></svg></div>
        <h2 ndEmptyTitle>No results</h2>
        <p ndEmptyDescription>
          Nothing matches “{{ query() }}”. Check the spelling or try other
          words.
        </p>
      </div>
      <div ndEmptyContent>
        <button ndButton variant="outline" (click)="query.set('')">
          Clear search
        </button>
      </div>
    </div>
  `,
})
export class EmptySearchExample {
  protected readonly query = signal('quarterly report 2019');
}
