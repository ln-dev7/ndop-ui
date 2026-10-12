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

/**
 * The date the browser sees. Calendars and date pickers start from today,
 * so a real clock would change their screenshots daily.
 */
const TODAY = new Date('2026-10-12T12:00:00Z');

/** The three looks every example is checked in (ADR-0021). */
const MODES = ['light', 'dark', 'rtl'] as const;

for (const route of ROUTES) {
  for (const mode of MODES) {
    test(`${route.name} in ${mode}`, async ({ page }) => {
      await page.emulateMedia({
        colorScheme: mode === 'dark' ? 'dark' : 'light',
        reducedMotion: 'reduce',
      });
      await page.clock.setFixedTime(TODAY);
      // The server renders with the real date, so the example is opened
      // from the home page instead: rendered in the browser alone, it sees
      // only the frozen one.
      await gotoHydrated(page, '/');
      await page.locator(`a[href="${route.path}"]`).click();
      await page.waitForURL(`**${route.path}`);
      // The pointer stays where the link was, over the example.
      await page.mouse.move(0, 0);
      await expect(
        page.locator(
          route.path.startsWith('/examples/')
            ? 'main > :nth-child(2)'
            : 'main h1',
        ),
      ).toBeVisible();
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
