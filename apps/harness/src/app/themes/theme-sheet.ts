import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Alert, AlertDescription, AlertTitle } from '@/ui/alert/alert';
import { Badge, type BadgeVariant } from '@/ui/badge/badge';
import { Button, type ButtonVariant } from '@/ui/button/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/card/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartGrid,
  ChartLegend,
  ChartLegendIndicator,
  ChartLegendItem,
} from '@/ui/chart/chart';
import { Checkbox, CheckboxIndicator } from '@/ui/checkbox/checkbox';
import { FieldLegend, FieldSet } from '@/ui/form-field/form-field';
import { Input } from '@/ui/input/input';
import { Label } from '@/ui/label/label';
import { Progress, ProgressIndicator } from '@/ui/progress/progress';
import {
  RadioGroup,
  RadioGroupIndicator,
  RadioGroupItem,
} from '@/ui/radio-group/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectTrigger,
  SelectValue,
} from '@/ui/select/select';
import { Skeleton } from '@/ui/skeleton/skeleton';
import { Switch, SwitchThumb } from '@/ui/switch/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/table/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs/tabs';
import { Textarea } from '@/ui/textarea/textarea';

/** The chart's plot size, in viewBox units. */
const WIDTH = 400;
const HEIGHT = 160;

/** The swatches along the top: each surface token over its foreground. */
const SWATCHES = [
  ['background', 'foreground'],
  ['card', 'card-foreground'],
  ['primary', 'primary-foreground'],
  ['secondary', 'secondary-foreground'],
  ['muted', 'muted-foreground'],
  ['accent', 'accent-foreground'],
  ['destructive', 'destructive-foreground'],
  ['sidebar', 'sidebar-foreground'],
] as const;

/**
 * A theme's look on the registry's styled items (ADR-0023, amendment 1):
 * token swatches, every Button variant and size, every Badge variant, a
 * card with a labelled form, alerts, tabs, progress and skeletons, a
 * sidebar-style menu on the sidebar tokens, a chart in the five chart
 * colors and a table. It sets no colors of its own, so whatever theme the
 * surrounding element applies is what it shows.
 */
