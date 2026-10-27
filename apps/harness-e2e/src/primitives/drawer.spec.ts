import { expect, test, type Page } from '@playwright/test';
import { nativeDialogBoundary } from '../native-dialog';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

async function openDrawer(page: Page) {
  await gotoHydrated(page, '/primitives/drawer');
  const trigger = page.getByRole('button', { name: 'Set goal' });
  await trigger.click();
  const drawer = page.getByRole('dialog', { name: 'Move goal' });
  await expect(drawer).toBeVisible();
  return { trigger, drawer };
}

keyboardContract('drawer', {
  Tab: async ({ page }) => {
    await openDrawer(page);
    await expect(page.getByLabel('Calories')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Calories')).toBeFocused();
  },
  'Shift + Tab': async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari skips buttons on Tab');
    const { drawer } = await openDrawer(page);
    await nativeDialogBoundary(
      page,
      drawer,
      page.getByRole('button', { name: 'Done' }),
      true,
    );
  },
  Escape: async ({ page }) => {
    const { trigger, drawer } = await openDrawer(page);
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
  },
});

test.describe('Drawer', () => {
  test('keeps a styled bottom drawer stretched across the viewport', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoHydrated(page, '/examples/drawer-demo');
    await page.getByRole('button', { name: 'Set goal', exact: true }).click();
    const drawer = page.locator('dialog[ndDrawerContent]');
    await expect(drawer).toBeVisible();
    await expect
      .poll(async () => {
        const bounds = await drawer.boundingBox();
        return bounds
          ? Math.abs(bounds.width - (page.viewportSize()?.width ?? 0))
          : Infinity;
      })
      .toBeLessThan(1);
  });

  test('closes when dragged far enough toward its edge', async ({ page }) => {
    const { drawer } = await openDrawer(page);
    const box = await drawer.boundingBox();
    if (!box) throw new Error('The drawer has no box.');
    const x = box.x + box.width / 2;
    await page.mouse.move(x, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(x, box.y + 40, { steps: 4 });
    await expect(drawer).toHaveAttribute('data-dragging', '');
    await page.mouse.move(x, box.y + 20 + box.height * 0.5, { steps: 10 });
    await page.mouse.up();
    await expect(drawer).toBeHidden();
  });

  test('springs back after a short drag, and buttons still click', async ({
    page,
  }) => {
    const { drawer } = await openDrawer(page);
    const box = await drawer.boundingBox();
    if (!box) throw new Error('The drawer has no box.');
    const x = box.x + box.width / 2;
    await page.mouse.move(x, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(x, box.y + 40, { steps: 10 });
    await page.waitForTimeout(300);
    await page.mouse.up();
    await expect(drawer).toBeVisible();
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(drawer).toBeHidden();
  });
});
