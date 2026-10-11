import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

const tab = (page: Page, name: string) =>
  page.getByRole('tab', { name, exact: true });

async function focusTab(page: Page, name: string) {
  await gotoHydrated(page, '/primitives/tabs');
  await tab(page, name).focus();
}

keyboardContract('tabs', {
  Tab: async ({ page }) => {
    await gotoHydrated(page, '/primitives/tabs');
    await page.getByRole('heading', { name: 'Tabs' }).click();
    await page.keyboard.press('Tab');
    await expect(tab(page, 'Account')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('tabpanel', { name: 'Account' })).toBeFocused();
  },
  ArrowRight: async ({ page }) => {
    await focusTab(page, 'Account');
    await page.keyboard.press('ArrowRight');
    await expect(tab(page, 'Password')).toBeFocused();
    await expect(tab(page, 'Password')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  },
  ArrowLeft: async ({ page }) => {
    await focusTab(page, 'Account');
    await page.keyboard.press('ArrowLeft');
    await expect(tab(page, 'Team')).toBeFocused();
    await expect(page.getByText('Invite your team.')).toBeVisible();
  },
  ArrowDown: async ({ page }) => {
    await focusTab(page, 'General');
    await page.keyboard.press('ArrowDown');
    await expect(tab(page, 'Privacy')).toBeFocused();
    // Manual activation: focus moves, the selection doesn't.
    await expect(tab(page, 'General')).toHaveAttribute('aria-selected', 'true');
  },
  ArrowUp: async ({ page }) => {
    await focusTab(page, 'General');
    await page.keyboard.press('ArrowUp');
    await expect(tab(page, 'Privacy')).toBeFocused();
  },
  Home: async ({ page }) => {
    await focusTab(page, 'Team');
    await page.keyboard.press('Home');
    await expect(tab(page, 'Account')).toBeFocused();
  },
  End: async ({ page }) => {
    await focusTab(page, 'Account');
    await page.keyboard.press('End');
    await expect(tab(page, 'Team')).toBeFocused();
  },
  Enter: async ({ page }) => {
    await focusTab(page, 'General');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(tab(page, 'Privacy')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Privacy settings.')).toBeVisible();
  },
  Space: async ({ page }) => {
    await focusTab(page, 'General');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    await expect(tab(page, 'Privacy')).toHaveAttribute('aria-selected', 'true');
  },
});

test.describe('Tabs', () => {
  test('renders the default panel on the server', async ({ request }) => {
    const html = await (await request.get('/primitives/tabs')).text();
    expect(html).toMatch(/role="tabpanel"[^>]*>\s*<label/);
  });
});