@Component({
  selector: 'harness-theme-sheet',
  imports: [
    Alert,
    AlertDescription,
    AlertTitle,
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    ChartContainer,
    ChartGrid,
    ChartLegend,
    ChartLegendIndicator,
    ChartLegendItem,
    Checkbox,
    CheckboxIndicator,
    FieldLegend,
    FieldSet,
    Input,
    Label,
    NdIcon,
    Progress,
    ProgressIndicator,
    RadioGroup,
    RadioGroupIndicator,
    RadioGroupItem,
    Select,
    SelectContent,
    SelectItem,
    SelectItemIndicator,
    SelectItemText,
    SelectTrigger,
    SelectValue,
    Skeleton,
    Switch,
    SwitchThumb,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableHeader,
    TableRow,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Textarea,
  ],
  host: { class: 'grid grid-cols-12 gap-6' },
  template: `
    <section class="col-span-12" aria-labelledby="sheet-tokens">
      <h2 id="sheet-tokens" class="sr-only">Tokens</h2>
      <ul class="grid grid-cols-8 gap-3">
        @for (swatch of swatches; track swatch[0]) {
          <li class="grid gap-1.5">
            <span
              class="flex h-14 items-end rounded-lg border p-2 text-sm font-medium"
              [style.background]="'var(--' + swatch[0] + ')'"
              [style.color]="'var(--' + swatch[1] + ')'"
              >Aa</span
            >
            <span class="text-muted-foreground font-mono text-xs">{{
              swatch[0]
            }}</span>
          </li>
        }
      </ul>
    </section>

    <section
      class="col-span-7 grid content-start gap-3"
      aria-labelledby="sheet-buttons"
    >
      <h2 id="sheet-buttons" class="text-muted-foreground text-sm font-medium">
        Buttons
      </h2>
      <div class="flex flex-wrap items-center gap-2">
        @for (variant of buttonVariants; track variant) {
          <button ndButton [variant]="variant" class="capitalize">
            {{ variant }}
          </button>
        }
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button ndButton size="xs">Extra small</button>
        <button ndButton size="sm">Small</button>
        <button ndButton>Default</button>
        <button ndButton size="lg">Large</button>
        <button ndButton variant="outline" size="icon-xs" aria-label="Add">
          <svg ndIcon="plus"></svg>
        </button>
        <button ndButton variant="outline" size="icon-sm" aria-label="Add">
          <svg ndIcon="plus"></svg>
        </button>
        <button ndButton variant="outline" size="icon" aria-label="Add">
          <svg ndIcon="plus"></svg>
        </button>
        <button ndButton variant="outline" size="icon-lg" aria-label="Add">
          <svg ndIcon="plus"></svg>
        </button>
      </div>
    </section>

    <section
      class="col-span-5 grid content-start gap-3"
      aria-labelledby="sheet-badges"
    >
      <h2 id="sheet-badges" class="text-muted-foreground text-sm font-medium">
        Badges
      </h2>
      <div class="flex flex-wrap items-center gap-2">
        @for (variant of badgeVariants; track variant) {
          @if (variant === 'link') {
            <a ndBadge variant="link" href="#sheet-badges">Link</a>
          } @else {
            <span ndBadge [variant]="variant" class="capitalize">{{
              variant
            }}</span>
          }
        }
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span ndBadge variant="secondary">
          <svg ndIcon="circle-check"></svg>
          Verified
        </span>
        <span ndBadge class="h-5 min-w-5 rounded-full px-1 tabular-nums"
          >8</span
        >
        <span
          ndBadge
          variant="destructive"
          class="h-5 min-w-5 rounded-full px-1 tabular-nums"
          >99</span
        >
        <span
          ndBadge
          variant="outline"
          class="h-5 min-w-5 rounded-full px-1 tabular-nums"
          >20+</span
        >
      </div>
    </section>

    <nav
      class="bg-sidebar text-sidebar-foreground border-sidebar-border col-span-3 flex flex-col gap-4 rounded-xl border p-2"
      aria-label="Workspace"
    >
      <div class="flex items-center gap-2 p-2">
        <span
          class="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-lg"
        >
          <svg ndIcon="layout-dashboard" class="size-4"></svg>
        </span>
        <span class="grid leading-tight">
          <span class="text-sm font-semibold">Acme Inc</span>
          <span class="text-sidebar-foreground/70 text-xs">Enterprise</span>
        </span>
      </div>
      <div class="grid gap-1">
        <p class="text-sidebar-foreground/70 px-2 text-xs font-medium">
          Platform
        </p>
        <ul class="grid gap-1">
          @for (link of links; track link.label; let first = $first) {
            <li>
              <a
                [href]="'#' + link.icon"
                class="flex h-8 items-center gap-2 rounded-md px-2 text-sm"
                [class]="
                  first
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : ''
                "
                [attr.aria-current]="first ? 'page' : null"
              >
                <svg [ndIcon]="link.icon" class="size-4"></svg>
                {{ link.label }}
              </a>
            </li>
          }
        </ul>
      </div>
      <div
        class="border-sidebar-border mt-auto flex items-center gap-2 border-t px-2 pt-3 pb-1"
      >
        <span
          class="bg-sidebar-accent text-sidebar-accent-foreground flex size-8 items-center justify-center rounded-full text-xs font-medium"
          aria-hidden="true"
          >AL</span
        >
        <span class="grid leading-tight">
          <span class="text-sm font-medium">Ada Lovelace</span>
          <span class="text-sidebar-foreground/70 text-xs"
            >ada&#64;acme.dev</span
          >
        </span>
      </div>
    </nav>

    <section ndCard class="col-span-5" aria-labelledby="sheet-project">
      <div ndCardHeader>
        <h2 ndCardTitle id="sheet-project">Create project</h2>
        <p ndCardDescription>Set up a workspace for your team.</p>
      </div>
      <form ndCardContent id="sheet-form" class="grid gap-5">
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <label ndLabel for="sheet-name">Name</label>
            <input ndInput id="sheet-name" value="Analytics" />
          </div>
          <div class="grid gap-2">
            <label ndLabel for="sheet-plan">Plan</label>
            <ng-container ndSelect [(value)]="plan">
              <button ndSelectTrigger id="sheet-plan" class="w-full">
                <span ndSelectValue placeholder="Select a plan"></span>
                <svg ndIcon="chevron-down" class="size-4 opacity-50"></svg>
              </button>
              <div ndSelectContent>
                @for (option of plans; track option.value) {
                  <div ndSelectItem [value]="option.value">
                    <span ndSelectItemIndicator
                      ><svg ndIcon="check"></svg
                    ></span>
                    <span ndSelectItemText>{{ option.label }}</span>
                  </div>
                }
              </div>
            </ng-container>
          </div>
        </div>
        <div class="grid gap-2">
          <label ndLabel for="sheet-description">Description</label>
          <textarea
            ndTextarea
            id="sheet-description"
            placeholder="What is this project about?"
          ></textarea>
        </div>
        <fieldset ndFieldSet class="gap-3">
          <legend ndFieldLegend variant="label" id="sheet-visibility">
            Visibility
          </legend>
          <div
            ndRadioGroup
            aria-labelledby="sheet-visibility"
            defaultValue="team"
            class="flex gap-6"
          >
            @for (option of visibility; track option.value) {
              <div class="flex items-center gap-2">
                <button
                  ndRadioGroupItem
                  [value]="option.value"
                  [id]="'sheet-visibility-' + option.value"
                >
                  <span ndRadioGroupIndicator><svg ndIcon="circle"></svg></span>
                </button>
                <label ndLabel [for]="'sheet-visibility-' + option.value">
                  {{ option.label }}
                </label>
              </div>
            }
          </div>
        </fieldset>
        <div class="flex items-center gap-2">
          <button ndCheckbox id="sheet-readme" [defaultChecked]="true">
            <span ndCheckboxIndicator><svg ndIcon="check"></svg></span>
          </button>
          <label ndLabel for="sheet-readme">Add a README</label>
        </div>
        <div class="flex items-center gap-2">
          <button ndSwitch id="sheet-notify" [defaultChecked]="true">
            <span ndSwitchThumb></span>
          </button>
          <label ndLabel for="sheet-notify">Email me about activity</label>
        </div>
      </form>
      <div ndCardFooter class="justify-end gap-2">
        <button ndButton variant="outline" type="button">Cancel</button>
        <button ndButton type="submit" form="sheet-form">Create</button>
      </div>
    </section>

    <div class="col-span-4 flex flex-col gap-4">
      <div ndAlert role="none">
        <svg ndIcon="circle-check"></svg>
        <div ndAlertTitle>Deploy finished</div>
        <div ndAlertDescription>Analytics is live on the edge network.</div>
      </div>
      <div ndAlert variant="destructive" role="none">
        <svg ndIcon="circle-alert"></svg>
        <div ndAlertTitle>Payment failed</div>
        <div ndAlertDescription>Check the card on file and try again.</div>
      </div>
      <div ndTabs defaultValue="overview" class="mt-2">
        <div ndTabsList aria-label="Project">
          <button ndTabsTrigger value="overview">Overview</button>
          <button ndTabsTrigger value="activity">Activity</button>
          <button ndTabsTrigger value="settings">Settings</button>
        </div>
        <div ndTabsContent value="overview">
          <dl class="grid divide-y rounded-lg border text-sm">
            @for (stat of stats; track stat.label) {
              <div class="flex items-center justify-between px-3 py-2">
                <dt class="text-muted-foreground">{{ stat.label }}</dt>
                <dd class="font-medium tabular-nums">{{ stat.value }}</dd>
              </div>
            }
          </dl>
        </div>
        <div ndTabsContent value="activity" class="pt-2 text-sm">
          No new activity.
        </div>
        <div ndTabsContent value="settings" class="pt-2 text-sm">
          Settings are up to date.
        </div>
      </div>
      <div class="mt-auto grid gap-2">
        <div class="flex items-center justify-between text-sm">
          <span id="sheet-storage" class="font-medium">Storage</span>
          <span class="text-muted-foreground">6.6 GB of 10 GB</span>
        </div>
        <div ndProgress [value]="66" aria-labelledby="sheet-storage">
          <div ndProgressIndicator></div>
        </div>
      </div>
      <div class="flex items-center gap-4" aria-busy="true">
        <span class="sr-only">Loading members</span>
        <div ndSkeleton class="size-10 rounded-full"></div>
        <div class="grid flex-1 gap-2">
          <div ndSkeleton class="h-4 w-4/5"></div>
          <div ndSkeleton class="h-4 w-3/5"></div>
        </div>
      </div>
    </div>

    <section ndCard class="col-span-5" aria-labelledby="sheet-chart">
      <div ndCardHeader>
        <h2 ndCardTitle id="sheet-chart">Visitors by browser</h2>
        <p ndCardDescription>June 2026</p>
      </div>
      <div ndCardContent>
        <figure
          ndChartContainer
          [config]="config"
          class="aspect-auto flex-col gap-4"
        >
          <figcaption class="sr-only">
            Visitors by browser, June 2026
          </figcaption>
          <svg
            [attr.viewBox]="'0 0 ' + width + ' ' + height"
            class="h-auto w-full"
            aria-hidden="true"
          >
            <g ndChartGrid>
              @for (tick of ticks; track tick) {
                <line
                  x1="0"
                  [attr.x2]="width"
                  [attr.y1]="tick"
                  [attr.y2]="tick"
                />
              }
            </g>
            @for (bar of bars; track bar.key) {
              <rect
                [attr.x]="bar.x"
                [attr.y]="bar.y"
                [attr.width]="bar.width"
                [attr.height]="height - bar.y"
                rx="4"
                [attr.fill]="'var(--color-' + bar.key + ')'"
              />
            }
          </svg>
          <ul ndChartLegend>
            @for (bar of bars; track bar.key) {
              <li ndChartLegendItem>
                <span
                  ndChartLegendIndicator
                  [color]="'var(--color-' + bar.key + ')'"
                ></span>
                {{ config[bar.key]?.label }}
              </li>
            }
          </ul>
          <table class="sr-only">
            <thead>
              <tr>
                <th scope="col">Browser</th>
                <th scope="col">Visitors</th>
              </tr>
            </thead>
            <tbody>
              @for (bar of bars; track bar.key) {
                <tr>
                  <th scope="row">{{ config[bar.key]?.label }}</th>
                  <td>{{ bar.value }}</td>
                </tr>
              }
            </tbody>
          </table>
        </figure>
      </div>
    </section>

    <section ndCard class="col-span-7" aria-labelledby="sheet-invoices">
      <div ndCardHeader>
        <h2 ndCardTitle id="sheet-invoices">Recent invoices</h2>
        <p ndCardDescription>Five of 48 this month.</p>
      </div>
      <div ndCardContent>
        <div ndTableContainer>
          <table ndTable aria-labelledby="sheet-invoices">
            <thead ndTableHeader>
              <tr ndTableRow>
                <th ndTableHead scope="col">Invoice</th>
                <th ndTableHead scope="col">Status</th>
                <th ndTableHead scope="col">Method</th>
                <th ndTableHead scope="col" class="text-end">Amount</th>
              </tr>
            </thead>
            <tbody ndTableBody>
              @for (invoice of invoices; track invoice.id) {
                <tr ndTableRow>
                  <th ndTableHead scope="row" class="font-mono">
                    {{ invoice.id }}
                  </th>
                  <td ndTableCell>
                    <span ndBadge [variant]="invoice.badge">{{
                      invoice.status
                    }}</span>
                  </td>
                  <td ndTableCell>{{ invoice.method }}</td>
                  <td ndTableCell class="text-end">{{ invoice.amount }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `,
})
export class ThemeSheet {
  protected readonly swatches = SWATCHES;
  protected readonly buttonVariants: readonly ButtonVariant[] = [
    'default',
    'secondary',
    'outline',
    'ghost',
    'destructive',
    'link',
  ];
  protected readonly badgeVariants: readonly BadgeVariant[] = [
    'default',
    'secondary',
    'destructive',
    'outline',
    'ghost',
    'link',
  ];
  protected readonly links = [
    { label: 'Dashboard', icon: 'layout-dashboard' },
    { label: 'Projects', icon: 'folder-open' },
    { label: 'Reports', icon: 'chart-column' },
    { label: 'Billing', icon: 'credit-card' },
    { label: 'Support', icon: 'life-buoy' },
  ];
  protected readonly stats = [
    { label: 'Deploys', value: '12' },
    { label: 'Uptime', value: '99.98%' },
    { label: 'Members', value: '8' },
  ];
  protected readonly plan = signal<string | null>('pro');
  protected readonly plans = [
    { value: 'free', label: 'Free' },
    { value: 'pro', label: 'Pro' },
    { value: 'enterprise', label: 'Enterprise' },
  ];
  protected readonly visibility = [
    { value: 'private', label: 'Private' },
    { value: 'team', label: 'Team' },
    { value: 'public', label: 'Public' },
  ];
  protected readonly invoices: readonly {
    id: string;
    status: string;
    badge: BadgeVariant;
    method: string;
    amount: string;
  }[] = [
    {
      id: 'INV001',
      status: 'Paid',
      badge: 'secondary',
      method: 'Credit card',
      amount: '$250.00',
    },
    {
      id: 'INV002',
      status: 'Pending',
      badge: 'outline',
      method: 'PayPal',
      amount: '$150.00',
    },
    {
      id: 'INV003',
      status: 'Overdue',
      badge: 'destructive',
      method: 'Bank transfer',
      amount: '$350.00',
    },
    {
      id: 'INV004',
      status: 'Paid',
      badge: 'secondary',
      method: 'Credit card',
      amount: '$450.00',
    },
  ];

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly config: ChartConfig = {
    chrome: { label: 'Chrome', color: 'var(--chart-1)' },
    safari: { label: 'Safari', color: 'var(--chart-2)' },
    firefox: { label: 'Firefox', color: 'var(--chart-3)' },
    edge: { label: 'Edge', color: 'var(--chart-4)' },
    other: { label: 'Other', color: 'var(--chart-5)' },
  };
  protected readonly ticks = [0, 40, 80, 120, 160];
  protected readonly bars = (
    [
      ['chrome', 275],
      ['safari', 200],
      ['firefox', 187],
      ['edge', 173],
      ['other', 90],
    ] as const
  ).map(([key, value], index) => {
    const slot = WIDTH / 5;
    return {
      key,
      value,
      x: index * slot + slot * 0.15,
      y: HEIGHT - (value / 300) * HEIGHT,
      width: slot * 0.7,
    };
  });
}
