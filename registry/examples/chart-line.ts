import { Component, computed, signal } from '@angular/core';
import {
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
  linePath,
  scaleLinear,
} from '@/ui/chart/chart';

/** The plot's size, in viewBox units. */
const WIDTH = 500;
const HEIGHT = 250;
/** Room under the plot for the month labels. */
const AXIS = 24;

/**
 * Desktop and mobile visitors by month, as two smooth lines. The arrow
 * keys move between months, showing each one's values; a hidden table
 * holds every value.
 */
@Component({
  selector: 'example-chart-line',
  imports: [
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
  ],
  template: `
    <figure
      ndChartContainer
      [config]="config"
      class="w-lg max-w-full flex-col gap-2"
    >
      <figcaption id="chart-line-caption" class="text-sm font-medium">
        Visitors, January to June 2026
      </figcaption>
      <svg
        ndChartPlot
        [attr.viewBox]="'0 0 ' + width + ' ' + height"
        [xs]="xs"
        [(active)]="active"
        aria-labelledby="chart-line-caption"
        aria-describedby="chart-line-hint"
      >
        <g ndChartGrid>
          @for (tick of y.ticks(4); track tick) {
            <line
              x1="0"
              [attr.x2]="width"
              [attr.y1]="y(tick)"
              [attr.y2]="y(tick)"
            />
          }
        </g>
        @if (active() !== null) {
          <line
            ndChartCursor
            [attr.x1]="(left() * width) / 100"
            [attr.x2]="(left() * width) / 100"
            y1="0"
            [attr.y2]="height - axis"
          />
        }
        @for (key of keys; track key) {
          <path
            [attr.d]="lines()[key]"
            fill="none"
            [attr.stroke]="'var(--color-' + key + ')'"
            stroke-width="2"
          />
          @if (current(); as row) {
            <circle
              [attr.cx]="(left() * width) / 100"
              [attr.cy]="y(row[key])"
              r="4"
              [attr.fill]="'var(--color-' + key + ')'"
            />
          }
        }
        <g ndChartAxis text-anchor="middle">
          @for (row of data; track row.month; let i = $index) {
            <text [attr.x]="xs[i]" [attr.y]="height - 6">
              {{ row.month.slice(0, 3) }}
            </text>
          }
        </g>
      </svg>
      @if (current(); as row) {
        <div ndChartTooltip [style.left.%]="left()">
          <div ndChartTooltipLabel>{{ row.month }}</div>
          <div ndChartTooltipList>
            @for (key of keys; track key) {
              <div ndChartTooltipItem>
                <span
                  ndChartTooltipIndicator
                  indicator="line"
                  [color]="'var(--color-' + key + ')'"
                ></span>
                <div ndChartTooltipBody>
                  <span ndChartTooltipName>{{ config[key]?.label }}</span>
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
      <p id="chart-line-hint" class="sr-only">
        Use the arrow keys to read each month.
      </p>
      <p class="sr-only" aria-live="polite">{{ summary() }}</p>
      <table class="sr-only">
        <caption>
          Visitors by month
        </caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Desktop</th>
            <th scope="col">Mobile</th>
          </tr>
        </thead>
        <tbody>
          @for (row of data; track row.month) {
            <tr>
              <th scope="row">{{ row.month }}</th>
              <td>{{ row.desktop }}</td>
              <td>{{ row.mobile }}</td>
            </tr>
          }
        </tbody>
      </table>
    </figure>
  `,
})
export class ChartLineExample {
  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly axis = AXIS;
  protected readonly keys = ['desktop', 'mobile'] as const;
  protected readonly config: ChartConfig = {
    desktop: { label: 'Desktop', color: 'var(--chart-1)' },
    mobile: { label: 'Mobile', color: 'var(--chart-2)' },
  };
  protected readonly data = [
    { month: 'January', desktop: 186, mobile: 80 },
    { month: 'February', desktop: 305, mobile: 200 },
    { month: 'March', desktop: 237, mobile: 120 },
    { month: 'April', desktop: 73, mobile: 190 },
    { month: 'May', desktop: 209, mobile: 130 },
    { month: 'June', desktop: 214, mobile: 140 },
  ];
  protected readonly xs = this.data.map(
    (_, index) => (index / (this.data.length - 1)) * WIDTH,
  );
  protected readonly active = signal<number | null>(null);

  protected readonly current = computed(() => {
    const index = this.active();
    return index === null ? null : this.data[index];
  });

  protected readonly left = computed(() => {
    const index = this.active();
    return index === null ? 0 : ((this.xs[index] ?? 0) / WIDTH) * 100;
  });

  protected readonly summary = computed(() => {
    const row = this.current();
    return row
      ? `${row.month}: desktop ${row.desktop}, mobile ${row.mobile}.`
      : '';
  });

  protected readonly y = scaleLinear(
    [0, Math.max(...this.data.map((row) => Math.max(row.desktop, row.mobile)))],
    [HEIGHT - AXIS, 8],
  );

  protected readonly lines = computed(() => ({
    desktop: linePath(
      this.data.map((row, index) => ({
        x: this.xs[index] ?? 0,
        y: this.y(row.desktop),
      })),
      'monotone',
    ),
    mobile: linePath(
      this.data.map((row, index) => ({
        x: this.xs[index] ?? 0,
        y: this.y(row.mobile),
      })),
      'monotone',
    ),
  }));
}
