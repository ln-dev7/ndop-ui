import { expect, test, type Page } from '@playwright/test';

async function style(page: Page, testId: string, property: string) {
  return page
    .getByTestId(testId)
    .evaluate(
      (element, name) => getComputedStyle(element).getPropertyValue(name),
      property,
    );
}

test.describe('token mechanics (ADR-0006)', () => {
  test('system mode follows the OS color scheme without script', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/tokens');
    const light = await style(page, 'surface', 'background-color');

    await page.emulateMedia({ colorScheme: 'dark' });
    const dark = await style(page, 'surface', 'background-color');

    expect(dark).not.toBe(light);
  });

  test('the dark class gives the same colors as a dark OS preference', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/tokens');
    const systemDark = await style(page, 'surface', 'background-color');

    await page.emulateMedia({ colorScheme: 'light' });
    await page.evaluate(() => {
      document.documentElement.removeAttribute('data-ndop-theme');
      document.documentElement.classList.add('dark');
    });
    expect(await style(page, 'surface', 'background-color')).toBe(systemDark);
  });

  test('density rescales spacing utilities for a subtree', async ({ page }) => {
    await page.goto('/tokens');
    expect(await style(page, 'density-default', 'padding-top')).toBe('16px');
    expect(await style(page, 'density-compact', 'padding-top')).toBe('14.4px');
    expect(await style(page, 'density-comfortable', 'padding-top')).toBe(
      '17.6px',
    );
  });

  test('reduced motion zeroes the duration tokens', async ({ page }) => {
    await page.goto('/tokens');
    expect(await style(page, 'motion', 'transition-duration')).toBe('0.2s');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await style(page, 'motion', 'transition-duration')).toBe('0s');
  });
});
