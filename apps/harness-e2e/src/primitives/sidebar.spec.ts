import { expect, test } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

const MOBILE = { width: 400, height: 700 };

keyboardContract('sidebar', {
  'Ctrl+b': async ({ page }) => {
    await gotoHydrated(page, '/primitives/sidebar');
    const trigger = page.getByRole('button', { name: 'Toggle sidebar' });
    await page.keyboard.press('Control+b');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Meta+b');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  },
  Enter: async ({ page }) => {
    await gotoHydrated(page, '/primitives/sidebar');
    const trigger = page.getByRole('button', { name: 'Toggle sidebar' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    // Collapsed off-canvas, its links leave the tab order.
    await expect(page.getByRole('link', { name: 'Inbox' })).not.toBeFocused();
    await expect(page.locator('[ndSidebarContainer]')).toHaveAttribute(
      'inert',
      '',
    );
  },
  Escape: async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await gotoHydrated(page, '/primitives/sidebar');
    const trigger = page.getByRole('button', { name: 'Toggle sidebar' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Main' });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('link', { name: 'Inbox' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  },
  Tab: async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari skips links on Tab');
    await page.setViewportSize(MOBILE);
    await gotoHydrated(page, '/primitives/sidebar');
    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await expect(page.getByRole('link', { name: 'Inbox' })).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    // The focus trap keeps Tab inside the dialog.
    await expect(page.getByRole('link', { name: 'Inbox' })).toBeFocused();
  },
});

test.describe('Sidebar', () => {
  test('closes the mobile dialog on a backdrop click', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await gotoHydrated(page, '/primitives/sidebar');
    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    // The backdrop is the CDK overlay's, beside the 18rem panel.
    await page
      .locator('.cdk-overlay-backdrop')
      .click({ position: { x: 380, y: 350 } });
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('passes axe with the mobile dialog open', async ({ page }) => {
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    await page.setViewportSize(MOBILE);
    await gotoHydrated(page, '/primitives/sidebar');
    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
