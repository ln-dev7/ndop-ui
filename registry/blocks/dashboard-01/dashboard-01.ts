import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Badge, type BadgeVariant } from '@/ui/badge/badge';
import { Button } from '@/ui/button/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/card/card';
import {
  areaPath,
  ChartAxis,
  type ChartConfig,
  ChartContainer,
  ChartCursor,
  ChartGrid,
  ChartLegend,
  ChartLegendIndicator,
  ChartLegendItem,
  ChartPlot,
  ChartTooltip,
  ChartTooltipBody,
  ChartTooltipIndicator,
  ChartTooltipItem,
  ChartTooltipLabel,
  ChartTooltipList,
  ChartTooltipName,
  ChartTooltipValue,
  scaleLinear,
  stack,
} from '@/ui/chart/chart';
import { Skeleton } from '@/ui/skeleton/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/table/table';
import { ToggleGroup, ToggleGroupItem } from '@/ui/toggle-group/toggle-group';
import { dashboardResource, type DashboardOrderStatus } from './data';

/** The plot's size, in viewBox units. */
const WIDTH = 600;
const HEIGHT = 250;
/** Room under the plot for the date labels. */
const AXIS = 24;
/** About how many date labels fit under the plot. */
const LABELS = 6;

/** The ranges the chart can show, in days. */
const RANGES = [
  { value: '90d', short: '3 months', label: 'Last 3 months', days: 90 },
  { value: '30d', short: '30 days', label: 'Last 30 days', days: 30 },
  { value: '7d', short: '7 days', label: 'Last 7 days', days: 7 },
] as const;

/** Each order status's badge. */
const STATUS_VARIANTS: Record<DashboardOrderStatus, BadgeVariant> = {
  paid: 'secondary',
  pending: 'outline',
  refunded: 'destructive',
};

/**
 * A dashboard page: a header with a download action, four stat cards with
 * their trends, an area chart of desktop and mobile visitors over the last
 * 3 months, 30 or 7 days, and a table of recent orders. The data comes
 * from `dashboardResource()` in `./data`, with skeletons while it loads.
 * The chart is one tab stop: the arrow keys move between days, and a
 * hidden table holds every value.
 */
