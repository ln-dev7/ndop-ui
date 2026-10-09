import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

describe('Table', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses('table', registrySource('ui/table/table.ts'), {
        'text-left': 'text-start',
        '[&:has([role=checkbox])]:pr-0': '[&:has([role=checkbox])]:pe-0',
      }),
    ).toEqual([]);
  });

  it('styles a native table, named by its caption', async () => {
    await render(
      `<div ndTableContainer>
        <table ndTable>
          <caption ndTableCaption>Invoices</caption>
          <thead ndTableHeader><tr ndTableRow><th ndTableHead scope="col">Id</th></tr></thead>
          <tbody ndTableBody><tr ndTableRow data-state="selected"><td ndTableCell>INV001</td></tr></tbody>
        </table>
      </div>`,
      {
        imports: [
          TableContainer,
          Table,
          TableCaption,
          TableHeader,
          TableBody,
          TableRow,
          TableHead,
          TableCell,
        ],
      },
    );
    const table = screen.getByRole('table', { name: 'Invoices' });
    expect(table.getAttribute('data-slot')).toBe('table');
    expect(
      screen.getByRole('columnheader', { name: 'Id' }).classList,
    ).toContain('text-start');
    expect(screen.getByRole('cell', { name: 'INV001' })).toBeTruthy();
  });
});
