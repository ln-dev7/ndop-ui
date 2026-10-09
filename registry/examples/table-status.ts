import { Component } from '@angular/core';
import { Badge, type BadgeVariant } from '@/ui/badge/badge';
import { Button } from '@/ui/button/button';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/table/table';

/** One order's status. */
type Status = 'Delivered' | 'Shipped' | 'Cancelled';

/**
 * Orders with a status badge and an action on each row; each button's
 * name says which order it acts on.
 */
@Component({
  selector: 'example-table-status',
  imports: [
    Badge,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableHeader,
    TableRow,
  ],
  template: `
    <div ndTableContainer class="rounded-md border">
      <table ndTable aria-label="Orders">
        <thead ndTableHeader>
          <tr ndTableRow>
            <th ndTableHead scope="col">Order</th>
            <th ndTableHead scope="col">Customer</th>
            <th ndTableHead scope="col">Status</th>
            <th ndTableHead scope="col">
              <span class="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody ndTableBody>
          @for (order of orders; track order.id) {
            <tr ndTableRow>
              <th ndTableHead scope="row">{{ order.id }}</th>
              <td ndTableCell>{{ order.customer }}</td>
              <td ndTableCell>
                <span ndBadge [variant]="variants[order.status]">{{
                  order.status
                }}</span>
              </td>
              <td ndTableCell class="text-end">
                <button
                  ndButton
                  variant="ghost"
                  size="sm"
                  [attr.aria-label]="'View order ' + order.id"
                >
                  View
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class TableStatusExample {
  protected readonly variants: Record<Status, BadgeVariant> = {
    Delivered: 'secondary',
    Shipped: 'outline',
    Cancelled: 'destructive',
  };

  protected readonly orders: {
    id: string;
    customer: string;
    status: Status;
  }[] = [
    { id: '#3210', customer: 'Olivia Martin', status: 'Delivered' },
    { id: '#3209', customer: 'Jackson Lee', status: 'Shipped' },
    { id: '#3204', customer: 'Isabella Nguyen', status: 'Cancelled' },
  ];
}
