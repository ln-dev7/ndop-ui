import { Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular/zoneless';
import { compareValues, createDataTable } from '@/lib/data-table';
import { DataTableSortButton } from './data-table';

interface Payment {
  id: string;
  email: string;
  amount: number;
}

const PAYMENTS: Payment[] = [
  { id: 'a', email: 'ken@example.com', amount: 316 },
  { id: 'b', email: 'abe@example.com', amount: 242 },
  { id: 'c', email: 'monserrat@example.com', amount: 837 },
  { id: 'd', email: 'silas@example.com', amount: 874 },
  { id: 'e', email: 'carmella@example.com', amount: 721 },
];

function table(pageSize = 2) {
  return createDataTable<Payment>({
    data: signal(PAYMENTS),
    columns: [
      { id: 'email', header: 'Email', sortable: true },
      { id: 'amount', header: 'Amount', sortable: true, hideable: false },
    ],
    rowId: (payment) => payment.id,
    pageSize,
  });
}

describe('createDataTable', () => {
  it('pages the rows', () => {
    const state = table();
    expect(state.pageCount()).toBe(3);
    expect(state.rows().map((row) => row.id)).toEqual(['a', 'b']);
    expect(state.canPrevious()).toBe(false);
    state.next();
    state.next();
    expect(state.rows().map((row) => row.id)).toEqual(['e']);
    expect(state.canNext()).toBe(false);
    state.next();
    expect(state.pageIndex()).toBe(2);
  });

  it('sorts ascending, descending, then not at all', () => {
    const state = table(5);
    expect(state.ariaSort('amount')).toBe('none');
    state.toggleSort('amount');
    expect(state.rows().map((row) => row.data.amount)).toEqual([
      242, 316, 721, 837, 874,
    ]);
    expect(state.ariaSort('amount')).toBe('ascending');
    state.toggleSort('amount');
    expect(state.rows()[0]?.data.amount).toBe(874);
    state.toggleSort('amount');
    expect(state.sort()).toBeNull();
    expect(state.rows()[0]?.id).toBe('a');
  });

  it('searches every column and goes back to the first page', () => {
    const state = table();
    state.next();
    state.search('SILAS');
    expect(state.pageIndex()).toBe(0);
    expect(state.rows().map((row) => row.id)).toEqual(['d']);
    state.search('8');
    expect(state.matchingRows().map((row) => row.id)).toEqual(['c', 'd']);
  });

  it('selects rows and the page', () => {
    const state = table();
    state.toggleRow('a');
    expect(state.pagePartlySelected()).toBe(true);
    state.togglePage();
    expect(state.pageSelected()).toBe(true);
    expect([...state.selection()]).toEqual(['a', 'b']);
    state.togglePage();
    expect(state.selection().size).toBe(0);
  });

  it('hides columns that can be hidden', () => {
    const state = table();
    state.toggleColumn('email');
    state.toggleColumn('amount');
    expect(state.visibleColumns().map((column) => column.id)).toEqual([
      'amount',
    ]);
    state.toggleColumn('email', true);
    expect(state.isVisible('email')).toBe(true);
  });

  it('orders numbers, dates and text, with empty values last', () => {
    expect([3, 10, 2].sort(compareValues)).toEqual([2, 3, 10]);
    expect(['b', '', 'a'].sort(compareValues)).toEqual(['a', 'b', '']);
    expect(['item 10', 'item 9'].sort(compareValues)).toEqual([
      'item 9',
      'item 10',
    ]);
  });
});

describe('DataTableSortButton', () => {
  it('sorts its column and reports the order', async () => {
    @Component({
      imports: [DataTableSortButton],
      template: `<button ndDataTableSortButton [table]="table" column="email">
        Email
      </button>`,
    })
    class Host {
      readonly table = table();
    }
    const view = await render(Host);
    const button = screen.getByRole('button', { name: 'Email' });
    expect(button.getAttribute('data-sort')).toBe('none');
    button.click();
    await view.fixture.whenStable();
    expect(view.fixture.componentInstance.table.sort()).toEqual({
      id: 'email',
      direction: 'ascending',
    });
    expect(button.getAttribute('data-sort')).toBe('ascending');
  });
});
