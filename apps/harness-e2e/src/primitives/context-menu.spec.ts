import AxeBuilder from '@axe-core/playwright';
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
  test('keeps generic context targets accessible before and after opening', async ({
    page,
  }) => {
    await gotoHydrated(page, '/primitives/context-menu');
    const canvas = page.getByTestId('canvas');
    await expect(canvas).not.toHaveAttribute('aria-expanded');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await canvas.click({ button: 'right' });
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(canvas).not.toHaveAttribute('aria-expanded');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

  test('opens after the initiating pointer release and reopens at a new location', async ({
    page,
  }) => {
    await gotoHydrated(page, '/primitives/context-menu');
    const canvas = page.getByTestId('canvas');
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error('The canvas has no bounds.');
    await page.mouse.move(bounds.x + 30, bounds.y + 30);
    await page.mouse.down({ button: 'right' });
    await expect(page.getByRole('menu')).toBeHidden();
    await page.mouse.up({ button: 'right' });
    await expect(page.getByRole('menu')).toBeVisible();
    await expect
      .poll(() =>
        page
          .getByRole('menu')
          .evaluate((element) => element.matches(':popover-open')),
      )
      .toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toBeHidden();
    await page.mouse.click(bounds.x + 100, bounds.y + 60, { button: 'right' });
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect
      .poll(async () =>
        Math.abs((await menu.boundingBox())!.x - (bounds.x + 100)),
      )
      .toBeLessThan(4);
    await page.getByRole('menuitem', { name: 'Reload' }).click();
    await expect(page.getByText('Last: Reload')).toBeVisible();
  });

  test('switches context areas and preserves native outside dismissal', async ({
    page,
  }) => {
    await gotoHydrated(page, '/primitives/context-menu');
    await page
      .getByTestId('canvas')
      .click({ button: 'right', position: { x: 20, y: 20 } });
    await expect(page.getByRole('menu')).toBeVisible();
    await page
      .getByTestId('second-canvas')
      .click({ button: 'right', position: { x: 30, y: 30 } });
    await expect(page.getByTestId('canvas')).toHaveAttribute(
      'data-state',
      'closed',
    );
    await expect(page.getByTestId('second-canvas')).toHaveAttribute(
      'data-state',
      'open',
    );
    await expect(page.getByRole('menu')).toHaveCount(1);
    await page.getByRole('heading', { name: 'Context Menu' }).click();
    await expect(page.getByRole('menu')).toBeHidden();
    await expect(page.getByTestId('second-canvas')).toHaveAttribute(
      'data-state',
      'closed',
    );
  });

  test('opens at the pointer on right click', async ({ page }) => {
    await gotoHydrated(page, '/primitives/context-menu');
    const canvas = page.getByTestId('canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('The canvas has no box.');
    await page.mouse.click(box.x + 50, box.y + 40, { button: 'right' });
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    const menuBox = await menu.boundingBox();
    expect(Math.abs(menuBox!.x - (box.x + 52))).toBeLessThan(1);
    expect(Math.abs(menuBox!.y - (box.y + 42))).toBeLessThan(1);
    await page.getByRole('menuitem', { name: 'Reload' }).click();
    await expect(page.getByText('Last: Reload')).toBeVisible();
  });
});
