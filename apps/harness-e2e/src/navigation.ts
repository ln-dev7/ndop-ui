import type { Page } from '@playwright/test';

/**
 * Navigates and waits until Angular has hydrated the page. Events fired
 * before hydration hit server-rendered markup with no listeners attached, so
 * every interaction test starts here.
 *
 * @param page - A Playwright page.
 * @param url - Path to open.
 */
export async function gotoHydrated(page: Page, url: string): Promise<void> {
  // Angular logs this in dev mode once hydration completes.
  const hydrated = page.waitForEvent('console', (message) =>
    message.text().startsWith('Angular hydrated'),
  );
  await page.goto(url);
  await hydrated;
}
