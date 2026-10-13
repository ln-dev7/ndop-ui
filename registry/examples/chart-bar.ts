import { Component, computed, signal } from '@angular/core';
import {
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
  scaleBand,
  scaleLinear,
  type ChartConfig,
} from '@/ui/chart/chart';

/** The plot's size, in viewBox units. */
const WIDTH = 500;
const HEIGHT = 225;

/**
 * Desktop and mobile visitors by month, as grouped bars. The chart is one
 * tab stop: the arrow keys move between months, showing each one's
 * tooltip and announcing its values; a hidden table holds every value.
 */
@Component({
  selector: 'example-chart-bar',
  imports: [
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
  ],
  template: `
    <figure
      ndChartContainer
      [config]="config"
      class="w-lg max-w-full flex-col gap-2"
    >
      <figcaption id="chart-bar-caption" class="text-sm font-medium">
        Visitors, January to June 2026
      </figcaption>
      <svg
        ndChartPlot
        [attr.viewBox]="'0 0 ' + width + ' ' + height"
        [xs]="centers"
        [(active)]="active"
        aria-labelledby="chart-bar-caption"
        aria-describedby="chart-bar-hint"
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
        @if (current(); as row) {
          <rect
            ndChartCursor
            kind="band"
            [attr.x]="x(row.month) - x.step * 0.1"
            y="0"
            [attr.width]="x.bandwidth + x.step * 0.2"
            [attr.height]="height"
          />
        }
        @for (row of data; track row.month) {
          <rect
            [attr.x]="x(row.month)"
            [attr.y]="y(row.desktop)"
            [attr.width]="bar"
            [attr.height]="y(0) - y(row.desktop)"
            rx="4"
            fill="var(--color-desktop)"
          />
          <rect
            [attr.x]="x(row.month) + bar"
            [attr.y]="y(row.mobile)"
            [attr.width]="bar"
            [attr.height]="y(0) - y(row.mobile)"
            rx="4"
            fill="var(--color-mobile)"
          />
        }
      </svg>
      <div ndChartAxis>
        @for (row of data; track row.month; let i = $index) {
          <span ndChartLabel [style.left.%]="((centers[i] ?? 0) / width) * 100">
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
      <p id="chart-bar-hint" class="sr-only">
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
export class ChartBarExample {
  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
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

  protected readonly x = scaleBand(
    this.data.map((row) => row.month),
    [0, WIDTH],
  );
  protected readonly y = scaleLinear(
    [0, Math.max(...this.data.map((row) => Math.max(row.desktop, row.mobile)))],
    [HEIGHT, 8],
  );
  protected readonly bar = this.x.bandwidth / 2;
  protected readonly centers = this.data.map(
    (row) => this.x(row.month) + this.x.bandwidth / 2,
  );

  protected readonly active = signal<number | null>(null);

  protected readonly current = computed(() => {
    const index = this.active();
    return index === null ? null : this.data[index];
  });

  protected readonly left = computed(() => {
    const index = this.active();
    return index === null ? 0 : ((this.centers[index] ?? 0) / WIDTH) * 100;
  });

  protected readonly summary = computed(() => {
    const row = this.current();
    return row
      ? `${row.month}: desktop ${row.desktop}, mobile ${row.mobile}.`
      : '';
  });
}
