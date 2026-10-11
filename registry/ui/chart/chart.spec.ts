import { Component, signal } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import {
  arcPath,
  areaPath,
  linePath,
  niceTicks,
  pieArcs,
  scaleBand,
  scaleLinear,
  scaleTime,
  stack,
} from '@/lib/chart';
import {
  missingShadcnClasses,
  registrySource,
  shadcnClassStrings,
} from '../../testing/shadcn-parity';
import { ChartContainer, ChartPlot, ChartTooltipIndicator } from './chart';

/**
 * shadcn's classes as Ndop writes them. Its container styles Recharts'
 * elements by class name; Ndop's SVG is the user's, so the grid, axis and
 * cursor parts carry those styles instead. Its legend's top or bottom
 * padding is the legend's own `pt-3`.
 *
 * @param classes - A shadcn class string.
 * @returns The Ndop string, or `null` when dropped.
 */
function ndopClasses(classes: string): string | null {
  if (classes.startsWith('flex aspect-video justify-center text-xs')) {
    return 'flex aspect-video justify-center text-xs';
  }
  if (classes === 'pb-3') {
    return null;
  }
  return classes;
}

describe('Chart', () => {
  it('matches shadcn new-york-v4 classes, except its documented changes', () => {
    const exceptions = Object.fromEntries(
      shadcnClassStrings('chart').map((classes) => [
        classes,
        ndopClasses(classes),
      ]),
    );
    expect(
      missingShadcnClasses(
        'chart',
        registrySource('ui/chart/chart.ts'),
        exceptions,
      ),
    ).toEqual([]);
  });

  it('sets a color variable per series', async () => {
    @Component({
      imports: [ChartContainer],
      template: `<figure ndChartContainer [config]="config" data-testid="chart">
        <figcaption>Visitors</figcaption>
      </figure>`,
    })
    class Host {
      readonly config = {
        desktop: { label: 'Desktop', color: 'var(--chart-1)' },
        mobile: { label: 'Mobile', theme: { light: '#000', dark: '#fff' } },
      };
    }
    await render(Host);
    const chart = screen.getByTestId('chart');
    expect(chart.style.getPropertyValue('--color-desktop')).toBe(
      'var(--chart-1)',
    );
  });

  it('moves the active point with the keyboard', async () => {
    @Component({
      imports: [ChartPlot, ChartTooltipIndicator],
      template: `<svg
        ndChartPlot
        aria-label="Visitors"
        [xs]="[10, 20, 30]"
        [(active)]="active"
      ></svg>`,
    })
    class Host {
      readonly active = signal<number | null>(null);
    }
    const view = await render(Host);
    const plot = screen.getByRole('group', { name: 'Visitors' });
    plot.focus();
    await view.fixture.whenStable();
    expect(view.fixture.componentInstance.active()).toBe(0);
    fireEvent.keyDown(plot, { key: 'End' });
    expect(view.fixture.componentInstance.active()).toBe(2);
    fireEvent.keyDown(plot, { key: 'ArrowLeft' });
    expect(view.fixture.componentInstance.active()).toBe(1);
    fireEvent.keyDown(plot, { key: 'Escape' });
    expect(view.fixture.componentInstance.active()).toBeNull();
  });
});

describe('chart lib', () => {
  it('rounds scales to nice ticks', () => {
    expect(niceTicks(0, 305)).toEqual([0, 50, 100, 150, 200, 250, 300]);
    const y = scaleLinear([0, 305], [200, 0]);
    expect(y.domain).toEqual([0, 350]);
    expect(y(175)).toBe(100);
    expect(y.ticks(4)).toEqual([0, 100, 200, 300]);
  });

  it('splits a band scale with padding', () => {
    const x = scaleBand(['a', 'b'], [0, 100], { inner: 0, outer: 0 });
    expect(x('b')).toBe(50);
    expect(x.bandwidth).toBe(50);
    expect(Number.isNaN(x('c'))).toBe(true);
  });

  it('ticks a time scale on month starts', () => {
    const x = scaleTime(
      [new Date(2026, 0, 1), new Date(2026, 5, 30)],
      [0, 600],
    );
    expect(x.ticks(6).map((date) => date.getMonth())).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
  });

  it('draws lines, areas, arcs and stacks', () => {
    const points = [
      { x: 0, y: 10 },
      { x: 10, y: 0 },
    ];
    expect(linePath(points)).toBe('M0,10L10,0');
    expect(areaPath(points, 20)).toBe('M0,10L10,0L10,20L0,20Z');
    expect(linePath([])).toBe('');
    expect(arcPath({ startAngle: 0, endAngle: Math.PI }, 0, 10)).toBe(
      'M0,-10A10,10,0,0,1,0,10L0,0Z',
    );
    const arcs = pieArcs([1, 3]);
    expect(arcs[1]?.endAngle).toBeCloseTo(Math.PI * 2);
    expect(
      stack([
        [1, 2],
        [3, 4],
      ]),
    ).toEqual([
      [
        [0, 1],
        [0, 2],
      ],
      [
        [1, 4],
        [2, 6],
      ],
    ]);
  });
});
