import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

const item = (page: Page, name: string) =>
  page.getByRole('menuitem', { name, exact: true });

async function openMenu(page: Page) {
  await gotoHydrated(page, '/primitives/dropdown-menu');
  const trigger = page.getByRole('button', { name: 'Options' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(item(page, 'Edit')).toBeFocused();
  return trigger;
}

keyboardContract('menu', {
  ArrowDown: async ({ page }) => {
    await openMenu(page);
    await page.keyboard.press('ArrowDown');
    await expect(item(page, 'Duplicate')).toBeFocused();
  },
  ArrowUp: async ({ page }) => {
    await openMenu(page);
    await page.keyboard.press('ArrowUp');
    await expect(item(page, 'More')).toBeFocused();
  },
  Home: async ({ page }) => {
    await openMenu(page);
    await page.keyboard.press('End');
    await page.keyboard.press('Home');
    await expect(item(page, 'Edit')).toBeFocused();
  },
  End: async ({ page }) => {
    await openMenu(page);
    await page.keyboard.press('End');
    await expect(item(page, 'More')).toBeFocused();
  },
  Enter: async ({ page }) => {
    const trigger = await openMenu(page);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Last: Duplicate')).toBeVisible();
    await expect(page.getByRole('menu')).toBeHidden();
    await expect(trigger).toBeFocused();
  },
  Space: async ({ page }) => {
    await openMenu(page);
    const checkbox = page.getByRole('menuitemcheckbox', { name: /Status bar/ });
    await checkbox.focus();
    await page.keyboard.press('Space');
    await expect(checkbox).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(page.getByText('Status bar: on')).toBeVisible();
  },
  ArrowRight: async ({ page }) => {
    await openMenu(page);
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowRight');
    await expect(item(page, 'Archive')).toBeFocused();
  },
  ArrowLeft: async ({ page }) => {
    await openMenu(page);
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowRight');
    await expect(item(page, 'Archive')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(item(page, 'More')).toBeFocused();
    await expect(item(page, 'Archive')).toBeHidden();
  },
  Escape: async ({ page }) => {
    const trigger = await openMenu(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toBeHidden();
    await expect(trigger).toBeFocused();
  },
  Tab: async ({ page }) => {
    await openMenu(page);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('menu')).toBeHidden();
  },
  a: async ({ page }) => {
    await openMenu(page);
    await page.keyboard.press('m');
    await expect(item(page, 'More')).toBeFocused();
  },
});

test.describe('Menu', () => {
  test('radio items check one value', async ({ page }) => {
    await openMenu(page);
    const date = page.getByRole('menuitemradio', { name: /Date/ });
    await date.click();
    await expect(page.getByText('Sort: date')).toBeVisible();
  });

  test('disabled items stay focusable and do nothing', async ({ page }) => {
    await openMenu(page);
    const share = item(page, 'Share');
    await expect(share).toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(share).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Last: none')).toBeVisible();
  });

  test('passes axe while open', async ({ page }) => {
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    await openMenu(page);
    // `region` (best practice, not WCAG): menus sit at the end of <body>.
    const result = await new AxeBuilder({ page })
      .disableRules(['region'])
      .analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
