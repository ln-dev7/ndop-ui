import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

const radio = (page: Page, name: string) =>
  page.getByRole('radio', { name, exact: true });

async function focusPro(page: Page) {
  await gotoHydrated(page, '/primitives/radio-group');
  await radio(page, 'Pro').focus();
}

keyboardContract('radio-group', {
  Tab: async ({ page }) => {
    await gotoHydrated(page, '/primitives/radio-group');
    await page.getByRole('heading', { name: 'Radio Group' }).click();
    await page.keyboard.press('Tab');
    await expect(radio(page, 'Pro')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(radio(page, 's')).toBeFocused();
  },
  Space: async ({ page }) => {
    await focusPro(page);
    await radio(page, 'Free').focus();
    await page.keyboard.press('Space');
    await expect(radio(page, 'Free')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText('Plan: free')).toBeVisible();
  },
  Enter: async ({ page }) => {
    await focusPro(page);
    await radio(page, 'Free').focus();
    await page.keyboard.press('Enter');
    await expect(radio(page, 'Pro')).toHaveAttribute('aria-checked', 'true');
  },
  ArrowDown: async ({ page }) => {
    await focusPro(page);
    await page.keyboard.press('ArrowDown');
    await expect(radio(page, 'Enterprise')).toBeFocused();
    await expect(radio(page, 'Enterprise')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.keyboard.press('ArrowDown');
    await expect(radio(page, 'Free')).toBeFocused();
  },
  ArrowRight: async ({ page }) => {
    await focusPro(page);
    await page.keyboard.press('ArrowRight');
    await expect(radio(page, 'Enterprise')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await radio(page, 's').focus();
    await page.keyboard.press('ArrowRight');
    await expect(radio(page, 'l')).toHaveAttribute('aria-checked', 'true');
  },
  ArrowUp: async ({ page }) => {
    await focusPro(page);
    await page.keyboard.press('ArrowUp');
    await expect(radio(page, 'Free')).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowUp');
    await expect(radio(page, 'Enterprise')).toBeFocused();
  },
  ArrowLeft: async ({ page }) => {
    await focusPro(page);
    await page.keyboard.press('ArrowLeft');
    await expect(radio(page, 'Free')).toHaveAttribute('aria-checked', 'true');
    await radio(page, 's').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(radio(page, 'm')).toHaveAttribute('aria-checked', 'true');
  },
});

test('clicking a radio checks it and a disabled one is skipped', async ({
  page,
}) => {
  await gotoHydrated(page, '/primitives/radio-group');
  await radio(page, 'Free').click();
  await expect(page.getByText('Plan: free')).toBeVisible();
  await expect(radio(page, 'Team')).toBeDisabled();
});