@Component({
  selector: 'block-dashboard-01',
  imports: [
    Badge,
    Button,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    ChartAxis,
    ChartContainer,
    ChartCursor,
    ChartGrid,
    ChartLegend,
    ChartLegendIndicator,
    ChartLegendItem,
    ChartPlot,
    ChartTooltip,
    ChartTooltipBody,
    ChartTooltipIndicator,
    ChartTooltipItem,
    ChartTooltipLabel,
    ChartTooltipList,
    ChartTooltipName,
    ChartTooltipValue,
    CurrencyPipe,
    DatePipe,
    NdIcon,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableHeader,
    TableRow,
    ToggleGroup,
    ToggleGroupItem,
  ],
  template: `
    <main
      class="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-6 bg-background p-4 text-foreground md:p-8"
      [attr.aria-busy]="data.isLoading()"
    >
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="grid gap-1">
          <h1 class="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p class="text-sm text-muted-foreground">
            Your store at a glance, July 14 to October 11, 2026.
          </p>
        </div>
        <button ndButton variant="outline">
          <svg ndIcon="download"></svg>
          Download report
        </button>
      </div>

      <section aria-labelledby="dashboard-01-metrics">
        <h2 id="dashboard-01-metrics" class="sr-only">Key metrics</h2>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          @if (data.value(); as value) {
            @for (stat of value.stats; track stat.id) {
              <div ndCard class="gap-4">
                <div ndCardHeader>
                  <p ndCardDescription>{{ stat.label }}</p>
                  <p
                    ndCardTitle
                    class="text-2xl font-semibold tabular-nums @[250px]/card-header:text-3xl"
                  >
                    {{ stat.value }}
                  </p>
                  <div ndCardAction>
                    <span ndBadge variant="outline">
                      <svg
                        [ndIcon]="
                          stat.change < 0 ? 'trending-down' : 'trending-up'
                        "
                      ></svg>
                      {{ stat.change > 0 ? '+' : '' }}{{ stat.change }}%
                    </span>
                  </div>
                </div>
                <div ndCardFooter class="flex-col items-start gap-1 text-sm">
                  <p class="flex items-center gap-2 font-medium">
                    {{ stat.trend }}
                    <svg
                      class="size-4"
                      [ndIcon]="
                        stat.change < 0 ? 'trending-down' : 'trending-up'
                      "
                    ></svg>
                  </p>
                  <p class="text-muted-foreground">{{ stat.note }}</p>
                </div>
              </div>
            }
          } @else {
            @for (placeholder of [1, 2, 3, 4]; track placeholder) {
              <div ndCard class="gap-4">
                <div ndCardHeader>
                  <div ndSkeleton class="h-4 w-24"></div>
                  <div ndSkeleton class="h-8 w-32"></div>
                </div>
                <div ndCardFooter class="flex-col items-start gap-2">
                  <div ndSkeleton class="h-4 w-40"></div>
                  <div ndSkeleton class="h-4 w-32"></div>
                </div>
              </div>
            }
          }
        </div>
      </section>

      <section ndCard aria-labelledby="dashboard-01-visitors">
        <div ndCardHeader>
          <h2 ndCardTitle id="dashboard-01-visitors">Total visitors</h2>
          <p ndCardDescription>{{ rangeLabel() }}, desktop and mobile.</p>
          <div ndCardAction>
            <div
              ndToggleGroup
              variant="outline"
              size="sm"
              aria-label="Chart range"
              [value]="rangeValue()"
              (valueChange)="pickRange($event)"
            >
              @for (option of ranges; track option.value) {
                <button ndToggleGroupItem class="px-3" [value]="option.value">
                  {{ option.short }}
                </button>
              }
            </div>
          </div>
        </div>
        <div ndCardContent>
          @if (data.isLoading()) {
            <div ndSkeleton class="aspect-[12/5] w-full"></div>
          } @else {
            <figure
              ndChartContainer
              [config]="config"
              class="aspect-auto w-full flex-col gap-2"
            >
              <figcaption id="dashboard-01-chart-caption" class="sr-only">
                Visitors per day, {{ rangeLabel() }}
              </figcaption>
              <svg
                ndChartPlot
                [attr.viewBox]="'0 0 ' + width + ' ' + height"
                [xs]="xs()"
                [(active)]="active"
                aria-labelledby="dashboard-01-chart-caption"
                aria-describedby="dashboard-01-chart-hint"
              >
                <g ndChartGrid>
                  @for (tick of y().ticks(4); track tick) {
                    <line
                      x1="0"
                      [attr.x2]="width"
                      [attr.y1]="y()(tick)"
                      [attr.y2]="y()(tick)"
                    />
                  }
                </g>
                @for (key of keys; track key) {
                  <path
                    [attr.d]="areas()[key]"
                    [attr.fill]="'var(--color-' + key + ')'"
                    fill-opacity="0.4"
                    [attr.stroke]="'var(--color-' + key + ')'"
                  />
                }
                @if (active() !== null) {
                  <line
                    ndChartCursor
                    [attr.x1]="(left() * width) / 100"
                    [attr.x2]="(left() * width) / 100"
                    y1="0"
                    [attr.y2]="height - axis"
                  />
                }
                <g ndChartAxis text-anchor="middle">
                  @for (tick of labels(); track tick.index) {
                    <text [attr.x]="xs()[tick.index]" [attr.y]="height - 6">
                      {{ tick.date | date: 'MMM d' : 'UTC' }}
                    </text>
                  }
                </g>
              </svg>
              @if (current(); as row) {
                <div ndChartTooltip [style.left.%]="left()">
                  <div ndChartTooltipLabel>
                    {{ row.date | date: 'MMMM d' : 'UTC' }}
                  </div>
                  <div ndChartTooltipList>
                    @for (key of keys; track key) {
                      <div ndChartTooltipItem>
                        <span
                          ndChartTooltipIndicator
                          [color]="'var(--color-' + key + ')'"
                        ></span>
                        <div ndChartTooltipBody>
                          <span ndChartTooltipName>{{
                            config[key]?.label
                          }}</span>
                          <span ndChartTooltipValue>{{ row[key] }}</span>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
              <ul ndChartLegend>
                @for (key of keys; track key) {
                  <li ndChartLegendItem>
                    <span
                      ndChartLegendIndicator
                      [color]="'var(--color-' + key + ')'"
                    ></span>
                    {{ config[key]?.label }}
                  </li>
                }
              </ul>
              <p id="dashboard-01-chart-hint" class="sr-only">
                Use the arrow keys to read each day.
              </p>
              <p class="sr-only" aria-live="polite">{{ summary() }}</p>
              <table class="sr-only">
                <caption>
                  Visitors per day
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Desktop</th>
                    <th scope="col">Mobile</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of visitors(); track row.date) {
                    <tr>
                      <th scope="row">
                        {{ row.date | date: 'MMMM d' : 'UTC' }}
                      </th>
                      <td>{{ row.desktop }}</td>
                      <td>{{ row.mobile }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </figure>
          }
        </div>
      </section>

      <section ndCard aria-labelledby="dashboard-01-orders">
        <div ndCardHeader>
          <h2 ndCardTitle id="dashboard-01-orders">Recent orders</h2>
          <p ndCardDescription>The latest orders from your store.</p>
          <div ndCardAction>
            <a ndButton variant="outline" size="sm" href="/orders">View all</a>
          </div>
        </div>
        <div ndCardContent>
          <!-- Focusable, so keyboard users can scroll it sideways on a phone. -->
          <div
            ndTableContainer
            tabindex="0"
            role="region"
            aria-label="Orders table"
          >
            <table ndTable>
              <thead ndTableHeader>
                <tr ndTableRow>
                  <th ndTableHead scope="col">Customer</th>
                  <th ndTableHead scope="col">Order</th>
                  <th ndTableHead scope="col">Status</th>
                  <th ndTableHead scope="col" class="hidden md:table-cell">
                    Date
                  </th>
                  <th ndTableHead scope="col" class="text-end">Amount</th>
                </tr>
              </thead>
              <tbody ndTableBody>
                @if (data.value(); as value) {
                  @for (order of value.orders; track order.id) {
                    <tr ndTableRow>
                      <td ndTableCell>
                        <div class="font-medium">{{ order.customer }}</div>
                        <div class="text-sm text-muted-foreground">
                          {{ order.email }}
                        </div>
                      </td>
                      <td ndTableCell class="font-mono">{{ order.id }}</td>
                      <td ndTableCell>
                        <span
                          ndBadge
                          class="capitalize"
                          [variant]="statusVariants[order.status]"
                          >{{ order.status }}</span
                        >
                      </td>
                      <td ndTableCell class="hidden md:table-cell">
                        {{ order.date | date: 'mediumDate' : 'UTC' }}
                      </td>
                      <td ndTableCell class="text-end tabular-nums">
                        {{ order.amount | currency: 'USD' }}
                      </td>
                    </tr>
                  }
                } @else {
                  @for (placeholder of [1, 2, 3, 4]; track placeholder) {
                    <tr ndTableRow>
                      <td ndTableCell colspan="5">
                        <div ndSkeleton class="h-8 w-full"></div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  `,
})
export class Dashboard01Block {
  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly axis = AXIS;
  protected readonly ranges = RANGES;
  protected readonly statusVariants = STATUS_VARIANTS;
  protected readonly keys = ['desktop', 'mobile'] as const;
  protected readonly config: ChartConfig = {
    desktop: { label: 'Desktop', color: 'var(--chart-1)' },
    mobile: { label: 'Mobile', color: 'var(--chart-2)' },
  };

