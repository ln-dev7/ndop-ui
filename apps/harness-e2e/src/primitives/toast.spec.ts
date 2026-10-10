import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

async function showUndoToast(page: Page) {
  await gotoHydrated(page, '/primitives/toast');
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('File deleted')).toBeVisible();
}

keyboardContract('toast', {
  F8: async ({ page }) => {
    await showUndoToast(page);
    await page.keyboard.press('F8');
    await expect(
      page.getByRole('region', { name: 'Notifications (F8)' }),
    ).toBeFocused();
  },
  Tab: async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari skips buttons on Tab');
    await showUndoToast(page);
    await page.keyboard.press('F8');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Undo' })).toBeFocused();
  },
  Escape: async ({ page }) => {
    await showUndoToast(page);
    await page.getByRole('button', { name: 'Undo' }).focus();
    await page.keyboard.press('Escape');
    await expect(page.getByText('File deleted')).toBeHidden();
    await expect(
      page.getByRole('region', { name: 'Notifications (F8)' }),
    ).toBeFocused();
  },
});

test.describe('Toast', () => {
  test('announces toasts in a polite live region and times them out', async ({
    page,
  }) => {
    await gotoHydrated(page, '/primitives/toast');
    const region = page.getByRole('region', { name: 'Notifications (F8)' });
    await expect(region).toHaveAttribute('aria-live', 'polite');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(region.getByText('Saved')).toBeVisible();
    await expect(region.getByText('Saved')).toBeHidden({ timeout: 6000 });
  });

  test('runs its action', async ({ page }) => {
    await showUndoToast(page);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByText('File deleted')).toBeHidden();
    await expect(page.getByText('Restored')).toBeVisible();
  });

  test('dismisses when swiped toward the end', async ({ page }) => {
    await showUndoToast(page);
    const toast = page
      .getByRole('listitem')
      .filter({ hasText: 'File deleted' });
    const box = await toast.boundingBox();
    if (!box) throw new Error('The toast has no box.');
    await page.mouse.move(box.x + 20, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + 120, box.y + 10, { steps: 10 });
    await page.mouse.up();
    await expect(toast).toBeHidden();
  });
});
