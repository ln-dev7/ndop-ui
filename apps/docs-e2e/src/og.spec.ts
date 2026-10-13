import { expect, test, type Page } from '@playwright/test';
import { open } from './support/open';

/**
 * Checks a page's share card: its `og:image` is an absolute ndop.dev URL
 * whose file the site serves as a 1200 by 630 JPEG.
 *
 * @param page - A Playwright page.
 * @param path - The page to check.
 */
async function expectOgImage(page: Page, path: string): Promise<void> {
  await open(page, path);
  const image = await page
    .locator('meta[property="og:image"]')
    .getAttribute('content');
  expect(image).toMatch(/^https:\/\/ndop\.dev\/og\/.+\.jpg$/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  );
  await expect(page.locator('meta[name="twitter:creator"]')).toHaveAttribute(
    'content',
    '@valerymelou',
  );
  const served = new URL(image ?? '').pathname;
  const response = await page.request.get(served);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('image/jpeg');
  const size = await page.evaluate(async (url) => {
    const bitmap = await createImageBitmap(await (await fetch(url)).blob());
    return [bitmap.width, bitmap.height];
  }, served);
  expect(size).toEqual([1200, 630]);
}

test('the home page has a share image', async ({ page }) => {
  await expectOgImage(page, '/');
});

test('a component page has a share image', async ({ page }) => {
  await expectOgImage(page, '/docs/components/button');
});

test('a guide has a share image', async ({ page }) => {
  await expectOgImage(page, '/docs/getting-started/theming');
});