  protected readonly data = dashboardResource();

  protected readonly rangeValue = signal<readonly string[]>(['90d']);
  protected readonly active = signal<number | null>(null);

  protected readonly range = computed(
    () =>
      RANGES.find((option) => option.value === this.rangeValue()[0]) ??
      RANGES[0],
  );

  protected readonly rangeLabel = computed(() => this.range().label);

  protected readonly visitors = computed(() =>
    (this.data.value()?.visitors ?? []).slice(-this.range().days),
  );

  protected readonly xs = computed(() => {
    const count = this.visitors().length;
    return this.visitors().map(
      (_, index) => (index / Math.max(1, count - 1)) * WIDTH,
    );
  });

  protected readonly labels = computed(() => {
    const rows = this.visitors();
    const step = Math.max(1, Math.ceil(rows.length / LABELS));
    return rows.flatMap((row, index) =>
      index % step === 0 ? [{ index, date: row.date }] : [],
    );
  });

  /** Mobile stacked on desktop: each value's bottom and top. */
  protected readonly stacked = computed(() =>
    stack([
      this.visitors().map((row) => row.desktop),
      this.visitors().map((row) => row.mobile),
    ]),
  );

  protected readonly y = computed(() =>
    scaleLinear(
      [0, Math.max(1, ...(this.stacked()[1] ?? []).map(([, top]) => top))],
      [HEIGHT - AXIS, 8],
    ),
  );

  protected readonly areas = computed(() => {
    const y = this.y();
    const xs = this.xs();
    const points = (series: number) =>
      (this.stacked()[series] ?? []).map(([bottom, top], index) => ({
        top: { x: xs[index] ?? 0, y: y(top) },
        bottom: { x: xs[index] ?? 0, y: y(bottom) },
      }));
    const desktop = points(0);
    const mobile = points(1);
    return {
      desktop: areaPath(
        desktop.map((point) => point.top),
        y(0),
        'monotone',
      ),
      mobile: areaPath(
        mobile.map((point) => point.top),
        mobile.map((point) => point.bottom),
        'monotone',
      ),
    };
  });

  protected readonly current = computed(() => {
    const index = this.active();
    return index === null ? null : (this.visitors()[index] ?? null);
  });

  protected readonly left = computed(() => {
    const index = this.active();
    return index === null ? 0 : ((this.xs()[index] ?? 0) / WIDTH) * 100;
  });

  protected readonly summary = computed(() => {
    const row = this.current();
    return row
      ? `${row.date}: desktop ${row.desktop}, mobile ${row.mobile}.`
      : '';
  });

  /**
   * Shows another range. A single toggle group can be emptied by pressing
   * its pressed item again, so that keeps the current range instead.
   *
   * @param value - The pressed items' values.
   */
  protected pickRange(value: readonly string[]): void {
    this.active.set(null);
    this.rangeValue.set(value.length > 0 ? value : [...this.rangeValue()]);
  }
}
