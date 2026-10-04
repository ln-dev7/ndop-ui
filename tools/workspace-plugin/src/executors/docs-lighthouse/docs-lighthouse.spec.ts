import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { failures, medianRun, prerenderedRoutes, reportName } from './routes';

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
