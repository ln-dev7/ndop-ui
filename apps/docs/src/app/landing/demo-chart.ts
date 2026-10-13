import { Component, computed, input, signal } from '@angular/core';
import {
  ChartAxis,
  ChartContainer,
  ChartCursor,
  ChartGrid,
  ChartLabel,
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

/** One bar of a {@link DemoChart}. */
export interface DemoChartPoint {
  /** The day, written out. */
  day: string;
  /** Its value. */
  value: number;
}

/** The plot's size, in viewBox units. */
const WIDTH = 300;
const HEIGHT = 120;

/**
 * A small bar chart for the landing page's hero demo (ADR-0026), built
 * from the registry's chart item like its examples: one tab stop whose
 * arrow keys move between days, a tooltip and a polite live region for
 * the active one, and a hidden table of every value.
 */
@Component({
  selector: 'docs-demo-chart',
  imports: [
    ChartAxis,
    ChartContainer,
    ChartCursor,
    ChartGrid,
    ChartLabel,
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
  host: { class: 'block' },
  template: `
    <figure
      ndChartContainer
      [config]="config()"
      class="aspect-auto flex-col gap-1.5"
    >
      <figcaption [id]="id() + '-caption'" class="sr-only">
        {{ label() }} by day, this week
      </figcaption>
      <svg
        ndChartPlot
        [attr.viewBox]="'0 0 ' + width + ' ' + height"
        [xs]="centers()"
        [(active)]="active"
        [attr.aria-labelledby]="id() + '-caption'"
        [attr.aria-describedby]="id() + '-hint'"
      >
        <g ndChartGrid>
          @for (tick of ticks(); track tick) {
            <line
              x1="0"
              [attr.x2]="width"
              [attr.y1]="y()(tick)"
              [attr.y2]="y()(tick)"
            />
          }
        </g>
        @if (current(); as point) {
          <rect
            ndChartCursor
            kind="band"
            [attr.x]="x()(point.day) - x().step * 0.12"
            y="0"
            [attr.width]="x().bandwidth + x().step * 0.24"
            [attr.height]="height"
            rx="4"
          />
        }
        @for (point of data(); track point.day) {
          <rect
            [attr.x]="x()(point.day)"
            [attr.y]="y()(point.value)"
            [attr.width]="x().bandwidth"
            [attr.height]="y()(0) - y()(point.value)"
            rx="3"
            fill="var(--color-value)"
          />
        }
      </svg>
      <div ndChartAxis>
        @for (point of data(); track point.day; let i = $index) {
          <span
            ndChartLabel
            [style.left.%]="((centers()[i] ?? 0) / width) * 100"
          >
            {{ point.day.slice(0, 3) }}
          </span>
        }
      </div>
      @if (current(); as point) {
        <div ndChartTooltip [style.left.%]="left()">
          <div ndChartTooltipLabel>{{ point.day }}</div>
          <div ndChartTooltipList>
            <div ndChartTooltipItem>
              <span ndChartTooltipIndicator color="var(--color-value)"></span>
              <div ndChartTooltipBody>
                <span ndChartTooltipName>{{ label() }}</span>
                <span ndChartTooltipValue>{{ point.value }}</span>
              </div>
            </div>
          </div>
        </div>
      }
      <p [id]="id() + '-hint'" class="sr-only">
        Use the arrow keys to read each day.
      </p>
      <p class="sr-only" aria-live="polite">{{ summary() }}</p>
      <table class="sr-only">
        <caption>
          {{
            label()
          }}
          by day
        </caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">{{ label() }}</th>
          </tr>
        </thead>
        <tbody>
          @for (point of data(); track point.day) {
            <tr>
              <th scope="row">{{ point.day }}</th>
              <td>{{ point.value }}</td>
            </tr>
          }
        </tbody>
      </table>
    </figure>
  `,
})
export class DemoChart {
  /** A prefix for the chart's element ids, unique on the page. */
  readonly id = input.required<string>();
  /** What the values count, such as "Visitors". */
  readonly label = input.required<string>();
  /** The bars, in order. */
  readonly data = input.required<readonly DemoChartPoint[]>();

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;

  protected readonly config = computed<ChartConfig>(() => ({
    value: { label: this.label(), color: 'var(--chart-1)' },
  }));

  protected readonly x = computed(() =>
    scaleBand(
      this.data().map((point) => point.day),
      [0, WIDTH],
      { inner: 0.3, outer: 0.1 },
    ),
  );
  protected readonly y = computed(() =>
    scaleLinear(
      [0, Math.max(...this.data().map((point) => point.value))],
      [HEIGHT, 4],
    ),
  );
  protected readonly ticks = computed(() => this.y().ticks(3));
  protected readonly centers = computed(() =>
    this.data().map((point) => this.x()(point.day) + this.x().bandwidth / 2),
  );

  protected readonly active = signal<number | null>(null);

  protected readonly current = computed(() => {
    const index = this.active();
    return index === null ? null : this.data()[index];
  });

  protected readonly left = computed(() => {
    const index = this.active();
    return index === null ? 0 : ((this.centers()[index] ?? 0) / WIDTH) * 100;
  });

  protected readonly summary = computed(() => {
    const point = this.current();
    return point ? `${point.day}: ${point.value}.` : '';
  });
}
