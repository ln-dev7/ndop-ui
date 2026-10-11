import { Component, computed, signal } from '@angular/core';
import {
  arcPath,
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendIndicator,
  ChartLegendItem,
  ChartPlot,
  ChartTooltip,
  ChartTooltipBody,
  ChartTooltipIndicator,
  ChartTooltipItem,
  ChartTooltipList,
  ChartTooltipName,
  ChartTooltipValue,
  pieArcs,
} from '@/ui/chart/chart';

/**
 * Visitors by browser, as a donut with the total in its middle. The
 * arrow keys move between browsers, enlarging each slice; a hidden table
 * holds every value.
 */
@Component({
  selector: 'example-chart-pie',
  imports: [
    ChartContainer,
    ChartLegend,
    ChartLegendIndicator,
    ChartLegendItem,
    ChartPlot,
    ChartTooltip,
    ChartTooltipBody,
    ChartTooltipIndicator,
    ChartTooltipItem,
    ChartTooltipList,
    ChartTooltipName,
    ChartTooltipValue,
  ],
  template: `
    <figure
      ndChartContainer
      [config]="config"
      class="aspect-square w-xs max-w-full flex-col items-center gap-2"
    >
      <figcaption id="chart-pie-caption" class="text-sm font-medium">
        Visitors by browser, June 2026
      </figcaption>
      <svg
        ndChartPlot
        viewBox="-125 -125 250 250"
        [xs]="indexes"
        trackPointer="false"
        [(active)]="active"
        aria-labelledby="chart-pie-caption"
        aria-describedby="chart-pie-hint"
      >
        @for (slice of slices; track slice.index) {
          <path
            [attr.d]="arcPath(slice, 60, active() === slice.index ? 110 : 100)"
            [attr.fill]="'var(--color-' + data[slice.index]?.browser + ')'"
            class="stroke-background"
            stroke-width="2"
            (pointerenter)="active.set(slice.index)"
          />
        }
        <text text-anchor="middle" class="fill-foreground text-3xl font-bold">
          {{ total }}
        </text>
        <text y="24" text-anchor="middle" class="fill-muted-foreground">
          Visitors
        </text>
      </svg>
      @if (current(); as row) {
        <div ndChartTooltip class="left-1/2 top-8">
          <div ndChartTooltipList>
            <div ndChartTooltipItem>
              <span
                ndChartTooltipIndicator
                [color]="'var(--color-' + row.browser + ')'"
              ></span>
              <div ndChartTooltipBody>
                <span ndChartTooltipName>{{ config[row.browser]?.label }}</span>
                <span ndChartTooltipValue>{{ row.visitors }}</span>
              </div>
            </div>
          </div>
        </div>
      }
      <ul ndChartLegend class="flex-wrap">
        @for (row of data; track row.browser) {
          <li ndChartLegendItem>
            <span
              ndChartLegendIndicator
              [color]="'var(--color-' + row.browser + ')'"
            ></span>
            {{ config[row.browser]?.label }}
          </li>
        }
      </ul>
      <p id="chart-pie-hint" class="sr-only">
        Use the arrow keys to read each browser.
      </p>
      <p class="sr-only" aria-live="polite">{{ summary() }}</p>
      <table class="sr-only">
        <caption>
          Visitors by browser
        </caption>
        <thead>
          <tr>
            <th scope="col">Browser</th>
            <th scope="col">Visitors</th>
          </tr>
        </thead>
        <tbody>
          @for (row of data; track row.browser) {
            <tr>
              <th scope="row">{{ config[row.browser]?.label }}</th>
              <td>{{ row.visitors }}</td>
            </tr>
          }
        </tbody>
      </table>
    </figure>
  `,
})
export class ChartPieExample {
  protected readonly config: ChartConfig = {
    chrome: { label: 'Chrome', color: 'var(--chart-1)' },
    safari: { label: 'Safari', color: 'var(--chart-2)' },
    firefox: { label: 'Firefox', color: 'var(--chart-3)' },
    edge: { label: 'Edge', color: 'var(--chart-4)' },
    other: { label: 'Other', color: 'var(--chart-5)' },
  };
  protected readonly data = [
    { browser: 'chrome', visitors: 275 },
    { browser: 'safari', visitors: 200 },
    { browser: 'firefox', visitors: 187 },
    { browser: 'edge', visitors: 173 },
    { browser: 'other', visitors: 90 },
  ];
  protected readonly indexes = this.data.map((_, index) => index);
  protected readonly active = signal<number | null>(null);

  protected readonly current = computed(() => {
    const index = this.active();
    return index === null ? null : this.data[index];
  });

  protected readonly summary = computed(() => {
    const row = this.current();
    return row
      ? `${this.config[row.browser]?.label}: ${row.visitors} visitors.`
      : '';
  });

  protected readonly arcPath = arcPath;
  protected readonly slices = pieArcs(
    this.data.map((row) => row.visitors),
    { padAngle: 0.02 },
  );
  protected readonly total = this.data.reduce(
    (sum, row) => sum + row.visitors,
    0,
  );
}
