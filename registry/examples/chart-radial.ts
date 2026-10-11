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
} from '@/ui/chart/chart';

/**
 * Visitors by browser, as bars around rings: each bar's length is its
 * share of the most visited browser's. The arrow keys move between
 * browsers; a hidden table holds every value.
 */
@Component({
  selector: 'example-chart-radial',
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
      <figcaption id="chart-radial-caption" class="text-sm font-medium">
        Visitors by browser, June 2026
      </figcaption>
      <svg
        ndChartPlot
        viewBox="-125 -125 250 250"
        [xs]="indexes"
        trackPointer="false"
        [(active)]="active"
        aria-labelledby="chart-radial-caption"
        aria-describedby="chart-radial-hint"
      >
        @for (row of data; track row.browser; let i = $index) {
          <path
            [attr.d]="
              arcPath({ startAngle: 0, endAngle: 2 * PI }, ring(i) - 8, ring(i))
            "
            class="fill-muted"
          />
          <path
            [attr.d]="
              arcPath(
                { startAngle: 0, endAngle: angle(row.visitors) },
                ring(i) - 8,
                ring(i)
              )
            "
            [attr.fill]="'var(--color-' + row.browser + ')'"
            [attr.opacity]="active() === null || active() === i ? 1 : 0.4"
            (pointerenter)="active.set(i)"
          />
        }
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
      <p id="chart-radial-hint" class="sr-only">
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
export class ChartRadialExample {
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
  protected readonly PI = Math.PI;
  private readonly most = Math.max(...this.data.map((row) => row.visitors));

  /**
   * A browser's ring, from the outside in.
   *
   * @param index - The browser's index.
   * @returns The ring's outer radius.
   */
  protected ring(index: number): number {
    return 110 - index * 16;
  }

  /**
   * How far a value's bar goes around its ring.
   *
   * @param visitors - The value.
   * @returns The bar's end angle, in radians.
   */
  protected angle(visitors: number): number {
    return (visitors / this.most) * Math.PI * 1.5;
  }
}
