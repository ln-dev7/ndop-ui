import type { Page } from '@playwright/test';

/**
 * Opens a page and waits until Angular has hydrated it and settled, so
 * clicks reach the app rather than the prerendered markup. The docs mark
 * `<html>` with `data-hydrated` then (`app.config.ts`), since production
 * builds log nothing.
 *
 * @param page - A Playwright page.
 * @param url - Route to open.
 */
export async function open(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
}
