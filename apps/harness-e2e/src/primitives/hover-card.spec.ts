import { expect, test } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

keyboardContract('hover-card', {
  Tab: async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari skips links on Tab');
    await gotoHydrated(page, '/primitives/hover-card');
    await page.getByRole('heading', { name: 'Hover Card' }).click();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: '@ada' })).toBeFocused();
    await expect(page.getByTestId('card')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('card')).toBeHidden();
  },
  Escape: async ({ page }) => {
    await gotoHydrated(page, '/primitives/hover-card');
    const link = page.getByRole('link', { name: '@ada' });
    await link.hover();
    await expect(page.getByTestId('card')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('card')).toBeHidden();
  },
});

test.describe('Hover Card', () => {
  test('stays open while the pointer moves onto it', async ({ page }) => {
    await gotoHydrated(page, '/primitives/hover-card');
    await page.getByRole('link', { name: '@ada' }).hover();
    const card = page.getByTestId('card');
    await expect(card).toBeVisible();
    await card.hover();
    await page.waitForTimeout(300);
    await expect(card).toBeVisible();
    await page.getByRole('heading', { name: 'Hover Card' }).hover();
    await expect(card).toBeHidden();
  });

  test('passes axe while open', async ({ page }) => {
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    await gotoHydrated(page, '/primitives/hover-card');
    await page.getByRole('link', { name: '@ada' }).hover();
    await expect(page.getByTestId('card')).toBeVisible();
    // `region` (best practice, not WCAG): overlays sit at the end of <body>.
    const result = await new AxeBuilder({ page })
      .disableRules(['region'])
      .analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
