import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { workspaceRoot } from '@nx/devkit';
import { expect, test } from '@playwright/test';
import { gotoHydrated } from './navigation';

/** Every block in the registry. */
const BLOCKS = (
  JSON.parse(
    readFileSync(join(workspaceRoot, 'registry/registry.json'), 'utf-8'),
  ) as { items: { name: string; type: string }[] }
).items
  .filter((item) => item.type === 'registry:block')
  .map((item) => item.name);

/** The widths every block is checked at (ADR-0022). */
const WIDTHS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'desktop', width: 1280, height: 800 },
] as const;

for (const block of BLOCKS) {
  for (const size of WIDTHS) {
    test(`${block} passes axe on ${size.name}, without scrolling sideways`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await gotoHydrated(page, `/blocks/${block}`);
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
      const axe = await new AxeBuilder({ page }).analyze();
      expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
}
