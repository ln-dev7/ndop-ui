import { Component } from '@angular/core';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/table/table';

/** Recent invoices, named by a caption, with a total in the footer. */
@Component({
  selector: 'example-table-demo',
  imports: [
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableContainer,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
  ],
  template: `
    <div ndTableContainer>
      <table ndTable>
        <caption ndTableCaption>
          A list of your recent invoices.
        </caption>
        <thead ndTableHeader>
          <tr ndTableRow>
            <th ndTableHead scope="col" class="w-24">Invoice</th>
            <th ndTableHead scope="col">Status</th>
            <th ndTableHead scope="col">Method</th>
            <th ndTableHead scope="col" class="text-end">Amount</th>
          </tr>
        </thead>
        <tbody ndTableBody>
          @for (invoice of invoices; track invoice.id) {
            <tr ndTableRow>
              <th ndTableHead scope="row">{{ invoice.id }}</th>
              <td ndTableCell>{{ invoice.status }}</td>
              <td ndTableCell>{{ invoice.method }}</td>
              <td ndTableCell class="text-end">{{ invoice.amount }}</td>
            </tr>
          }
        </tbody>
        <tfoot ndTableFooter>
          <tr ndTableRow>
            <th ndTableHead scope="row" colspan="3">Total</th>
            <td ndTableCell class="text-end">$1,750.00</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `,
})
export class TableDemoExample {
  protected readonly invoices = [
    { id: 'INV001', status: 'Paid', method: 'Credit card', amount: '$250.00' },
    { id: 'INV002', status: 'Pending', method: 'PayPal', amount: '$150.00' },
    {
      id: 'INV003',
      status: 'Unpaid',
      method: 'Bank transfer',
      amount: '$350.00',
    },
    { id: 'INV004', status: 'Paid', method: 'Credit card', amount: '$450.00' },
    { id: 'INV005', status: 'Paid', method: 'PayPal', amount: '$550.00' },
  ];
}
