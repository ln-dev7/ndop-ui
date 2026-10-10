import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  cpuMultiplier,
  failures,
  median,
  medianRun,
  prerenderedRoutes,
  REFERENCE_BENCHMARK,
  reportName,
  shardRoutes,
  warnings,
  type RouteScores,
} from './routes';

describe('prerenderedRoutes', () => {
  it('lists every folder with an index.html', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'lighthouse-routes-'));
    await mkdir(join(dir, 'docs/components/dialog'), { recursive: true });
    await mkdir(join(dir, 'assets'));
    await writeFile(join(dir, 'index.html'), '');
    await writeFile(join(dir, 'docs/components/dialog/index.html'), '');
    await writeFile(join(dir, 'docs/components/dialog.md'), '');
    await writeFile(join(dir, 'assets/app.js'), '');
    expect(await prerenderedRoutes(dir)).toEqual([
      '/',
      '/docs/components/dialog',
    ]);
    await rm(dir, { recursive: true, force: true });
  });
});

describe('shardRoutes', () => {
  const routes = ['/', '/a', '/b', '/c', '/d'];

  it('deals the routes out in turn', () => {
    expect(shardRoutes(routes, '1/2')).toEqual(['/', '/b', '/d']);
    expect(shardRoutes(routes, '2/2')).toEqual(['/a', '/c']);
  });

  it('covers every route exactly once across the shards', () => {
    const shards = ['1/3', '2/3', '3/3'].flatMap((shard) =>
      shardRoutes(routes, shard),
    );
    expect(shards.sort()).toEqual(routes);
  });

  it('rejects malformed shards', () => {
    expect(() => shardRoutes(routes, '0/3')).toThrow('1/3');
    expect(() => shardRoutes(routes, '4/3')).toThrow();
    expect(() => shardRoutes(routes, 'two')).toThrow();
  });
});

describe('failures', () => {
  it('lists every score under the minimum', () => {
    expect(
      failures(
        [
          { route: '/', scores: { Performance: 94, Accessibility: 100 } },
          { route: '/docs', scores: { Performance: 95, SEO: 90 } },
        ],
        95,
      ),
    ).toEqual(['/ Performance 94', '/docs SEO 90']);
  });

  it('fails performance only under its floor', () => {
    const results: RouteScores[] = [
      { route: '/', scores: { Performance: 94, Accessibility: 94 } },
      { route: '/docs', scores: { Performance: 89, SEO: 100 } },
    ];
    expect(failures(results, 95, 90)).toEqual([
      '/ Accessibility 94',
      '/docs Performance 89',
    ]);
  });
});

describe('warnings', () => {
  it('lists performance between the floor and the target', () => {
    expect(
      warnings(
        [
          { route: '/', scores: { Performance: 94 } },
          { route: '/a', scores: { Performance: 90 } },
          { route: '/b', scores: { Performance: 95 } },
          { route: '/c', scores: { Performance: 89 } },
        ],
        95,
        90,
      ),
    ).toEqual(['/ Performance 94', '/a Performance 90']);
  });
});

describe('reportName', () => {
  it('names a report after its route', () => {
    expect(reportName('/')).toBe('index.html');
    expect(reportName('/docs/components/dialog')).toBe(
      'docs-components-dialog.html',
    );
  });
});

describe('medianRun', () => {
  it('picks the run with the median performance score', () => {
    expect(medianRun([0.9, 0.7, 0.95])).toBe(0);
    expect(medianRun([0.8])).toBe(0);
    expect(medianRun([0.6, 0.9])).toBe(0);
  });
});

describe('cpuMultiplier', () => {
  it('keeps 4x at the reference benchmark and scales with the host', () => {
    expect(cpuMultiplier(REFERENCE_BENCHMARK)).toBe(4);
    expect(cpuMultiplier(2348)).toBe(2.9);
    expect(cpuMultiplier(3860)).toBe(4.8);
  });

  it('stays between 1x and 8x', () => {
    expect(cpuMultiplier(100)).toBe(1);
    expect(cpuMultiplier(20_000)).toBe(8);
  });
});

describe('median', () => {
  it('takes the middle value, or the lower middle one', () => {
    expect(median([3300, 2900, 3100])).toBe(3100);
    expect(median([4, 1, 3, 2])).toBe(2);
  });
});
