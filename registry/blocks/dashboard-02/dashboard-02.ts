import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Avatar, AvatarFallback } from '@/ui/avatar/avatar';
import { Badge } from '@/ui/badge/badge';
import { Button } from '@/ui/button/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/card/card';
import {
  ChartAxis,
  type ChartConfig,
  ChartContainer,
  ChartCursor,
  ChartGrid,
  ChartLabel,
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
  scaleBand,
  scaleLinear,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs/tabs';
import { analyticsResource, type AnalyticsNotificationKind } from './data';

/** The plot's size, in viewBox units. */
const WIDTH = 500;
const HEIGHT = 225;

/** Each notification kind's icon. */
const KIND_ICONS: Record<AnalyticsNotificationKind, string> = {
  order: 'credit-card',
  alert: 'triangle-alert',
  team: 'users',
  report: 'file-text',
};

/**
 * An analytics dashboard page in three tabs. Overview has four stat
 * cards, a bar chart of online and in-store revenue by month, and a list
 * of recent sales; Reports has a table of monthly figures; Notifications
 * lists the latest events. The data comes from `analyticsResource()` in
 * `./data`, with skeletons while it loads. The arrow keys move between the
 * tabs, and between months on the chart.
 */
@Component({
  selector: 'block-dashboard-02',
  imports: [
    Avatar,
    AvatarFallback,
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    ChartAxis,
    ChartContainer,
    ChartCursor,
    ChartGrid,
    ChartLabel,
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
    DecimalPipe,
    NdIcon,
    Skeleton,
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
  ],
  template: `
    <main
      class="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-6 bg-background p-4 text-foreground md:p-8"
      [attr.aria-busy]="data.isLoading()"
    >
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
        <button ndButton>
          <svg ndIcon="download"></svg>
          Download
        </button>
      </div>

      <div ndTabs defaultValue="overview" class="gap-4">
        <div
          ndTabsList
          aria-label="Dashboard sections"
          class="max-w-full overflow-x-auto"
        >
          <button ndTabsTrigger value="overview">Overview</button>
          <button ndTabsTrigger value="reports">Reports</button>
          <button ndTabsTrigger value="notifications">
            Notifications
            @if (unread() > 0) {
              <span ndBadge class="h-5 min-w-5 rounded-full px-1 tabular-nums"
                >{{ unread() }}<span class="sr-only"> unread</span></span
              >
            }
          </button>
        </div>

        <div ndTabsContent value="overview" class="flex flex-col gap-4">
          <h2 class="sr-only">Overview</h2>
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            @if (data.value(); as value) {
              @for (stat of value.stats; track stat.id) {
                <div ndCard class="gap-2">
                  <div ndCardHeader>
                    <h3 ndCardDescription class="font-medium text-foreground">
                      {{ stat.label }}
                    </h3>
                  </div>
                  <div ndCardContent>
                    <p class="text-2xl font-bold tabular-nums">
                      {{ stat.value }}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {{ stat.change }}
                    </p>
                  </div>
                </div>
              }
            } @else {
              @for (placeholder of [1, 2, 3, 4]; track placeholder) {
                <div ndCard class="gap-3 px-6">
                  <div ndSkeleton class="h-4 w-24"></div>
                  <div ndSkeleton class="h-8 w-32"></div>
                  <div ndSkeleton class="h-3 w-40"></div>
                </div>
              }
            }
          </div>

          <div class="grid gap-4 lg:grid-cols-7">
            <section
              ndCard
              class="lg:col-span-4"
              aria-labelledby="dashboard-02-revenue"
            >
              <div ndCardHeader>
                <h3 ndCardTitle id="dashboard-02-revenue">Revenue</h3>
                <p ndCardDescription>Online and in store, May to October.</p>
              </div>
              <div ndCardContent>
                @if (data.isLoading()) {
                  <div ndSkeleton class="aspect-video w-full"></div>
                } @else {
                  <figure
                    ndChartContainer
                    [config]="config"
                    class="w-full flex-col gap-2"
                  >
                    <figcaption id="dashboard-02-chart-caption" class="sr-only">
                      Revenue by month, in US dollars
                    </figcaption>
                    <svg
                      ndChartPlot
                      [attr.viewBox]="'0 0 ' + width + ' ' + height"
                      [xs]="centers()"
                      [(active)]="active"
                      aria-labelledby="dashboard-02-chart-caption"
                      aria-describedby="dashboard-02-chart-hint"
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
                      @if (current(); as row) {
                        <rect
                          ndChartCursor
                          kind="band"
                          [attr.x]="x()(row.month) - x().step * 0.1"
                          y="0"
                          [attr.width]="x().bandwidth + x().step * 0.2"
                          [attr.height]="height"
                        />
                      }
                      @for (row of months(); track row.month) {
                        <rect
                          [attr.x]="x()(row.month)"
                          [attr.y]="y()(row.online)"
                          [attr.width]="bar()"
                          [attr.height]="y()(0) - y()(row.online)"
                          rx="4"
                          fill="var(--color-online)"
                        />
                        <rect
                          [attr.x]="x()(row.month) + bar()"
                          [attr.y]="y()(row.inStore)"
                          [attr.width]="bar()"
                          [attr.height]="y()(0) - y()(row.inStore)"
                          rx="4"
                          fill="var(--color-inStore)"
                        />
                      }
                    </svg>
                    <div ndChartAxis>
                      @for (row of months(); track row.month; let i = $index) {
                        <span
                          ndChartLabel
                          [style.left.%]="((centers()[i] ?? 0) / width) * 100"
                        >
                          {{ row.month.slice(0, 3) }}
                        </span>
                      }
                    </div>
                    @if (current(); as row) {
                      <div ndChartTooltip [style.left.%]="left()">
                        <div ndChartTooltipLabel>{{ row.month }}</div>
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
                                <span ndChartTooltipValue>{{
                                  row[key]
                                    | currency: 'USD' : 'symbol' : '1.0-0'
                                }}</span>
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
                    <p id="dashboard-02-chart-hint" class="sr-only">
                      Use the arrow keys to read each month.
                    </p>
                    <p class="sr-only" aria-live="polite">{{ summary() }}</p>
                    <table class="sr-only">
                      <caption>
                        Revenue by month
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Month</th>
                          <th scope="col">Online</th>
                          <th scope="col">In store</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (row of months(); track row.month) {
                          <tr>
                            <th scope="row">{{ row.month }}</th>
                            <td>
                              {{
                                row.online
                                  | currency: 'USD' : 'symbol' : '1.0-0'
                              }}
                            </td>
                            <td>
                              {{
                                row.inStore
                                  | currency: 'USD' : 'symbol' : '1.0-0'
                              }}
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </figure>
                }
              </div>
            </section>

            <section
              ndCard
              class="lg:col-span-3"
              aria-labelledby="dashboard-02-sales"
            >
              <div ndCardHeader>
                <h3 ndCardTitle id="dashboard-02-sales">Recent sales</h3>
                <p ndCardDescription>You made 265 sales this month.</p>
              </div>
              <div ndCardContent>
                @if (data.value(); as value) {
                  <ul class="grid gap-6">
                    @for (sale of value.sales; track sale.id) {
                      <li class="flex items-center gap-4">
                        <span ndAvatar aria-hidden="true">
                          <span ndAvatarFallback>{{
                            initials(sale.name)
                          }}</span>
                        </span>
                        <div class="grid min-w-0 gap-1">
                          <p class="text-sm leading-none font-medium">
                            {{ sale.name }}
                          </p>
                          <p class="truncate text-sm text-muted-foreground">
                            {{ sale.email }}
                          </p>
                        </div>
                        <p class="ms-auto font-medium tabular-nums">
                          +{{ sale.amount | currency: 'USD' }}
                        </p>
                      </li>
                    }
                  </ul>
                } @else {
                  <div class="grid gap-6">
                    @for (placeholder of [1, 2, 3, 4, 5]; track placeholder) {
                      <div class="flex items-center gap-4">
                        <div ndSkeleton class="size-8 rounded-full"></div>
                        <div class="grid flex-1 gap-2">
                          <div ndSkeleton class="h-4 w-32"></div>
                          <div ndSkeleton class="h-4 w-48"></div>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </section>
          </div>
        </div>

        <div ndTabsContent value="reports">
          <section ndCard aria-labelledby="dashboard-02-reports">
            <div ndCardHeader>
              <h2 ndCardTitle id="dashboard-02-reports">Monthly report</h2>
              <p ndCardDescription>
                Revenue, orders and conversion for the last 6 months.
              </p>
            </div>
            <div ndCardContent>
              <!-- Focusable, so keyboard users can scroll it sideways on a phone. -->
              <div
                ndTableContainer
                tabindex="0"
                role="region"
                aria-label="Monthly report"
              >
                <table ndTable>
                  <thead ndTableHeader>
                    <tr ndTableRow>
                      <th ndTableHead scope="col">Month</th>
                      <th ndTableHead scope="col" class="text-end">Online</th>
                      <th ndTableHead scope="col" class="text-end">In store</th>
                      <th ndTableHead scope="col" class="text-end">Orders</th>
                      <th ndTableHead scope="col" class="text-end">
                        Conversion
                      </th>
                    </tr>
                  </thead>
                  <tbody ndTableBody>
                    @for (row of months(); track row.month) {
                      <tr ndTableRow>
                        <th ndTableHead scope="row">
                          {{ row.month }}
                        </th>
                        <td ndTableCell class="text-end tabular-nums">
                          {{
                            row.online | currency: 'USD' : 'symbol' : '1.0-0'
                          }}
                        </td>
                        <td ndTableCell class="text-end tabular-nums">
                          {{
                            row.inStore | currency: 'USD' : 'symbol' : '1.0-0'
                          }}
                        </td>
                        <td ndTableCell class="text-end tabular-nums">
                          {{ row.orders | number }}
                        </td>
                        <td ndTableCell class="text-end tabular-nums">
                          {{ row.conversion | number: '1.1-1' }}%
                        </td>
                      </tr>
                    } @empty {
                      <tr ndTableRow>
                        <td ndTableCell colspan="5">
                          <div ndSkeleton class="h-8 w-full"></div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        <div ndTabsContent value="notifications">
          <section ndCard aria-labelledby="dashboard-02-notifications">
            <div ndCardHeader>
              <h2 ndCardTitle id="dashboard-02-notifications">Notifications</h2>
              <p ndCardDescription>
                You have {{ unread() }} unread notifications.
              </p>
            </div>
            <div ndCardContent>
              <ul class="grid gap-2">
                @for (item of notifications(); track item.id) {
                  <li class="flex items-start gap-4 rounded-lg border p-4">
                    <span
                      class="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground"
                    >
                      <svg [ndIcon]="kindIcons[item.kind]" class="size-4"></svg>
                    </span>
                    <div class="grid min-w-0 flex-1 gap-1">
                      <p class="flex items-center gap-2 text-sm font-medium">
                        {{ item.title }}
                        @if (item.unread) {
                          <span ndBadge variant="secondary">New</span>
                        }
                      </p>
                      <p class="text-sm text-muted-foreground">
                        {{ item.body }}
                      </p>
                    </div>
                    <p
                      class="shrink-0 text-xs whitespace-nowrap text-muted-foreground"
                    >
                      {{ item.time }}
                    </p>
                  </li>
                } @empty {
                  @for (placeholder of [1, 2, 3]; track placeholder) {
                    <li ndSkeleton class="h-16 w-full"></li>
                  }
                }
              </ul>
            </div>
          </section>
        </div>
      </div>
    </main>
  `,
})
export class Dashboard02Block {
  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly kindIcons = KIND_ICONS;
  protected readonly keys = ['online', 'inStore'] as const;
  protected readonly config: ChartConfig = {
    online: { label: 'Online', color: 'var(--chart-1)' },
    inStore: { label: 'In store', color: 'var(--chart-2)' },
  };

  protected readonly data = analyticsResource();

  protected readonly months = computed(() => this.data.value()?.months ?? []);

  protected readonly notifications = computed(
    () => this.data.value()?.notifications ?? [],
  );

  protected readonly unread = computed(
    () => this.notifications().filter((item) => item.unread).length,
  );

  protected readonly x = computed(() =>
    scaleBand(
      this.months().map((row) => row.month),
      [0, WIDTH],
    ),
  );

  protected readonly y = computed(() =>
    scaleLinear(
      [
        0,
        Math.max(
          1,
          ...this.months().map((row) => Math.max(row.online, row.inStore)),
        ),
      ],
      [HEIGHT, 8],
    ),
  );

  protected readonly bar = computed(() => this.x().bandwidth / 2);

  protected readonly centers = computed(() =>
    this.months().map((row) => this.x()(row.month) + this.x().bandwidth / 2),
  );

  protected readonly active = signal<number | null>(null);

  protected readonly current = computed(() => {
    const index = this.active();
    return index === null ? null : (this.months()[index] ?? null);
  });

  protected readonly left = computed(() => {
    const index = this.active();
    return index === null ? 0 : ((this.centers()[index] ?? 0) / WIDTH) * 100;
  });

  protected readonly summary = computed(() => {
    const row = this.current();
    return row
      ? `${row.month}: online $${row.online}, in store $${row.inStore}.`
      : '';
  });

  /**
   * A name's initials, for an avatar without a picture.
   *
   * @param name - A full name.
   * @returns Up to two capital letters.
   */
  protected initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }
}
