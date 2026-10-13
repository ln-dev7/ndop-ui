import { Component, computed, signal } from '@angular/core';
import {
  areaPath,
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
  scaleLinear,
  stack,
} from '@/ui/chart/chart';

/** The plot's size, in viewBox units. */
const WIDTH = 500;
const HEIGHT = 225;

/**
 * Desktop and mobile visitors by month, as stacked areas: mobile sits on
 * top of desktop. The arrow keys move between months; a hidden table holds
 * every value.
 */
@Component({
  selector: 'example-chart-area',
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
      <figcaption id="chart-area-caption" class="text-sm font-medium">
        Visitors, January to June 2026
      </figcaption>
      <svg
        ndChartPlot
        [attr.viewBox]="'0 0 ' + width + ' ' + height"
        [xs]="xs"
        [(active)]="active"
        aria-labelledby="chart-area-caption"
        aria-describedby="chart-area-hint"
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
            [attr.y2]="height"
          />
        }
      </svg>
      <div ndChartAxis>
        @for (
          row of data;
          track row.month;
          let i = $index, first = $first, last = $last
        ) {
          <span
            ndChartLabel
            [style.left.%]="((xs[i] ?? 0) / width) * 100"
            [align]="first ? 'left' : last ? 'right' : 'center'"
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
                  indicator="dashed"
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
      <p id="chart-area-hint" class="sr-only">
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
export class ChartAreaExample {
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

  /** Mobile stacked on desktop: each value's bottom and top. */
  protected readonly stacked = stack([
    this.data.map((row) => row.desktop),
    this.data.map((row) => row.mobile),
  ]);

  protected readonly y = scaleLinear(
    [0, Math.max(...(this.stacked[1] ?? []).map(([, top]) => top))],
    [HEIGHT, 8],
  );

  protected readonly areas = computed(() => {
    const points = (series: number, edge: 0 | 1) =>
      (this.stacked[series] ?? []).map((pair, index) => ({
        x: this.xs[index] ?? 0,
        y: this.y(pair[edge]),
      }));
    return {
      desktop: areaPath(points(0, 1), this.y(0), 'monotone'),
      mobile: areaPath(points(1, 1), points(1, 0), 'monotone'),
    };
  });
}
