import { expect, test, type Page } from '@playwright/test';
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
    await openAlert(page);
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'Delete', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused();
  },
  'Shift + Tab': async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari skips buttons on Tab');
    await openAlert(page);
    await page.keyboard.press('Shift+Tab');
    await expect(
      page.getByRole('button', { name: 'Delete', exact: true }),
    ).toBeFocused();
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
    await page.getByTestId('overlay').click({ position: { x: 10, y: 10 } });
    await expect(dialog).toBeVisible();
  });

  test('runs the action and closes', async ({ page }) => {
    const { dialog } = await openAlert(page);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Result: deleted')).toBeVisible();
  });
});
