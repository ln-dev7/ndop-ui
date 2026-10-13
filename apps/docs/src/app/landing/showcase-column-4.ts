import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Badge, type BadgeVariant } from '@/ui/badge/badge';
import { Button } from '@/ui/button/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/card/card';
import { Checkbox, CheckboxIndicator } from '@/ui/checkbox/checkbox';
import { Progress, ProgressIndicator } from '@/ui/progress/progress';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandGroupHeading,
  CommandInput,
  CommandInputWrapper,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/ui/command/command';
import {
  InputOtp,
  InputOtpGroup,
  InputOtpInput,
  InputOtpSeparator,
  InputOtpSlot,
} from '@/ui/input-otp/input-otp';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/table/table';

/** An invoice's state. */
type Status = 'Paid' | 'Pending' | 'Overdue';

/**
 * The landing showcase's fourth column (ADR-0026, amendment 1): a command
 * menu, recent invoices, plan usage and an email verification code.
 * On phones only the verification code shows.
 */
@Component({
  selector: 'docs-showcase-column-4',
  imports: [
    NdIcon,
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    Checkbox,
    CheckboxIndicator,
    Command,
    CommandEmpty,
    CommandGroup,
    CommandGroupHeading,
    CommandInput,
    CommandInputWrapper,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
    InputOtp,
    InputOtpGroup,
    InputOtpInput,
    InputOtpSeparator,
    InputOtpSlot,
    Progress,
    ProgressIndicator,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableHeader,
    TableRow,
  ],
  host: { class: 'flex flex-col gap-4' },
  template: `
    <div ndCard class="hidden gap-0 overflow-hidden py-0 md:flex">
      <div ndCommand label="Commands" class="rounded-none bg-transparent">
        <div ndCommandInputWrapper>
          <svg ndIcon="search"></svg>
          <input ndCommandInput placeholder="Search Sawa Studio…" />
        </div>
        <div ndCommandList>
          <div ndCommandEmpty>No results found.</div>
          <div ndCommandGroup>
            <div ndCommandGroupHeading>Suggestions</div>
            <div ndCommandItem>
              <svg ndIcon="folder"></svg>
              Open Kribi Foods rebrand
            </div>
            <div ndCommandItem>
              <svg ndIcon="file-text"></svg>
              New invoice
            </div>
            <div ndCommandItem>
              <svg ndIcon="users"></svg>
              Invite to Product
            </div>
          </div>
          <div ndCommandSeparator></div>
          <div ndCommandGroup>
            <div ndCommandGroupHeading>Settings</div>
            <div ndCommandItem>
              <svg ndIcon="user"></svg>
              Profile <span ndCommandShortcut>⌘P</span>
            </div>
            <div ndCommandItem>
              <svg ndIcon="credit-card"></svg>
              Billing <span ndCommandShortcut>⌘B</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div ndCard class="hidden gap-4 py-5 md:flex">
      <div ndCardHeader class="px-5">
        <h3 ndCardTitle>Invoices</h3>
        <p ndCardDescription>October 2026</p>
      </div>
      <div ndCardContent class="px-5">
        <div ndTableContainer>
          <table ndTable aria-label="Invoices, October 2026">
            <thead ndTableHeader>
              <tr ndTableRow>
                <th ndTableHead scope="col" class="w-8">
                  <span class="sr-only">Select</span>
                </th>
                <th ndTableHead scope="col">Client</th>
                <th ndTableHead scope="col" class="text-end">Status</th>
              </tr>
            </thead>
            <tbody ndTableBody>
              @for (invoice of invoices; track invoice.id) {
                <tr ndTableRow>
                  <td ndTableCell>
                    <button
                      ndCheckbox
                      [attr.aria-label]="'Select ' + invoice.client"
                      [defaultChecked]="invoice.selected"
                    >
                      <span ndCheckboxIndicator
                        ><svg ndIcon="check"></svg
                      ></span>
                    </button>
                  </td>
                  <th ndTableHead scope="row" class="py-2 font-medium">
                    {{ invoice.client }}
                    <span
                      class="block text-xs font-normal text-muted-foreground tabular-nums"
                      >{{ invoice.amount }}</span
                    >
                  </th>
                  <td ndTableCell class="text-end">
                    <span ndBadge [variant]="variants[invoice.status]">{{
                      invoice.status
                    }}</span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div ndCard class="hidden gap-5 py-5 md:flex">
      <div ndCardHeader class="px-5">
        <h3 ndCardTitle>Plan usage</h3>
        <p ndCardDescription>Pro plan, renews 1 November.</p>
      </div>
      <div ndCardContent class="grid gap-4 px-5">
        @for (meter of usage; track meter.label) {
          <div class="grid gap-2">
            <div class="flex justify-between gap-3 text-sm">
              <span [id]="'sc-usage-' + $index" class="font-medium">{{
                meter.label
              }}</span>
              <span class="text-muted-foreground tabular-nums">{{
                meter.text
              }}</span>
            </div>
            <div
              ndProgress
              [value]="meter.value"
              [attr.aria-labelledby]="'sc-usage-' + $index"
            >
              <div ndProgressIndicator></div>
            </div>
          </div>
        }
      </div>
    </div>

    <div ndCard class="gap-5 py-5 md:flex-1">
      <div ndCardHeader class="px-5">
        <h3 ndCardTitle>Verify your email</h3>
        <p ndCardDescription>
          Enter the code we sent to fatou&#64;sawa.studio.
        </p>
      </div>
      <div ndCardContent class="px-5">
        <div ndInputOtp [length]="6">
          <input ndInputOtpInput aria-label="Verification code" />
          <div ndInputOtpGroup>
            @for (index of [0, 1, 2]; track index) {
              <div ndInputOtpSlot [index]="index"></div>
            }
          </div>
          <div ndInputOtpSeparator><svg ndIcon="minus"></svg></div>
          <div ndInputOtpGroup>
            @for (index of [3, 4, 5]; track index) {
              <div ndInputOtpSlot [index]="index"></div>
            }
          </div>
        </div>
      </div>
      <div ndCardFooter class="mt-auto gap-2 px-5">
        <button ndButton class="flex-1">Verify</button>
        <button ndButton variant="ghost">Resend</button>
      </div>
    </div>
  `,
})
export class ShowcaseColumn4 {
  protected readonly usage = [
    { label: 'Seats', text: '6 of 10', value: 60 },
    { label: 'Storage', text: '42 of 100 GB', value: 42 },
  ];

  protected readonly variants: Record<Status, BadgeVariant> = {
    Paid: 'secondary',
    Pending: 'outline',
    Overdue: 'destructive',
  };

  protected readonly invoices: {
    id: string;
    client: string;
    amount: string;
    status: Status;
    selected: boolean;
  }[] = [
    {
      id: 'INV-041',
      client: 'Kribi Foods',
      amount: '€4,200',
      status: 'Paid',
      selected: false,
    },
    {
      id: 'INV-042',
      client: 'Lagos Ledger',
      amount: '€2,750',
      status: 'Pending',
      selected: true,
    },
    {
      id: 'INV-043',
      client: 'Nairobi Rides',
      amount: '€1,980',
      status: 'Overdue',
      selected: false,
    },
    {
      id: 'INV-044',
      client: 'Tanaka & Rossi',
      amount: '€3,100',
      status: 'Paid',
      selected: false,
    },
  ];
}
