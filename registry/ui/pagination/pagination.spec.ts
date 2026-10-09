import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './pagination';

describe('Pagination', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses(
        'pagination',
        registrySource('ui/pagination/pagination.ts'),
        {
          'gap-1 px-2.5 sm:pl-2.5': 'gap-1 px-2.5 sm:ps-2.5',
          'gap-1 px-2.5 sm:pr-2.5': 'gap-1 px-2.5 sm:pe-2.5',
          // Icons and labels inside the links are the user's markup; the
          // examples carry their classes.
          'size-4': '[&>svg]:size-4',
          'hidden sm:block': null,
          'sr-only': null,
        },
      ),
    ).toEqual([]);
  });

  it('marks the current page and names the arrows', async () => {
    await render(
      `<nav ndPagination>
        <ul ndPaginationContent>
          <li ndPaginationItem><a ndPaginationPrevious href="?p=1">Previous</a></li>
          <li ndPaginationItem><a ndPaginationLink href="?p=1">1</a></li>
          <li ndPaginationItem><a ndPaginationLink href="?p=2" active>2</a></li>
          <li ndPaginationItem><span ndPaginationEllipsis>…</span></li>
          <li ndPaginationItem><a ndPaginationNext href="?p=3">Next</a></li>
        </ul>
      </nav>`,
      {
        imports: [
          Pagination,
          PaginationContent,
          PaginationItem,
          PaginationLink,
          PaginationPrevious,
          PaginationNext,
          PaginationEllipsis,
        ],
      },
    );
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeTruthy();
    const current = screen.getByRole('link', { name: '2' });
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(current.classList).toContain('border');
    expect(
      screen.getByRole('link', { name: '1' }).hasAttribute('aria-current'),
    ).toBe(false);
    expect(
      screen.getByRole('link', { name: 'Go to previous page' }),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Go to next page' })).toBeTruthy();
  });
});
