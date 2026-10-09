import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

async function bold(page: Page) {
  await gotoHydrated(page, '/primitives/toggle');
  const toggle = page.getByRole('button', { name: 'Bold' });
  await toggle.focus();
  return toggle;
}

keyboardContract('toggle', {
  Space: async ({ page }) => {
    const toggle = await bold(page);
    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  },
  Enter: async ({ page }) => {
    const toggle = await bold(page);
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  },
});

test('a disabled toggle keeps its state', async ({ page }) => {
  await gotoHydrated(page, '/primitives/toggle');
  const italic = page.getByRole('button', { name: 'Italic' });
  await expect(italic).toBeDisabled();
  await expect(italic).toHaveAttribute('aria-pressed', 'true');
});
