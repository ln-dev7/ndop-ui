import type { Page } from '@playwright/test';

/**
 * Every harness route: the index plus every page it links to. Crawling the
 * index keeps the suite in sync with the demos without importing app code.
 *
 * @param page - A Playwright page.
 * @returns Route paths, starting with `/`.
 */
export async function harnessRoutes(page: Page): Promise<string[]> {
  await page.goto('/');
  const links = await page
    .locator('main a[href^="/"]')
    .evaluateAll((anchors) =>
      anchors.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? ''),
    );
  return ['/', ...new Set(links.filter(Boolean))];
}
