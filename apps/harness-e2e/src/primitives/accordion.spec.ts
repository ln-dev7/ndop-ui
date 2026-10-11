import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

const trigger = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });

async function focusTrigger(page: Page, name: string) {
  await gotoHydrated(page, '/primitives/accordion');
  await trigger(page, name).focus();
}

keyboardContract('accordion', {
  Tab: async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari moves Tab only between fields');
    await gotoHydrated(page, '/primitives/accordion');
    await page.getByRole('heading', { name: 'Accordion', level: 1 }).click();
    await page.keyboard.press('Tab');
    await expect(trigger(page, 'Shipping')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(trigger(page, 'Warranty')).toBeFocused();
  },
  Enter: async ({ page }) => {
    await focusTrigger(page, 'Shipping');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: 'Shipping' })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Ships in two days.')).toBeHidden();
  },
  Space: async ({ page }) => {
    await focusTrigger(page, 'Warranty');
    await page.keyboard.press('Space');
    await expect(trigger(page, 'Warranty')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  },
  ArrowDown: async ({ page }) => {
    await focusTrigger(page, 'Shipping');
    await page.keyboard.press('ArrowDown');
    await expect(trigger(page, 'Warranty')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(trigger(page, 'Shipping')).toBeFocused();
  },
  ArrowUp: async ({ page }) => {
    await focusTrigger(page, 'Shipping');
    await page.keyboard.press('ArrowUp');
    await expect(trigger(page, 'Warranty')).toBeFocused();
  },
  Home: async ({ page }) => {
    await focusTrigger(page, 'Warranty');
    await page.keyboard.press('Home');
    await expect(trigger(page, 'Shipping')).toBeFocused();
  },
  End: async ({ page }) => {
    await focusTrigger(page, 'Shipping');
    await page.keyboard.press('End');
    await expect(trigger(page, 'Warranty')).toBeFocused();
  },
});
