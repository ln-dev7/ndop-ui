import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });

async function focusCenter(page: Page) {
  await gotoHydrated(page, '/primitives/toggle-group');
  await button(page, 'Center').focus();
}

keyboardContract('toggle-group', {
  Tab: async ({ page }) => {
    await gotoHydrated(page, '/primitives/toggle-group');
    await page.getByRole('heading', { name: 'Toggle Group' }).click();
    await page.keyboard.press('Tab');
    await expect(button(page, 'Center')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(button(page, 'Bold')).toBeFocused();
  },
  Space: async ({ page }) => {
    await focusCenter(page);
    await button(page, 'End').focus();
    await page.keyboard.press('Space');
    await expect(button(page, 'End')).toHaveAttribute('aria-pressed', 'true');
    await expect(button(page, 'Center')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  },
  Enter: async ({ page }) => {
    await focusCenter(page);
    await page.keyboard.press('Enter');
    await expect(button(page, 'Center')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  },
  ArrowRight: async ({ page }) => {
    await focusCenter(page);
    await page.keyboard.press('ArrowRight');
    await expect(button(page, 'End')).toBeFocused();
    await expect(button(page, 'End')).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('ArrowRight');
    await expect(button(page, 'Start')).toBeFocused();
  },
  ArrowLeft: async ({ page }) => {
    await gotoHydrated(page, '/primitives/toggle-group');
    await button(page, 'Underline').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(button(page, 'Bold')).toBeFocused();
  },
  ArrowDown: async ({ page }) => {
    await gotoHydrated(page, '/primitives/toggle-group');
    await button(page, 'List').focus();
    await page.keyboard.press('ArrowDown');
    await expect(button(page, 'Grid')).toBeFocused();
  },
  ArrowUp: async ({ page }) => {
    await gotoHydrated(page, '/primitives/toggle-group');
    await button(page, 'List').focus();
    await page.keyboard.press('ArrowUp');
    await expect(button(page, 'Grid')).toBeFocused();
  },
  Home: async ({ page }) => {
    await focusCenter(page);
    await page.keyboard.press('Home');
    await expect(button(page, 'Start')).toBeFocused();
  },
  End: async ({ page }) => {
    await focusCenter(page);
    await page.keyboard.press('End');
    await expect(button(page, 'End')).toBeFocused();
  },
});
