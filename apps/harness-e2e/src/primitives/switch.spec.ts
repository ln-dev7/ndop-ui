import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

async function airplane(page: Page) {
  await gotoHydrated(page, '/primitives/switch');
  const control = page.getByRole('switch', { name: 'Airplane mode' });
  await control.focus();
  return control;
}

keyboardContract('switch', {
  Space: async ({ page }) => {
    const control = await airplane(page);
    await page.keyboard.press('Space');
    await expect(control).toHaveAttribute('aria-checked', 'true');
    await expect(control).toBeFocused();
  },
  Enter: async ({ page }) => {
    const control = await airplane(page);
    await page.keyboard.press('Enter');
    await expect(control).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Enter');
    await expect(control).toHaveAttribute('aria-checked', 'false');
  },
});

test('a disabled switch can not be turned off', async ({ page }) => {
  await gotoHydrated(page, '/primitives/switch');
  const sync = page.getByRole('switch', { name: 'Sync' });
  await expect(sync).toBeDisabled();
  await expect(sync).toHaveAttribute('aria-checked', 'true');
});
