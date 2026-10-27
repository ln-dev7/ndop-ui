import { expect, test, type Page } from '@playwright/test';
import { nativeDialogBoundary } from '../native-dialog';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

async function openAlert(page: Page) {
  await gotoHydrated(page, '/primitives/alert-dialog');
  const trigger = page.getByRole('button', { name: 'Delete project' });
  await trigger.click();
  const dialog = page.getByRole('alertdialog', {
    name: 'Delete this project?',
  });
  await expect(dialog).toBeVisible();
  return { trigger, dialog };
}

keyboardContract('alert-dialog', {
  Tab: async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari skips buttons on Tab');
    const { dialog } = await openAlert(page);
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'Delete', exact: true }),
    ).toBeFocused();
    await nativeDialogBoundary(
      page,
      dialog,
      page.getByRole('button', { name: 'Cancel' }),
    );
  },
  'Shift + Tab': async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari skips buttons on Tab');
    const { dialog } = await openAlert(page);
    await nativeDialogBoundary(
      page,
      dialog,
      page.getByRole('button', { name: 'Delete', exact: true }),
      true,
    );
  },
  Escape: async ({ page }) => {
    const { trigger, dialog } = await openAlert(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page.getByText('Result: none')).toBeVisible();
  },
});

test.describe('Alert Dialog', () => {
  test('starts on Cancel and ignores overlay clicks', async ({ page }) => {
    const { dialog } = await openAlert(page);
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.mouse.click(10, 10);
    await expect(dialog).toBeVisible();
  });

  test('runs the action and closes', async ({ page }) => {
    const { dialog } = await openAlert(page);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Result: deleted')).toBeVisible();
  });
});
