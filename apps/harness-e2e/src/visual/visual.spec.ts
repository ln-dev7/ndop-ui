import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { workspaceRoot } from '@nx/devkit';
import { expect, test } from '@playwright/test';
import { gotoHydrated } from '../navigation';

/** Every example and block in the registry, as harness routes. */
const ROUTES = (
  JSON.parse(
    readFileSync(join(workspaceRoot, 'registry/registry.json'), 'utf-8'),
  ) as { items: { name: string; type: string }[] }
).items.flatMap((item) =>
  item.type === 'registry:primitive-usage'
    ? [{ name: item.name, path: `/examples/${item.name}` }]
    : item.type === 'registry:block'
      ? [{ name: item.name, path: `/blocks/${item.name}` }]
      : [],
);

/** The three looks every example is checked in (ADR-0021). */
const MODES = ['light', 'dark', 'rtl'] as const;

for (const route of ROUTES) {
  for (const mode of MODES) {
    test(`${route.name} in ${mode}`, async ({ page }) => {
      await page.emulateMedia({
        colorScheme: mode === 'dark' ? 'dark' : 'light',
        reducedMotion: 'reduce',
      });
      await gotoHydrated(page, route.path);
      if (mode === 'rtl') {
        await page.evaluate(() => {
          document.documentElement.dir = 'rtl';
        });
      }
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`${route.name}-${mode}.png`, {
        fullPage: true,
      });
    });
  }
}
