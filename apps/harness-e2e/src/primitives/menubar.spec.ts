import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

const item = (page: Page, name: string) =>
  page.getByRole('menuitem', { name, exact: true });

async function focusFile(page: Page) {
  await gotoHydrated(page, '/primitives/menubar');
  await page.getByRole('heading', { name: 'Menubar' }).click();
  await page.keyboard.press('Tab');
  await expect(item(page, 'File')).toBeFocused();
}

keyboardContract('menubar', {
  Tab: async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari moves Tab only between fields');
    await focusFile(page);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Next' })).toBeFocused();
  },
  ArrowRight: async ({ page }) => {
    await focusFile(page);
    await page.keyboard.press('ArrowRight');
    await expect(item(page, 'Edit')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(item(page, 'Undo')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(item(page, 'Undo')).toBeHidden();
    await expect(item(page, 'Zoom in')).toBeVisible();
  },
  ArrowLeft: async ({ page }) => {
    await focusFile(page);
    await page.keyboard.press('ArrowLeft');
    await expect(item(page, 'View')).toBeFocused();
  },
  ArrowDown: async ({ page }) => {
    await focusFile(page);
    await page.keyboard.press('ArrowDown');
    await expect(item(page, 'New tab')).toBeFocused();
  },
  Enter: async ({ page }) => {
    await focusFile(page);
    await page.keyboard.press('Enter');
    await expect(item(page, 'New tab')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('last')).toHaveText('New tab');
  },
  Space: async ({ page }) => {
    await focusFile(page);
    await page.keyboard.press('Space');
    await expect(item(page, 'New tab')).toBeFocused();
  },
  Escape: async ({ page }) => {
    await focusFile(page);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toBeHidden();
    await expect(item(page, 'File')).toBeFocused();
  },
});
