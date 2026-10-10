import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

async function focusTrigger(page: Page) {
  await gotoHydrated(page, '/primitives/dropdown-menu');
  const trigger = page.getByRole('button', { name: 'Options' });
  await trigger.focus();
  return trigger;
}

const item = (page: Page, name: string) =>
  page.getByRole('menuitem', { name, exact: true });

keyboardContract('dropdown-menu', {
  Enter: async ({ page }) => {
    const trigger = await focusTrigger(page);
    await page.keyboard.press('Enter');
    await expect(item(page, 'Edit')).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  },
  Space: async ({ page }) => {
    await focusTrigger(page);
    await page.keyboard.press('Space');
    await expect(item(page, 'Edit')).toBeFocused();
  },
  ArrowDown: async ({ page }) => {
    await focusTrigger(page);
    await page.keyboard.press('ArrowDown');
    await expect(item(page, 'Edit')).toBeFocused();
  },
  ArrowUp: async ({ page }) => {
    await focusTrigger(page);
    await page.keyboard.press('ArrowUp');
    await expect(item(page, 'More')).toBeFocused();
  },
});

test.describe('Dropdown Menu', () => {
  test('opens below the trigger on click and closes on an outside click', async ({
    page,
  }) => {
    const trigger = await focusTrigger(page);
    await trigger.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute('data-side', 'bottom');
    const triggerBox = await trigger.boundingBox();
    const menuBox = await menu.boundingBox();
    expect(menuBox!.y).toBeGreaterThanOrEqual(
      triggerBox!.y + triggerBox!.height,
    );
    await page.getByRole('heading', { name: 'Dropdown Menu' }).click();
    await expect(menu).toBeHidden();
  });

  test('is never rendered open on the server', async ({ request }) => {
    const html = await (await request.get('/primitives/dropdown-menu')).text();
    expect(html).not.toContain('role="menu"');
  });
});
