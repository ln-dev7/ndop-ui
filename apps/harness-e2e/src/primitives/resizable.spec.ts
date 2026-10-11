import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

async function focusHandle(page: Page, name = 'Resize sidebar') {
  await gotoHydrated(page, '/primitives/resizable');
  const handle = page.getByRole('separator', { name });
  await handle.focus();
  return handle;
}

keyboardContract('resizable', {
  Tab: async ({ page }) => {
    await gotoHydrated(page, '/primitives/resizable');
    await page.getByRole('heading', { name: 'Resizable' }).click();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('separator', { name: 'Resize sidebar' }),
    ).toBeFocused();
  },
  ArrowRight: async ({ page }) => {
    const handle = await focusHandle(page);
    await page.keyboard.press('ArrowRight');
    await expect(handle).toHaveAttribute('aria-valuenow', '40');
  },
  ArrowLeft: async ({ page }) => {
    const handle = await focusHandle(page);
    await page.keyboard.press('ArrowLeft');
    await expect(handle).toHaveAttribute('aria-valuenow', '20');
    await page.keyboard.press('ArrowLeft');
    await expect(handle).toHaveAttribute('aria-valuenow', '20');
  },
  ArrowDown: async ({ page }) => {
    const handle = await focusHandle(page, 'Resize top');
    await page.keyboard.press('ArrowDown');
    await expect(handle).toHaveAttribute('aria-valuenow', '60');
  },
  ArrowUp: async ({ page }) => {
    const handle = await focusHandle(page, 'Resize top');
    await page.keyboard.press('ArrowUp');
    await expect(handle).toHaveAttribute('aria-valuenow', '40');
  },
  Home: async ({ page }) => {
    const handle = await focusHandle(page);
    await page.keyboard.press('Home');
    await expect(handle).toHaveAttribute('aria-valuenow', '20');
  },
  End: async ({ page }) => {
    const handle = await focusHandle(page);
    await page.keyboard.press('End');
    await expect(handle).toHaveAttribute('aria-valuenow', '100');
  },
});

test.describe('Resizable', () => {
  test('follows a pointer drag', async ({ page }) => {
    const handle = await focusHandle(page);
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 120, box.y + box.height / 2, { steps: 4 });
    await page.mouse.up();
    const now = Number(await handle.getAttribute('aria-valuenow'));
    expect(now).toBeGreaterThan(45);
  });

  test('renders the default layout on the server', async ({ request }) => {
    const html = await (await request.get('/primitives/resizable')).text();
    expect(html).toContain('flex: 30 1 0px');
  });
});
