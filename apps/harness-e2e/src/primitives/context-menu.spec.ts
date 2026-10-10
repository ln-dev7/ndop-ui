import { expect, test } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

keyboardContract('context-menu', {
  'Shift + F10': async ({ page }) => {
    await gotoHydrated(page, '/primitives/context-menu');
    const canvas = page
      .getByRole('region', { name: 'Canvas' })
      .or(page.getByTestId('canvas'));
    await canvas.first().focus();
    await page.keyboard.press('Shift+F10');
    await expect(page.getByRole('menuitem', { name: 'Back' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toBeHidden();
    await expect(page.getByTestId('canvas')).toBeFocused();
  },
});

test.describe('Context Menu', () => {
  test('opens at the pointer on right click', async ({ page }) => {
    await gotoHydrated(page, '/primitives/context-menu');
    const canvas = page.getByTestId('canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('The canvas has no box.');
    await page.mouse.click(box.x + 50, box.y + 40, { button: 'right' });
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    const menuBox = await menu.boundingBox();
    expect(Math.abs(menuBox!.x - (box.x + 50))).toBeLessThan(4);
    await page.getByRole('menuitem', { name: 'Reload' }).click();
    await expect(page.getByText('Last: Reload')).toBeVisible();
  });
});
