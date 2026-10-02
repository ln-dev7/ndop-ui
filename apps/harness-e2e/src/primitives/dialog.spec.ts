import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

async function openDialog(page: Page) {
  await gotoHydrated(page, '/primitives/dialog');
  const trigger = page.getByRole('button', { name: 'Edit profile' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Edit profile' });
  await expect(dialog).toBeVisible();
  return { trigger, dialog };
}

keyboardContract('dialog', {
  Tab: async ({ page }) => {
    await openDialog(page);
    await page.getByRole('button', { name: 'Save' }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
  },
  'Shift + Tab': async ({ page }) => {
    await openDialog(page);
    await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'Save' })).toBeFocused();
  },
  Escape: async ({ page }) => {
    const { trigger, dialog } = await openDialog(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page.getByTestId('state')).toHaveText('closed');
  },
});

test.describe('Dialog', () => {
  test('is never rendered open on the server', async ({ request }) => {
    const html = await (await request.get('/primitives/dialog')).text();
    expect(html).toContain('Edit profile');
    expect(html).not.toContain('role="dialog"');
  });

  test('focuses the first focusable element on open', async ({ page }) => {
    await openDialog(page);
    await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
  });

  test('closes on an overlay click and returns focus', async ({ page }) => {
    const { trigger, dialog } = await openDialog(page);
    await page.getByTestId('overlay').click({ position: { x: 10, y: 10 } });
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('blocks page scroll while open', async ({ page }) => {
    await openDialog(page);
    await page.mouse.wheel(0, 600);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('passes axe while open', async ({ page }) => {
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    await openDialog(page);
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
