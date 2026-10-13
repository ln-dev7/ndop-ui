import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { workspaceRoot } from '@nx/devkit';
import { expect, test, type Page } from '@playwright/test';
import { gotoHydrated } from '../navigation';

/** The registry's items. */
const ITEMS = (
  JSON.parse(
    readFileSync(join(workspaceRoot, 'registry/registry.json'), 'utf-8'),
  ) as { items: { name: string; type: string }[] }
).items;

/** Every example and block in the registry, as harness routes. */
const ROUTES = ITEMS.flatMap((item) =>
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

/**
 * Every registry theme's sheet (ADR-0023, amendment 1), the default theme
 * included. Examples and blocks stay in the default theme.
 */
const THEME_SHEETS = ITEMS.filter((item) => item.type === 'registry:theme').map(
  (item) => ({ name: item.name, path: `/themes/${item.name}` }),
);

/** The three looks every example is checked in (ADR-0021). */
const MODES = ['light', 'dark', 'rtl'] as const;

/** A theme sheet's looks: its two token sets, without RTL. */
const THEME_MODES = ['light', 'dark'] as const;

/**
 * Opens a harness route as the visual tests see it: in a color scheme,
 * with motion reduced and the clock frozen, from the home page.
 *
 * @param page - A Playwright page.
 * @param path - The route.
 * @param mode - The look.
 */
async function open(
  page: Page,
  path: string,
  mode: (typeof MODES)[number],
): Promise<void> {
  await page.emulateMedia({
    colorScheme: mode === 'dark' ? 'dark' : 'light',
    reducedMotion: 'reduce',
  });
  await page.clock.setFixedTime(TODAY);
  // The server renders with the real date, so the route is opened from the
  // home page instead: rendered in the browser alone, it sees only the
  // frozen one.
  await gotoHydrated(page, '/');
  await page.locator(`a[href="${path}"]`).click();
  await page.waitForURL(`**${path}`);
  // The pointer stays where the link was, over the page.
  await page.mouse.move(0, 0);
}

for (const sheet of THEME_SHEETS) {
  for (const mode of THEME_MODES) {
    test(`theme-sheet ${sheet.name} in ${mode}`, async ({ page }) => {
      await open(page, sheet.path, mode);
      await expect(page.locator('main h1')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`theme-${sheet.name}-${mode}.png`, {
        fullPage: true,
      });
    });
  }
}

for (const route of ROUTES) {
  for (const mode of MODES) {
    test(`${route.name} in ${mode}`, async ({ page }) => {
      await open(page, route.path, mode);
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
